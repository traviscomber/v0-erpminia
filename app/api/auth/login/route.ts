import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Use direct REST API call instead of client
    const url = `${supabaseUrl}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=*`;
    
    console.log('[v0] Fetching from:', url);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
      },
    });

    const profiles = await response.json();

    console.log('[v0] Response status:', response.status, 'Profiles count:', Array.isArray(profiles) ? profiles.length : 'not array');

    if (!Array.isArray(profiles) || profiles.length === 0) {
      console.log('[v0] No profiles found');
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    const profile = profiles[0];

    // Verify password
    if (!profile.password_hash) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    const bcrypt = require('bcrypt');
    const passwordMatch = await bcrypt.compare(password, profile.password_hash);
    
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    // Get user role
    const roleUrl = `${supabaseUrl}/rest/v1/user_roles?user_id=eq.${profile.id}&select=role`;
    const roleRes = await fetch(roleUrl, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      },
    });

    const roles = await roleRes.json();
    const role = roles?.[0]?.role || 'viewer';

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

    const resp = NextResponse.json({ success: true, user: sessionData });

    resp.cookies.set('auth_token', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400 * 7,
    });

    resp.cookies.set('user_email', profile.email, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400 * 7,
    });

    return resp;
  } catch (error) {
    console.error('[v0] Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
