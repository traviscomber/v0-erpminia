import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function POST(request: NextRequest) {
  try {
    const { email, role } = await request.json();

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      );
    }

    // Get user by email using admin API
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();

    if (userError) {
      throw userError;
    }

    const user = users.users.find((u) => u.email === email);

    if (!user) {
      return NextResponse.json(
        { error: `User with email ${email} not found` },
        { status: 404 }
      );
    }

    // Update user metadata with new role
    const { data, error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        role: role,
      },
    });

    if (updateError) {
      throw updateError;
    }

    console.log(`[v0] Updated user ${email} role to ${role}`);

    return NextResponse.json(
      {
        success: true,
        message: `User role updated to ${role}`,
        user: {
          id: data.user.id,
          email: data.user.email,
          role: data.user.user_metadata?.role,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[v0] Error updating user role:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
