import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[v0] Missing SUPABASE_SERVICE_ROLE_KEY');
      return NextResponse.json(
        { error: 'Missing SUPABASE_SERVICE_ROLE_KEY environment variable' },
        { status: 500 }
      );
    }

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get user by email
    const { data: { users }, error: getUserError } = await supabase.auth.admin.listUsers();

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

    // Mark email as confirmed using the correct parameter
    const { data, error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      email_confirm: true,
    });

    if (updateError) {
      console.error('[v0] Error confirming email:', updateError);
      return NextResponse.json(
        { error: `Failed to confirm email: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: true, 
        message: `Email ${email} marked as confirmed`,
        user_id: user.id
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('[v0] Confirm email error:', err);
    return NextResponse.json(
      { error: `Internal server error: ${err instanceof Error ? err.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
