import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { getSupabaseServerClient } from '@/lib/supabase-server';

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'superadmin',
  admin: 'admin',
  manager: 'manager',
  technician: 'technician',
  warehouse_staff: 'warehouse_staff',
  finance_officer: 'finance_officer',
  viewer: 'viewer',
};

function getServiceSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing Supabase service configuration');
  }

  return createClient(supabaseUrl, serviceKey);
}

function normalizeRole(role?: string | null) {
  const value = String(role || 'viewer').trim().toLowerCase();
  return ROLE_LABELS[value] || 'viewer';
}

function buildPermissionCode(module: string, action: string) {
  return `${module}:${action}`;
}

export async function listOrganizationUsers(organizationId: string) {
  const supabase = getSupabaseServerClient();

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, first_name, last_name, role, created_at, updated_at, status')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const userIds = (profiles || []).map((profile) => profile.id);
  const roleMap = new Map<string, string>();

  if (userIds.length > 0) {
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('user_id', userIds)
      .eq('organization_id', organizationId);

    for (const row of userRoles || []) {
      if (!roleMap.has(row.user_id)) {
        roleMap.set(row.user_id, normalizeRole(row.role));
      }
    }
  }

  return (profiles || []).map((profile) => {
    const fullName =
      profile.full_name ||
      [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim() ||
      profile.email ||
      'Sin nombre';

    return {
      id: profile.id,
      email: profile.email,
      full_name: fullName,
      role: roleMap.get(profile.id) || normalizeRole(profile.role),
      created_at: profile.created_at,
      email_confirmed_at: profile.status === 'pending' ? null : profile.created_at,
      last_sign_in_at: null,
      status: profile.status || 'active',
    };
  });
}

export async function createOrganizationUser(input: {
  organizationId: string;
  email: string;
  password: string;
  fullName: string;
  role: string;
  assignedBy: string;
}) {
  const serviceSupabase = getServiceSupabase();
  const dbSupabase = getSupabaseServerClient();

  const email = input.email.trim().toLowerCase();
  const role = normalizeRole(input.role);
  const fullName = input.fullName.trim();
  const [firstName, ...rest] = fullName.split(' ');
  const lastName = rest.join(' ').trim() || null;

  const { data: existingProfile } = await dbSupabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existingProfile) {
    throw new Error('User already exists');
  }

  const { data: createdAuthUser, error: authError } = await serviceSupabase.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
  });

  if (authError || !createdAuthUser.user) {
    throw new Error(authError?.message || 'Failed to create auth user');
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const { error: profileError } = await dbSupabase
    .from('profiles')
    .upsert({
      id: createdAuthUser.user.id,
      email,
      organization_id: input.organizationId,
      full_name: fullName,
      first_name: firstName || fullName,
      last_name: lastName,
      role,
      status: 'active',
      password_hash: passwordHash,
      updated_at: new Date().toISOString(),
    });

  if (profileError) {
    throw new Error(profileError.message);
  }

  const { error: deleteExistingRoleError } = await dbSupabase
    .from('user_roles')
    .delete()
    .eq('user_id', createdAuthUser.user.id)
    .eq('organization_id', input.organizationId);

  if (deleteExistingRoleError) {
    throw new Error(deleteExistingRoleError.message);
  }

  const { error: roleError } = await dbSupabase
    .from('user_roles')
    .insert({
      user_id: createdAuthUser.user.id,
      organization_id: input.organizationId,
      role,
      assigned_by: input.assignedBy,
    });

  if (roleError) {
    throw new Error(roleError.message);
  }

  return {
    id: createdAuthUser.user.id,
    email,
    full_name: fullName,
    role,
    created_at: createdAuthUser.user.created_at,
    email_confirmed_at: createdAuthUser.user.email_confirmed_at,
    last_sign_in_at: createdAuthUser.user.last_sign_in_at,
  };
}

export async function updateOrganizationUserRole(input: {
  organizationId: string;
  userId: string;
  role: string;
  assignedBy: string;
}) {
  const dbSupabase = getSupabaseServerClient();
  const role = normalizeRole(input.role);

  const { error: profileError } = await dbSupabase
    .from('profiles')
    .update({
      role,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.userId)
    .eq('organization_id', input.organizationId);

  if (profileError) throw profileError;

  const { error: deleteError } = await dbSupabase
    .from('user_roles')
    .delete()
    .eq('user_id', input.userId)
    .eq('organization_id', input.organizationId);

  if (deleteError) throw deleteError;

  const { error: insertError } = await dbSupabase
    .from('user_roles')
    .insert({
      user_id: input.userId,
      organization_id: input.organizationId,
      role,
      assigned_by: input.assignedBy,
    });

  if (insertError) throw insertError;

  return { userId: input.userId, role };
}

export async function deleteOrganizationUser(input: {
  organizationId: string;
  userId: string;
}) {
  const serviceSupabase = getServiceSupabase();
  const dbSupabase = getSupabaseServerClient();

  await dbSupabase
    .from('user_permissions')
    .delete()
    .eq('user_id', input.userId)
    .eq('organization_id', input.organizationId);

  await dbSupabase
    .from('user_roles')
    .delete()
    .eq('user_id', input.userId)
    .eq('organization_id', input.organizationId);

  const { error: profileError } = await dbSupabase
    .from('profiles')
    .delete()
    .eq('id', input.userId)
    .eq('organization_id', input.organizationId);

  if (profileError) throw profileError;

  const { error: authError } = await serviceSupabase.auth.admin.deleteUser(input.userId);
  if (authError) throw authError;
}

export async function listUserPermissions(input: {
  organizationId: string;
  userId: string;
}) {
  const dbSupabase = getSupabaseServerClient();

  const { data, error } = await dbSupabase
    .from('user_permissions')
    .select('id, module, action, role, is_active, expires_at, created_at')
    .eq('organization_id', input.organizationId)
    .eq('user_id', input.userId)
    .order('module', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function grantUserPermission(input: {
  organizationId: string;
  userId: string;
  role: string;
  module: string;
  action: string;
  expiresAt?: string | null;
  grantedBy: string;
}) {
  const dbSupabase = getSupabaseServerClient();
  const role = normalizeRole(input.role);
  const permissionCode = buildPermissionCode(input.module, input.action);

  const { data: permissionRecord } = await dbSupabase
    .from('permissions')
    .select('id')
    .eq('resource', input.module)
    .eq('action', input.action)
    .maybeSingle();

  const { data, error } = await dbSupabase
    .from('user_permissions')
    .upsert(
      {
        user_id: input.userId,
        organization_id: input.organizationId,
        role,
        module: input.module,
        action: input.action,
        permission: permissionCode,
        permission_id: permissionRecord?.id || null,
        is_active: true,
        expires_at: input.expiresAt || null,
        granted_by: input.grantedBy,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,organization_id,module,action',
      }
    )
    .select('id, module, action, role, is_active, expires_at')
    .single();

  if (error) throw error;
  return data;
}

export async function revokeUserPermission(input: {
  organizationId: string;
  permissionId: string;
}) {
  const dbSupabase = getSupabaseServerClient();
  const { error } = await dbSupabase
    .from('user_permissions')
    .delete()
    .eq('id', input.permissionId)
    .eq('organization_id', input.organizationId);

  if (error) throw error;
}
