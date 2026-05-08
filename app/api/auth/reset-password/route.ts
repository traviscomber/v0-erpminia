import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase credentials not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { email, new_password } = await request.json();

    if (!email || !new_password) {
      return NextResponse.json(
        { error: 'Email and new_password are required' },
        { status: 400 }
      );
    }

    // Get user by email
    const { data: users, error: getUserError } = await supabase.auth.admin.listUsers();
    
    if (getUserError) {
      return NextResponse.json(
        { error: getUserError.message },
        { status: 400 }
      );
    }

    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: new_password }
    );

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Contraseña reseteada exitosamente para ${email}`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[v0] Error resetting password:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
