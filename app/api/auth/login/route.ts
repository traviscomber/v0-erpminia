import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    // Create Supabase client with service role (for server-side operations)
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[v0] Missing Supabase configuration');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user exists in profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, organization_id, password_hash')
      .eq('email', email)
      .single();

    if (profileError || !profile) {
      console.log('[v0] User not found:', email);
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    // Verify password
    if (!profile.password_hash) {
      console.log('[v0] No password set for user:', email);
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    try {
      const passwordMatch = await bcrypt.compare(password, profile.password_hash);
      
      if (!passwordMatch) {
        console.log('[v0] Password mismatch for user:', email);
        return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
      }
    } catch (bcryptError) {
      console.error('[v0] Bcrypt error:', bcryptError);
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    // Get user role
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', profile.id)
      .single();

    // Create session
    const sessionData = {
      user: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        organization_id: profile.organization_id,
      },
      role: userRole?.role || 'viewer',
      session_token: `${profile.id}-${Date.now()}`,
    };

    // Store session in response
    const response = NextResponse.json({ success: true, user: sessionData });
    
    // Set secure cookie
    response.cookies.set('auth_token', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400 * 7, // 7 days
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
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
