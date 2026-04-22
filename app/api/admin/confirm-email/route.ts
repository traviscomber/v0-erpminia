import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Get user by email
    const { data: users, error: getUserError } = await supabase.auth.admin.listUsers();

    if (getUserError) {
      console.error('[v0] Error listing users:', getUserError);
      return NextResponse.json(
        { error: 'Failed to list users' },
        { status: 500 }
      );
    }

    const user = users?.find((u: any) => u.email === email);

    if (!user) {
      return NextResponse.json(
        { error: `User with email ${email} not found` },
        { status: 404 }
      );
    }

    // Mark email as confirmed
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      email_confirm: true,
      user_metadata: {
        ...user.user_metadata,
        email_confirmed: true,
      },
    });

    if (updateError) {
      console.error('[v0] Error confirming email:', updateError);
      return NextResponse.json(
        { error: 'Failed to confirm email' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: `Email ${email} marked as confirmed` },
      { status: 200 }
    );
  } catch (err) {
    console.error('[v0] Confirm email error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
