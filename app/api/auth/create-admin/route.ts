import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Creates an admin user in Supabase Auth
 * POST /api/auth/create-admin
 * Body: { email, password, name }
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar token de seguridad
    const authHeader = request.headers.get('authorization');
    const securityToken = process.env.ADMIN_CREATION_TOKEN;

    if (!securityToken || authHeader !== `Bearer ${securityToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Crear usuario en Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: name || email.split('@')[0],
        role: 'admin',
      },
    });

    if (authError) {
      throw authError;
    }

    // Crear registro en tabla de usuarios si existe
    const { error: dbError } = await supabase
      .from('users')
      .insert([
        {
          id: authUser.user.id,
          email,
          name: name || email.split('@')[0],
          role: 'admin',
        },
      ])
      .single();

    // No fallar si la tabla no existe
    if (dbError && !dbError.message.includes('relation')) {
      console.warn('[v0] Warning creating user in DB:', dbError);
    }

    return NextResponse.json(
      {
        success: true,
        message: `Admin user ${email} created successfully`,
        user: {
          id: authUser.user.id,
          email: authUser.user.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[v0] Error creating admin user:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
