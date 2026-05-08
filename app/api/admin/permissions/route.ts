import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Missing SUPABASE_SERVICE_ROLE_KEY' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const module = searchParams.get('module');
    const role = searchParams.get('role');

    const supabase = await createClient();

    let query = supabase.from('user_permissions').select('*').eq('is_active', true);

    if (userId) query = query.eq('user_id', userId);
    if (module) query = query.eq('module', module);
    if (role) query = query.eq('role', role);

    const { data, error } = await query;

    if (error) {
      console.error('[v0] Error fetching permissions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch permissions' },
        { status: 500 }
      );
    }

    return NextResponse.json({ permissions: data || [] });
  } catch (err) {
    console.error('[v0] GET permissions error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Missing SUPABASE_SERVICE_ROLE_KEY' },
        { status: 500 }
      );
    }

    const { user_id, role, module, action, resource_type, resource_id, expires_at, reason } = await request.json();

    if (!user_id || !role || !module || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, role, module, action' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify admin status of requester
    const { data: adminCheck } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', (await supabase.auth.getUser()).data.user?.id || '')
      .single();

    if (!adminCheck || (adminCheck.role !== 'admin' && adminCheck.role !== 'superadmin')) {
      return NextResponse.json(
        { error: 'Only admins can grant permissions' },
        { status: 403 }
      );
    }

    // Grant permission
    const { data, error } = await supabase
      .from('user_permissions')
      .insert({
        user_id,
        role,
        module,
        action,
        resource_type: resource_type || null,
        resource_id: resource_id || null,
        expires_at: expires_at || null,
        reason: reason || null,
        granted_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select();

    if (error) {
      console.error('[v0] Error granting permission:', error);
      return NextResponse.json(
        { error: 'Failed to grant permission', details: error.message },
        { status: 500 }
      );
    }

    // Log the permission grant
    await supabase.from('permission_audit_log').insert({
      action: 'granted',
      user_id,
      permission_id: data?.[0]?.id,
      module,
      action_type: action,
      new_value: data?.[0],
      performed_by: (await supabase.auth.getUser()).data.user?.id
    });

    return NextResponse.json({
      success: true,
      message: `Permission granted: ${action} on ${module}`,
      permission: data?.[0]
    });
  } catch (err) {
    console.error('[v0] POST permissions error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Missing SUPABASE_SERVICE_ROLE_KEY' },
        { status: 500 }
      );
    }

    const { permission_id, is_active, expires_at } = await request.json();

    if (!permission_id) {
      return NextResponse.json(
        { error: 'Missing permission_id' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Update permission
    const { data, error } = await supabase
      .from('user_permissions')
      .update({
        is_active: is_active !== undefined ? is_active : undefined,
        expires_at: expires_at !== undefined ? expires_at : undefined,
        updated_at: new Date().toISOString()
      })
      .eq('id', permission_id)
      .select();

    if (error) {
      console.error('[v0] Error updating permission:', error);
      return NextResponse.json(
        { error: 'Failed to update permission' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Permission updated',
      permission: data?.[0]
    });
  } catch (err) {
    console.error('[v0] PATCH permissions error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Missing SUPABASE_SERVICE_ROLE_KEY' },
        { status: 500 }
      );
    }

    const { permission_id } = await request.json();

    if (!permission_id) {
      return NextResponse.json(
        { error: 'Missing permission_id' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Soft delete (mark as inactive)
    const { data, error } = await supabase
      .from('user_permissions')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', permission_id)
      .select();

    if (error) {
      console.error('[v0] Error revoking permission:', error);
      return NextResponse.json(
        { error: 'Failed to revoke permission' },
        { status: 500 }
      );
    }

    // Log the revocation
    await supabase.from('permission_audit_log').insert({
      action: 'revoked',
      user_id: data?.[0]?.user_id,
      permission_id,
      module: data?.[0]?.module,
      action_type: data?.[0]?.action,
      old_value: data?.[0],
      performed_by: (await supabase.auth.getUser()).data.user?.id
    });

    return NextResponse.json({
      success: true,
      message: 'Permission revoked'
    });
  } catch (err) {
    console.error('[v0] DELETE permissions error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
