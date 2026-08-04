export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import { signCustomSession } from '@/lib/auth/signed-session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');

    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[auth] Missing Supabase server configuration');
      return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, password_hash, organization_id, role')
      .eq('email', email)
      .limit(1);

    if (profileError) {
      console.error('[auth] Profile lookup failed:', profileError.message);
      return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }

    const profile = profileData?.[0];
    if (!profile?.password_hash) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    const passwordMatch = await bcrypt.compare(password, profile.password_hash).catch(() => false);
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    const role = profile.role || 'viewer';
    const authToken = await signCustomSession({
      user: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        organization_id: profile.organization_id,
      },
      role,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        organization_id: profile.organization_id,
        role,
      },
    });

    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
    const cookieOptions = {
      secure: isProduction,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    };

    response.cookies.set('auth_token', authToken, {
      ...cookieOptions,
      httpOnly: true,
    });

    response.cookies.set('user_role', role, {
      ...cookieOptions,
      httpOnly: false,
    });

    response.cookies.set('user_email', profile.email, {
      ...cookieOptions,
      httpOnly: false,
    });

    return response;
  } catch (error) {
    console.error('[auth] Login failed:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  }
}
