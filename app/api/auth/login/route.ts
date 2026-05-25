import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    console.log('[v0] Login attempt:', { email, hasPassword: !!password });

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('[v0] Supabase config:', { hasUrl: !!supabaseUrl, hasKey: !!supabaseKey });

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Create client without auto-fetch settings
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      db: { schema: 'public' },
      realtime: { params: { eventsPerSecond: 10 } },
    });

    console.log('[v0] Querying profiles table...');

    // Query profile
    const { data: profiles, error: err } = await supabase.from('profiles').select('id, email, full_name, organization_id, password_hash').eq('email', email).limit(10);

    console.log('[v0] Query result:', { profileCount: profiles?.length, hasError: !!err, errorMsg: err?.message, allProfiles: profiles?.map((p: any) => p.email) });

    if (err || !profiles || profiles.length === 0) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    const profile = profiles[0];

    // Verify password
    if (!profile.password_hash) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    const passwordMatch = await bcrypt.compare(password, profile.password_hash);
    if (!passwordMatch) {
      console.log('[v0] Password mismatch');
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    // Get user role
    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', profile.id);

    const role = roles?.[0]?.role || 'viewer';

    // Create session
    const sessionData = {
      user: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        organization_id: profile.organization_id,
      },
      role,
      session_token: `${profile.id}-${Date.now()}`,
    };

    const response = NextResponse.json({ success: true, user: sessionData });

    // Set secure cookie
    response.cookies.set('auth_token', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400 * 7,
    });

    response.cookies.set('user_email', email, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400 * 7,
    });

    console.log('[v0] Login successful for:', email);
    return response;
  } catch (error) {
    console.error('[v0] Login error:', error);
    return NextResponse.json({ error: 'Login failed', details: String(error) }, { status: 500 });
  }
}
