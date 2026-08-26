export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type WorkOrderRow = {
  id: string;
  work_order_number: string;
  asset_id: string | null;
  canonical_asset_id: string | null;
  assigned_person_id: string | null;
  title: string | null;
  description: string | null;
  work_type: string | null;
  status: string | null;
  priority: string | null;
  assigned_to_name: string | null;
  cost_center_id: string | null;
  planned_duration_hours: number | string | null;
  actual_duration_hours: number | string | null;
  scheduled_date: string | null;
  completion_date: string | null;
  root_cause: string | null;
  preventive_actions: string | null;
  meter_reading: number | string | null;
  meter_unit: string | null;
  created_at: string;
};

type CanonicalAssetRow = { id: string; asset_code: string; name: string; asset_type: string | null; is_active: boolean };

type WorkOrderPayload = {
  canonicalAssetId?: string;
  canonical_asset_id?: string;
  reviewId?: string | null;
  review_id?: string | null;
  assignedPersonId?: string | null;
  assigned_person_id?: string | null;
  title?: string;
  description?: string | null;
  workType?: string;
  work_type?: string;
  priority?: string;
  scheduledDate?: string | null;
  scheduled_date?: string | null;
  plannedDurationHours?: number | string;
  planned_duration_hours?: number | string;
  assignedToName?: string | null;
  assigned_to_name?: string | null;
  meterReading?: number | string | null;
  meter_reading?: number | string | null;
  meterUnit?: string | null;
  meter_unit?: string | null;
  costCenterId?: string | null;
  cost_center_id?: string | null;
};

function mapWorkOrder(row: WorkOrderRow, asset?: CanonicalAssetRow | null) {
  return {
    ...row,
    asset_id: row.canonical_asset_id,
    asset_name: asset?.name || null,
    asset_code: asset?.asset_code || null,
    asset_type: asset?.asset_type || null,
    progress_percentage: row.status === 'completed' ? 100 : row.status === 'in_progress' ? 50 : 0,
  };
}

async function loadAssetMap(context: Awaited<ReturnType<typeof getOrganizationContext>> & { ok: true }, rows: WorkOrderRow[]) {
  const ids = [...new Set(rows.map((row) => row.canonical_asset_id).filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) return new Map<string, CanonicalAssetRow>();
  const { data, error } = await context.supabase
    .from('maintenance_canonical_assets_v1')
    .select('id,asset_code,name,asset_type,is_active')
    .eq('organization_id', context.organizationId)
    .in('id', ids);
  if (error) throw error;
  return new Map(((data || []) as CanonicalAssetRow[]).map((asset) => [asset.id, asset]));
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  try {
    const status = request.nextUrl.searchParams.get('status')?.trim();
    const priority = request.nextUrl.searchParams.get('priority')?.trim();
    const limit = Number(request.nextUrl.searchParams.get('limit') || '0');
    let query = context.supabase.from('maintenance_work_orders').select('*').eq('organization_id', context.organizationId).order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    if (priority) query = query.eq('priority', priority);
    if (Number.isFinite(limit) && limit > 0) query = query.limit(limit);
    const { data, error } = await query;
    if (error) throw error;
    const rows = (data || []) as WorkOrderRow[];
    const assetMap = await loadAssetMap(context, rows);
    return NextResponse.json({ workOrders: rows.map((row) => mapWorkOrder(row, row.canonical_asset_id ? assetMap.get(row.canonical_asset_id) : null)), canonical: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron obtener las órdenes de trabajo';
    console.error('[maintenance/work-orders:get]', error);
    return NextResponse.json({ workOrders: [], error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  try {
    const body = (await request.json()) as WorkOrderPayload;
    const canonicalAssetId = body.canonicalAssetId || body.canonical_asset_id;
    const reviewId = body.reviewId || body.review_id || null;
    const assignedPersonId = body.assignedPersonId || body.assigned_person_id || null;
    if (!canonicalAssetId) return NextResponse.json({ error: 'Selecciona un activo canónico' }, { status: 400 });
    if (!body.title?.trim()) return NextResponse.json({ error: 'Describe brevemente el trabajo a realizar' }, { status: 400 });

    const { data: asset, error: assetError } = await context.supabase
      .from('maintenance_canonical_assets_v1')
      .select('id,asset_code,name,asset_type,is_active')
      .eq('organization_id', context.organizationId)
      .eq('id', canonicalAssetId)
      .eq('is_active', true)
      .maybeSingle();
    if (assetError) throw assetError;
    if (!asset) return NextResponse.json({ error: 'Activo canónico no encontrado o inactivo' }, { status: 404 });

    if (reviewId) {
      const { data: review, error: reviewError } = await context.supabase
        .from('drilling_maintenance_review_queue_v1')
        .select('review_id,canonical_asset_id,review_reason,review_status,linked_work_order_id')
        .eq('organization_id', context.organizationId)
        .eq('review_id', reviewId)
        .maybeSingle();
      if (reviewError) throw reviewError;
      if (!review) return NextResponse.json({ error: 'Revisión operacional no encontrada' }, { status: 404 });
      if (review.canonical_asset_id !== canonicalAssetId) {
        return NextResponse.json({ error: 'La revisión no corresponde al equipo seleccionado' }, { status: 409 });
      }
      if (review.review_reason !== 'out_of_service' && review.review_status === 'pending') {
        return NextResponse.json({ error: 'La revisión debe ser aceptada antes de crear la orden' }, { status: 409 });
      }

      const { data: rpcData, error: rpcError } = await context.supabase.rpc('create_work_order_from_operational_review', {
        p_organization_id: context.organizationId,
        p_review_id: reviewId,
        p_created_by: context.userId,
        p_title: body.title.trim(),
        p_work_type: body.workType || body.work_type || 'corrective',
        p_priority: body.priority || 'critical',
        p_scheduled_date: body.scheduledDate || body.scheduled_date || null,
        p_description: body.description?.trim() || null,
      });
      if (rpcError) throw rpcError;
      const result = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      if (!result?.work_order_id) throw new Error('La revisión no devolvió una orden de trabajo válida');

      const { data: linkedOrder, error: linkedOrderError } = await context.supabase
        .from('maintenance_work_orders')
        .select('*')
        .eq('organization_id', context.organizationId)
        .eq('id', result.work_order_id)
        .single();
      if (linkedOrderError) throw linkedOrderError;

      return NextResponse.json({
        data: mapWorkOrder(linkedOrder as WorkOrderRow, asset as CanonicalAssetRow),
        review: {
          id: reviewId,
          status: result.review_status,
          linkedWorkOrderId: result.work_order_id,
        },
      }, { status: review.linked_work_order_id ? 200 : 201 });
    }

    let assignedPersonName = body.assignedToName || body.assigned_to_name || null;
    if (assignedPersonId) {
      const { data: person, error: personError } = await context.supabase.from('people').select('id,full_name').eq('organization_id', context.organizationId).eq('id', assignedPersonId).eq('employment_status', 'active').maybeSingle();
      if (personError) throw personError;
      if (!person) return NextResponse.json({ error: 'La persona seleccionada no está disponible' }, { status: 400 });
      assignedPersonName = person.full_name;
    }

    const { count } = await context.supabase.from('maintenance_work_orders').select('*', { head: true, count: 'exact' }).eq('organization_id', context.organizationId);
    const workOrderNumber = `WO-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`;
    const plannedHours = Number(body.plannedDurationHours ?? body.planned_duration_hours ?? 0);
    const meterReading = body.meterReading ?? body.meter_reading ?? null;
    const { data, error } = await context.supabase.from('maintenance_work_orders').insert({
      organization_id: context.organizationId,
      work_order_number: workOrderNumber,
      canonical_asset_id: canonicalAssetId,
      asset_id: null,
      assigned_person_id: assignedPersonId,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      work_type: body.workType || body.work_type || 'preventive',
      status: 'open',
      priority: body.priority || 'medium',
      scheduled_date: body.scheduledDate || body.scheduled_date || null,
      planned_duration_hours: Number.isFinite(plannedHours) ? plannedHours : 0,
      assigned_to_name: assignedPersonName,
      meter_reading: meterReading === null || meterReading === '' ? null : Number(meterReading),
      meter_unit: body.meterUnit || body.meter_unit || null,
      cost_center_id: body.costCenterId || body.cost_center_id || null,
      created_by: context.userId,
      updated_at: new Date().toISOString(),
    }).select('*').single();
    if (error) throw error;
    return NextResponse.json({ data: mapWorkOrder(data as WorkOrderRow, asset as CanonicalAssetRow) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo crear la orden de trabajo';
    console.error('[maintenance/work-orders:post]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
