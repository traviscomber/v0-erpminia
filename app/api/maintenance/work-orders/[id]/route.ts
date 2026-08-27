export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

type WorkOrderPatchPayload = {
  status?: string;
  assigned_to_name?: string | null;
  actual_duration_hours?: number | string | null;
  root_cause?: string | null;
  preventive_actions?: string | null;
  meter_reading?: number | string | null;
  meter_unit?: string | null;
  cost_center_id?: string | null;
};

function progressFromStatus(status: string | null) {
  if (status === 'completed') return 100;
  if (status === 'in_progress') return 50;
  return 0;
}

async function loadCanonicalAsset(context: Awaited<ReturnType<typeof getOrganizationContext>> & { ok: true }, assetId: string | null) {
  if (!assetId) return null;
  const { data, error } = await context.supabase.from('maintenance_assets').select('id, asset_code, asset_name, asset_type, manufacturer, model, serial_number').eq('organization_id', context.organizationId).eq('id', assetId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { id: data.id, asset_code: data.asset_code, name: data.asset_name, asset_type: data.asset_type, category: null, manufacturer: data.manufacturer, model: data.model, serial_number: data.serial_number, license_plate: null };
}

async function loadCostSummary(context: Awaited<ReturnType<typeof getOrganizationContext>> & { ok: true }, workOrderId: string) {
  const { data, error } = await context.supabase.rpc('get_work_order_cost_summary', { p_organization_id: context.organizationId, p_work_order_id: workOrderId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return { parts: Number(row?.parts_cost || 0), labor: Number(row?.labor_cost || 0), external: Number(row?.external_cost || 0), total: Number(row?.total_cost || 0), pendingParts: Number(row?.pending_parts || 0), openLaborEntries: Number(row?.open_labor_entries || 0) };
}

async function loadCostCenters(context: Awaited<ReturnType<typeof getOrganizationContext>> & { ok: true }) {
  const { data, error } = await context.supabase.from('cost_centers').select('id,code,name,status').eq('organization_id', context.organizationId).or('status.is.null,status.eq.active').order('code');
  if (error) throw error;
  return data || [];
}

async function validateCostCenter(context: Awaited<ReturnType<typeof getOrganizationContext>> & { ok: true }, costCenterId: string) {
  const { data, error } = await context.supabase.from('cost_centers').select('id,code,name,status').eq('organization_id', context.organizationId).eq('id', costCenterId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Centro de costo no válido para esta organización');
  if (data.status && data.status !== 'active') throw new Error('El centro de costo seleccionado no está activo');
  return data;
}

async function hasOpenOperationalOrder(context: Awaited<ReturnType<typeof getOrganizationContext>> & { ok: true }, workOrderId: string) {
  const { count, error } = await context.supabase
    .from('procurement_operational_orders')
    .select('id', { head: true, count: 'exact' })
    .eq('organization_id', context.organizationId)
    .eq('work_order_id', workOrderId)
    .in('status', ['issued', 'partially_received']);
  if (error) throw error;
  return (count || 0) > 0;
}

function mapWorkOrder(row: Record<string, unknown>, asset: Record<string, unknown> | null, costSummary?: Awaited<ReturnType<typeof loadCostSummary>>) {
  return { ...row, asset_id: row.canonical_asset_id || null, asset_name: asset?.name || null, asset_code: asset?.asset_code || null, asset_type: asset?.asset_type || null, asset_category: asset?.category || null, asset_manufacturer: asset?.manufacturer || null, asset_model: asset?.model || null, asset_serial_number: asset?.serial_number || null, asset_license_plate: asset?.license_plate || null, progress_percentage: progressFromStatus(String(row.status || '')), cost_summary: costSummary || null };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_OPERACIONES);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const { id } = await params;
  try {
    const { data, error } = await context.supabase.from('maintenance_work_orders').select('*').eq('id', id).eq('organization_id', context.organizationId).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'No se encontró la orden de trabajo' }, { status: 404 });
    const [asset, costSummary, costCenters] = await Promise.all([loadCanonicalAsset(context, data.canonical_asset_id || null), loadCostSummary(context, id), loadCostCenters(context)]);
    return NextResponse.json({ data: mapWorkOrder(data, asset, costSummary), costCenters, canEdit: access.canWrite, canonical: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar la orden de trabajo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_OPERACIONES, true);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const { id } = await params;
  try {
    const body = (await request.json()) as WorkOrderPatchPayload;

    if (body.status === 'completed') {
      const rootCause = String(body.root_cause || '').trim();
      const preventiveActions = String(body.preventive_actions || '').trim();
      const actualHours = Number(body.actual_duration_hours);
      if (!rootCause) return NextResponse.json({ error: 'Registra la causa principal antes de completar la orden.' }, { status: 400 });
      if (!preventiveActions) return NextResponse.json({ error: 'Registra la acción preventiva antes de completar la orden.' }, { status: 400 });
      if (!Number.isFinite(actualHours) || actualHours <= 0) return NextResponse.json({ error: 'Registra las horas reales utilizadas antes de completar la orden.' }, { status: 400 });
      const costSummary = await loadCostSummary(context, id);
      const blockers: string[] = [];
      if (costSummary.pendingParts > 0) blockers.push(`${costSummary.pendingParts} repuesto${costSummary.pendingParts === 1 ? '' : 's'} pendiente${costSummary.pendingParts === 1 ? '' : 's'} de instalar o devolver`);
      if (costSummary.openLaborEntries > 0) blockers.push(`${costSummary.openLaborEntries} registro${costSummary.openLaborEntries === 1 ? '' : 's'} de trabajo aún abierto${costSummary.openLaborEntries === 1 ? '' : 's'}`);
      if (blockers.length > 0) return NextResponse.json({ error: `No se puede completar la orden: ${blockers.join(' y ')}.`, blockers, costSummary }, { status: 409 });
      const closureData: Record<string, unknown> = { root_cause: rootCause, preventive_actions: preventiveActions, actual_duration_hours: actualHours, updated_at: new Date().toISOString() };
      if (body.meter_reading !== undefined) closureData.meter_reading = body.meter_reading;
      if (body.meter_unit !== undefined) closureData.meter_unit = body.meter_unit;
      const { error: detailError } = await context.supabase.from('maintenance_work_orders').update(closureData).eq('id', id).eq('organization_id', context.organizationId);
      if (detailError) throw detailError;
      const { error: closeError } = await context.supabase.rpc('close_work_order_safely', { p_work_order_id: id });
      if (closeError) throw closeError;
      const { data: closed, error: loadError } = await context.supabase.from('maintenance_work_orders').select('*').eq('id', id).eq('organization_id', context.organizationId).single();
      if (loadError) throw loadError;
      const asset = await loadCanonicalAsset(context, closed.canonical_asset_id || null);
      return NextResponse.json({ data: mapWorkOrder(closed, asset, costSummary) });
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.status) updateData.status = body.status;
    if (body.assigned_to_name !== undefined) updateData.assigned_to_name = body.assigned_to_name;
    if (body.actual_duration_hours !== undefined) updateData.actual_duration_hours = body.actual_duration_hours;
    if (body.root_cause !== undefined) updateData.root_cause = body.root_cause;
    if (body.preventive_actions !== undefined) updateData.preventive_actions = body.preventive_actions;
    if (body.meter_reading !== undefined) updateData.meter_reading = body.meter_reading;
    if (body.meter_unit !== undefined) updateData.meter_unit = body.meter_unit;
    if (body.cost_center_id !== undefined) {
      const { data: currentOrder, error: currentOrderError } = await context.supabase
        .from('maintenance_work_orders')
        .select('cost_center_id')
        .eq('id', id)
        .eq('organization_id', context.organizationId)
        .maybeSingle();
      if (currentOrderError) throw currentOrderError;
      if (!currentOrder) return NextResponse.json({ error: 'No se encontró la orden de trabajo' }, { status: 404 });

      const nextCostCenterId = body.cost_center_id || null;
      if (nextCostCenterId !== (currentOrder.cost_center_id || null) && await hasOpenOperationalOrder(context, id)) {
        return NextResponse.json({ error: 'No se puede cambiar la imputación mientras exista una OC emitida o parcialmente recibida para esta OT.' }, { status: 409 });
      }
      if (nextCostCenterId) await validateCostCenter(context, nextCostCenterId);
      updateData.cost_center_id = nextCostCenterId;
    }

    const { data, error } = await context.supabase.from('maintenance_work_orders').update(updateData).eq('id', id).eq('organization_id', context.organizationId).select('*').single();
    if (error) throw error;
    const [asset, costSummary] = await Promise.all([loadCanonicalAsset(context, data.canonical_asset_id || null), loadCostSummary(context, id)]);
    return NextResponse.json({ data: mapWorkOrder(data, asset, costSummary) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo actualizar la orden de trabajo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_OPERACIONES, true);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const { id } = await params;
  try {
    const { count, error: countError } = await context.supabase.from('work_order_events').select('*', { head: true, count: 'exact' }).eq('organization_id', context.organizationId).eq('work_order_id', id);
    if (countError) throw countError;
    if ((count || 0) > 1) return NextResponse.json({ error: 'La orden ya tiene historial y no puede eliminarse. Cancélala en su lugar.' }, { status: 409 });
    const { error } = await context.supabase.from('maintenance_work_orders').delete().eq('id', id).eq('organization_id', context.organizationId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo eliminar la orden de trabajo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
