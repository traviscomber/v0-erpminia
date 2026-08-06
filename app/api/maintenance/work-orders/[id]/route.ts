export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type WorkOrderPatchPayload = {
  status?: string;
  assigned_to_name?: string | null;
  actual_duration_hours?: number | string | null;
  root_cause?: string | null;
  preventive_actions?: string | null;
  meter_reading?: number | string | null;
  meter_unit?: string | null;
};

function progressFromStatus(status: string | null) {
  if (status === 'completed') return 100;
  if (status === 'in_progress') return 50;
  return 0;
}

async function loadCanonicalAsset(context: Awaited<ReturnType<typeof getOrganizationContext>> & { ok: true }, assetId: string | null) {
  if (!assetId) return null;
  const { data, error } = await context.supabase.schema('canonical').from('assets').select('id, asset_code, name, asset_type, category, manufacturer, model, serial_number, license_plate').eq('organization_id', context.organizationId).eq('id', assetId).maybeSingle();
  if (error) throw error;
  return data;
}

function mapWorkOrder(row: Record<string, unknown>, asset: Record<string, unknown> | null) {
  return { ...row, asset_id: row.canonical_asset_id || null, asset_name: asset?.name || null, asset_code: asset?.asset_code || null, asset_type: asset?.asset_type || null, asset_category: asset?.category || null, asset_manufacturer: asset?.manufacturer || null, asset_model: asset?.model || null, asset_serial_number: asset?.serial_number || null, asset_license_plate: asset?.license_plate || null, progress_percentage: progressFromStatus(String(row.status || '')) };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const { id } = await params;
  try {
    const { data, error } = await context.supabase.from('maintenance_work_orders').select('*').eq('id', id).eq('organization_id', context.organizationId).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'No se encontró la orden de trabajo' }, { status: 404 });
    const asset = await loadCanonicalAsset(context, data.canonical_asset_id || null);
    return NextResponse.json({ data: mapWorkOrder(data, asset), canonical: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar la orden de trabajo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

      const closureData: Record<string, unknown> = {
        root_cause: rootCause,
        preventive_actions: preventiveActions,
        actual_duration_hours: actualHours,
        updated_at: new Date().toISOString(),
      };
      if (body.meter_reading !== undefined) closureData.meter_reading = body.meter_reading;
      if (body.meter_unit !== undefined) closureData.meter_unit = body.meter_unit;

      const { error: detailError } = await context.supabase
        .from('maintenance_work_orders')
        .update(closureData)
        .eq('id', id)
        .eq('organization_id', context.organizationId);
      if (detailError) throw detailError;

      const { error: closeError } = await context.supabase.rpc('close_work_order_safely', { p_work_order_id: id });
      if (closeError) throw closeError;
      const { data: closed, error: loadError } = await context.supabase.from('maintenance_work_orders').select('*').eq('id', id).eq('organization_id', context.organizationId).single();
      if (loadError) throw loadError;
      const asset = await loadCanonicalAsset(context, closed.canonical_asset_id || null);
      return NextResponse.json({ data: mapWorkOrder(closed, asset) });
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.status) updateData.status = body.status;
    if (body.assigned_to_name !== undefined) updateData.assigned_to_name = body.assigned_to_name;
    if (body.actual_duration_hours !== undefined) updateData.actual_duration_hours = body.actual_duration_hours;
    if (body.root_cause !== undefined) updateData.root_cause = body.root_cause;
    if (body.preventive_actions !== undefined) updateData.preventive_actions = body.preventive_actions;
    if (body.meter_reading !== undefined) updateData.meter_reading = body.meter_reading;
    if (body.meter_unit !== undefined) updateData.meter_unit = body.meter_unit;

    const { data, error } = await context.supabase.from('maintenance_work_orders').update(updateData).eq('id', id).eq('organization_id', context.organizationId).select('*').single();
    if (error) throw error;
    const asset = await loadCanonicalAsset(context, data.canonical_asset_id || null);
    return NextResponse.json({ data: mapWorkOrder(data, asset) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo actualizar la orden de trabajo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const { id } = await params;
  try {
    const { count, error: countError } = await context.supabase.from('work_order_events').select('*', { head: true, count: 'exact' }).eq('organization_id', context.organizationId).eq('work_order_id', id);
    if (countError) throw countError;
    if ((count || 0) > 1) return NextResponse.json({ error: 'La OT ya tiene trazabilidad y no puede eliminarse. Cancélala en su lugar.' }, { status: 409 });
    const { error } = await context.supabase.from('maintenance_work_orders').delete().eq('id', id).eq('organization_id', context.organizationId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo eliminar la orden de trabajo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
