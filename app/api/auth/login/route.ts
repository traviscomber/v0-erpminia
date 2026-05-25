import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    console.error('[v0] LOGIN DEBUG: Starting login process');
    console.error('[v0] LOGIN DEBUG: Email:', email);
    console.error('[v0] LOGIN DEBUG: NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 20) + '...');
    console.error('[v0] LOGIN DEBUG: SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Create Supabase client with service role (for server-side operations)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[v0] Missing Supabase configuration', { supabaseUrl: !!supabaseUrl, supabaseServiceKey: !!supabaseServiceKey });
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.error('[v0] LOGIN DEBUG: Supabase client created');

    // Check if user exists in profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, organization_id')
      .eq('email', email)
      .single();

    console.error('[v0] LOGIN DEBUG: Query executed');
    console.error('[v0] LOGIN DEBUG: Profile data:', profile);
    console.error('[v0] LOGIN DEBUG: Profile error:', profileError);

    if (profileError) {
      console.error('[v0] Profile query error:', { email, error: profileError.message, code: profileError.code });
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (!profile) {
      console.log('[v0] No profile found for email:', email);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
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
