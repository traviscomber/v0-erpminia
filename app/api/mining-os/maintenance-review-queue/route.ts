export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { getModuleAccessLevel, isAdminRole, MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const maintenanceAccess = await getModuleAccessLevel(context.userId, context.role, MODULE_KEYS.MANT_OPERACIONES);
  const executiveRead = context.role === 'gerente_operaciones' || isAdminRole(context.role);
  if (!executiveRead && maintenanceAccess === 'SR') {
    return NextResponse.json({ error: 'No tienes acceso a esta cola operacional' }, { status: 403 });
  }

  const { data, error } = await context.supabase
    .from('drilling_maintenance_review_queue_v1')
    .select('review_id,source_report_id,canonical_asset_id,asset_code,asset_name,operation_date,review_reason,equipment_status_raw,machine_observations,review_status,linked_work_order_id,has_linked_work_order,policy')
    .eq('organization_id', context.organizationId)
    .order('operation_date', { ascending: false })
    .order('asset_name', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    items: data || [],
    canWrite: maintenanceAccess === 'ED' || isAdminRole(context.role),
    policy: {
      latestReportPerAssetOnly: true,
      noAutomaticWorkOrder: true,
      powerAndWaterAreNotMaintenanceByDefault: true,
      sourceReportRemainsEvidence: true,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_OPERACIONES, true);
  if (!access.authorized) return access.response;
  if (!access.organizationId) return NextResponse.json({ error: 'Organización no disponible' }, { status: 400 });

  const body = await request.json().catch(() => null) as { reviewId?: string; status?: string; decisionNote?: string | null } | null;
  const reviewId = String(body?.reviewId || '').trim();
  const status = String(body?.status || '').trim();
  const decisionNote = body?.decisionNote == null ? null : String(body.decisionNote).trim().slice(0, 1000);

  if (!reviewId || !['accepted', 'dismissed'].includes(status)) {
    return NextResponse.json({ error: 'Revisión o estado inválido' }, { status: 400 });
  }

  const supabase = (await import('@/lib/supabase-server')).getSupabaseServerClient();
  const { data: existing, error: readError } = await supabase
    .from('operational_maintenance_reviews')
    .select('id,status,organization_id,linked_work_order_id')
    .eq('id', reviewId)
    .eq('organization_id', access.organizationId)
    .maybeSingle();

  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: 'Revisión no encontrada' }, { status: 404 });
  if (existing.linked_work_order_id) return NextResponse.json({ error: 'La revisión ya está vinculada a una OT' }, { status: 409 });

  const { data, error } = await supabase
    .from('operational_maintenance_reviews')
    .update({
      status,
      decision_note: decisionNote,
      reviewed_by: access.user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', reviewId)
    .eq('organization_id', access.organizationId)
    .select('id,status,decision_note,reviewed_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ review: data });
}
