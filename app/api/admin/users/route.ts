import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get all users from Supabase Auth
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error('[v0] Error fetching users:', error);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    // Map users with their profiles
    const usersWithProfiles = users.map(user => ({
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || 'Sin nombre',
      role: user.user_metadata?.role || 'viewer',
      created_at: user.created_at,
      email_confirmed_at: user.email_confirmed_at,
      last_sign_in_at: user.last_sign_in_at,
    }));

    return NextResponse.json({ users: usersWithProfiles }, { status: 200 });
  } catch (err) {
    console.error('[v0] GET /api/admin/users error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, full_name, role } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || email.split('@')[0],
        role: role || 'viewer',
      },
    });

    if (error) {
      console.error('[v0] Error creating user:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          full_name: data.user.user_metadata?.full_name,
          role: data.user.user_metadata?.role,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[v0] POST /api/admin/users error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId, role, full_name } = await request.json();

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'User ID and role are required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Update user metadata with new role
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        role,
        full_name: full_name || undefined,
      },
    });

    if (error) {
      console.error('[v0] Error updating user:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          full_name: data.user.user_metadata?.full_name,
          role: data.user.user_metadata?.role,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('[v0] PATCH /api/admin/users error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Delete user from Supabase Auth
    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) {
      console.error('[v0] Error deleting user:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: true, message: `User ${userId} deleted` },
      { status: 200 }
    );
  } catch (err) {
    console.error('[v0] DELETE /api/admin/users error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
