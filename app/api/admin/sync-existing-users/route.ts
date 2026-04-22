import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get all users from Supabase Auth
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('[v0] Error listing users:', listError);
      return NextResponse.json(
        { error: 'Failed to list users', details: listError },
        { status: 500 }
      );
    }

    let synced = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Sync each user to profiles table
    for (const user of users || []) {
      try {
        const { error: upsertError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || '',
            role: user.user_metadata?.role || 'operador_produccion',
          });

        if (upsertError) {
          console.error(`[v0] Error syncing user ${user.email}:`, upsertError);
          errors.push(`Failed to sync ${user.email}: ${upsertError.message}`);
          skipped++;
        } else {
          synced++;
        }
      } catch (err) {
        console.error(`[v0] Sync error for user ${user.email}:`, err);
        errors.push(`Error syncing ${user.email}`);
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${synced} users`,
      synced,
      skipped,
      total: users?.length || 0,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    console.error('[v0] Sync users error:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
