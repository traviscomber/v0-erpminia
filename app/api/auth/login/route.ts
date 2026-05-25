import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[v0] Missing Supabase config');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseKey, {
      db: { schema: 'public' },
      auth: { persistSession: false }
    });

    console.log('[v0] Login attempt for:', email);

    // Query profiles with proper error handling
    const { data: profiles, error: queryError } = await supabase
      .from('profiles')
      .select('id, email, full_name, organization_id, password_hash')
      .eq('email', email)
      .limit(1);

    if (queryError) {
      console.error('[v0] Query error:', queryError.message);
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
    }

    if (!profiles || profiles.length === 0) {
      console.log('[v0] User not found:', email);
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    const profile = profiles[0];

    // Verify password
    if (!profile.password_hash) {
      console.log('[v0] No password hash for user');
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    try {
      const passwordMatch = await bcrypt.compare(password, profile.password_hash);
      
      if (!passwordMatch) {
        console.log('[v0] Password mismatch for:', email);
        return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
      }
    } catch (bcryptError) {
      console.error('[v0] Bcrypt error:', bcryptError);
      return NextResponse.json({ error: 'Password verification failed' }, { status: 500 });
    }

    // Get user role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', profile.id)
      .limit(1);

    const role = roleData?.[0]?.role || 'viewer';

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

    response.cookies.set('user_email', profile.email, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400 * 7,
    });

    console.log('[v0] Login successful for:', email);
    return response;
  } catch (error) {
    console.error('[v0] Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
