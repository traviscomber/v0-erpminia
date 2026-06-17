export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import { buildAuthCookiePayload, createAuthCookieValue } from '@/lib/auth-cookie';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail || !password) {
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

    // Query profiles table directly
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, password_hash, organization_id')
      .eq('email', normalizedEmail);

    if (profileError) {
      console.error('[v0] Database error:', profileError);
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }

    if (!profileData || profileData.length === 0) {
      console.log('[v0] User not found:', normalizedEmail);
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    const profile = profileData[0];

    if (!profile.password_hash) {
      console.error('[v0] No password hash for user:', normalizedEmail);
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    // Verify password with bcrypt
    let passwordMatch = false;
    try {
      passwordMatch = await bcrypt.compare(password, profile.password_hash);
    } catch (err) {
      console.error('[v0] Bcrypt error:', err);
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    if (!passwordMatch) {
      console.log('[v0] Password mismatch for:', normalizedEmail);
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    console.log('[v0] Password matched for:', normalizedEmail);

    // Query user role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', profile.id);

    let role = 'viewer';
    if (roleError) {
      console.log('[v0] Role query error:', roleError, '- using default viewer role');
    } else if (roleData && roleData.length > 0) {
      role = roleData[0].role;
    }

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

    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
    const authCookieValue = await createAuthCookieValue(
      buildAuthCookiePayload({
        user: sessionData.user,
        role,
        sessionToken: sessionData.session_token,
      })
    );

    response.cookies.set('auth_token', authCookieValue, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 86400 * 7,
    });

    // Also set role as a non-HttpOnly cookie so JavaScript can read it
    response.cookies.set('user_role', role, {
      httpOnly: false,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 86400 * 7,
    });

    response.cookies.set('user_email', normalizedEmail, {
      httpOnly: false,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 86400 * 7,
    });

    console.log('[v0] Login successful:', { email: normalizedEmail, role });
    return response;
  } catch (error) {
    console.error('[v0] Login error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
