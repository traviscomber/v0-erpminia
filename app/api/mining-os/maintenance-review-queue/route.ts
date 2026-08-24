export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { getModuleAccessLevel, isAdminRole, MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';
import { getSupabaseServerClient } from '@/lib/supabase-server';

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

  const supabase = getSupabaseServerClient();
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

export async function POST(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_OPERACIONES, true);
  if (!access.authorized) return access.response;
  if (!access.organizationId) return NextResponse.json({ error: 'Organización no disponible' }, { status: 400 });

  const body = await request.json().catch(() => null) as {
    reviewId?: string;
    title?: string;
    workType?: string | null;
    priority?: string | null;
    scheduledDate?: string | null;
    description?: string | null;
  } | null;

  const reviewId = String(body?.reviewId || '').trim();
  const title = String(body?.title || '').trim().slice(0, 180);
  const workType = body?.workType == null ? null : String(body.workType).trim().slice(0, 80) || null;
  const priority = body?.priority == null ? null : String(body.priority).trim().slice(0, 40) || null;
  const scheduledDate = body?.scheduledDate == null ? null : String(body.scheduledDate).trim() || null;
  const description = body?.description == null ? null : String(body.description).trim().slice(0, 4000) || null;

  if (!reviewId || !title) return NextResponse.json({ error: 'reviewId y title son obligatorios' }, { status: 400 });
  if (scheduledDate && !/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) return NextResponse.json({ error: 'scheduledDate inválida' }, { status: 400 });

  const supabase = getSupabaseServerClient();
  const { data: review, error: reviewError } = await supabase
    .from('operational_maintenance_reviews')
    .select('id,status,organization_id,source_report_id,canonical_asset_id,review_reason,linked_work_order_id')
    .eq('id', reviewId)
    .eq('organization_id', access.organizationId)
    .maybeSingle();

  if (reviewError) return NextResponse.json({ error: reviewError.message }, { status: 500 });
  if (!review) return NextResponse.json({ error: 'Revisión no encontrada' }, { status: 404 });
  if (review.status !== 'accepted') return NextResponse.json({ error: 'La revisión debe estar aceptada antes de crear una OT' }, { status: 409 });
  if (review.linked_work_order_id) return NextResponse.json({ error: 'La revisión ya está vinculada a una OT', workOrderId: review.linked_work_order_id }, { status: 409 });

  const suffix = review.id.replace(/-/g, '').slice(0, 8).toUpperCase();
  const operationDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const workOrderNumber = `WO-DRILL-${operationDate}-${suffix}`;

  const sourceEvidence = `production_drilling_source_reports:${review.source_report_id}`;
  const finalDescription = [description, `Origen: revisión operacional de Sondaje (${review.review_reason}).`, `Evidencia: ${sourceEvidence}.`]
    .filter(Boolean)
    .join('\n');

  const { data: workOrder, error: workOrderError } = await supabase
    .from('maintenance_work_orders')
    .insert({
      organization_id: access.organizationId,
      work_order_number: workOrderNumber,
      canonical_asset_id: review.canonical_asset_id,
      asset_id: review.canonical_asset_id,
      title,
      description: finalDescription,
      work_type: workType,
      status: 'pending',
      priority,
      scheduled_date: scheduledDate,
      created_by: access.user.id,
    })
    .select('id,work_order_number,canonical_asset_id,title,status,priority,work_type,scheduled_date')
    .single();

  if (workOrderError) return NextResponse.json({ error: workOrderError.message }, { status: 500 });

  const { error: linkError } = await supabase
    .from('operational_maintenance_reviews')
    .update({
      status: 'work_order_created',
      linked_work_order_id: workOrder.id,
      reviewed_by: access.user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', review.id)
    .eq('organization_id', access.organizationId)
    .eq('status', 'accepted')
    .is('linked_work_order_id', null);

  if (linkError) {
    return NextResponse.json({ error: 'OT creada pero no fue posible vincular la revisión', workOrder }, { status: 500 });
  }

  return NextResponse.json({ workOrder, reviewId: review.id, sourceEvidence }, { status: 201 });
}
