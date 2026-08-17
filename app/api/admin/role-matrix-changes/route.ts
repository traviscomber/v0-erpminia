export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/guard';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized || !auth.user || !auth.organizationId) return auth.response;
  const supabase = getSupabaseServerClient();
  const [{ data: profile }, { data: requests, error }] = await Promise.all([
    supabase.from('profiles').select('role,cargo_id,cargos(name)').eq('id', auth.user.id).maybeSingle(),
    supabase.from('role_matrix_change_requests').select('id,cargo_id,module_key,requested_access_level,operation,reason,requested_by,requested_at,area_manager_approved_by,area_manager_approved_at,management_approved_by,management_approved_at,status,rejection_reason,cargos(name)').eq('organization_id', auth.organizationId).order('requested_at', { ascending: false }).limit(200),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const cargoName = (profile as any)?.cargos?.name || '';
  const role = (profile as any)?.role || auth.role || '';
  return NextResponse.json({
    requests: requests || [],
    actor: {
      id: auth.user.id,
      cargoName,
      role,
      canApproveArea: String(cargoName).toUpperCase().startsWith('JEFE ') || ['admin','superadmin'].includes(role),
      canApproveManagement: ['GERENTE','SUBGERENTE OP.'].includes(cargoName) || ['admin','superadmin'].includes(role),
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized || !auth.user || !auth.organizationId) return auth.response;
  const body = await request.json().catch(() => ({}));
  const { cargoId, moduleKey, accessLevel, operation = 'upsert', reason } = body;
  if (!cargoId || !moduleKey || !reason) return NextResponse.json({ error: 'cargoId, moduleKey y motivo son obligatorios' }, { status: 400 });
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.rpc('submit_role_matrix_change_as', {
    p_actor_id: auth.user.id,
    p_organization_id: auth.organizationId,
    p_cargo_id: cargoId,
    p_module_key: moduleKey,
    p_access_level: operation === 'delete' ? null : accessLevel,
    p_operation: operation,
    p_reason: reason,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data, status: 'pending_area_manager' }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized || !auth.user) return auth.response;
  const body = await request.json().catch(() => ({}));
  const { requestId, stage, approve, reason } = body;
  if (!requestId || !stage || typeof approve !== 'boolean') return NextResponse.json({ error: 'requestId, stage y approve son obligatorios' }, { status: 400 });
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.rpc('approve_role_matrix_change_as', {
    p_actor_id: auth.user.id,
    p_request_id: requestId,
    p_stage: stage,
    p_approve: approve,
    p_reason: reason || null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ status: data });
}
