import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    // Get Supabase credentials from environment
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Use RPC function to get user (bypasses schema cache issues)
    const { data: profileData, error: profileError } = await supabase.rpc('get_user_for_login', {
      p_email: email,
    });

    if (profileError || !profileData || profileData.length === 0) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    const profile = profileData[0];

    // Verify password with bcrypt
    const passwordMatch = await bcrypt.compare(password, profile.password_hash);
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    // Get user role using RPC
    const { data: roleData } = await supabase.rpc('get_user_role', {
      p_user_id: profile.id,
    });

    const role = roleData && roleData.length > 0 ? roleData[0].role : 'viewer';

    const sessionData = {
      user: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        organization_id: profile.organization_id,
      },
      role: role,
      session_token: `${profile.id}-${Date.now()}`,
    };

    const response = NextResponse.json({ success: true, user: sessionData });

    response.cookies.set('auth_token', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400 * 7,
    });

    // Also set role as a non-HttpOnly cookie so JavaScript can read it
    response.cookies.set('user_role', role, {
      httpOnly: false,
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

    console.log('[v0] Login successful:', { email, role });
    return response;
  } catch (error) {
    console.error('[v0] Login error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
