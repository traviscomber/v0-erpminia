export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type MaintenanceAssetRow = {
  id: string | null;
  asset_name: string | null;
  asset_code: string | null;
  asset_type: string | null;
};

type MaintenanceWorkOrderRow = {
  id: string;
  work_order_number: string;
  asset_id: string | null;
  title: string | null;
  description: string | null;
  work_type: string | null;
  status: string | null;
  priority: string | null;
  assigned_to_name: string | null;
  planned_duration_hours: number | string | null;
  actual_duration_hours: number | string | null;
  scheduled_date: string | null;
  completion_date: string | null;
  root_cause: string | null;
  preventive_actions: string | null;
  created_at: string;
  updated_at: string | null;
  asset?: MaintenanceAssetRow | null;
};

type WorkOrderPatchPayload = {
  status?: string;
  assigned_to_name?: string | null;
  actual_duration_hours?: number | string | null;
  root_cause?: string | null;
  actual_cost?: number | string | null;
};

function mapWorkOrder(row: MaintenanceWorkOrderRow) {
  const asset = row.asset || {};
  return {
    id: row.id,
    work_order_number: row.work_order_number,
    asset_id: row.asset_id || asset.id || null,
    asset_name: asset.asset_name || null,
    asset_code: asset.asset_code || null,
    asset_type: asset.asset_type || null,
    title: row.title,
    description: row.description,
    work_type: row.work_type,
    status: row.status,
    priority: row.priority,
    assigned_to_name: row.assigned_to_name,
    progress_percentage:
      row.status === 'completed' ? 100 : row.status === 'in_progress' ? 50 : 0,
    planned_duration_hours: row.planned_duration_hours,
    actual_duration_hours: row.actual_duration_hours,
    scheduled_date: row.scheduled_date,
    completion_date: row.completion_date,
    root_cause: row.root_cause,
    preventive_actions: row.preventive_actions,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const { id } = await params;

  try {
    const { data, error } = await context.supabase
      .from('maintenance_work_orders')
      .select('*, asset:maintenance_assets(id, asset_name, asset_code, asset_type)')
      .eq('id', id)
      .eq('organization_id', context.organizationId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({ error: 'No se encontró la orden de trabajo' }, { status: 404 });
    }

    return NextResponse.json({ data: mapWorkOrder(data) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar la orden de trabajo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const { id } = await params;

  try {
    const body = (await request.json()) as WorkOrderPatchPayload;
    const { status, assigned_to_name, actual_duration_hours, root_cause, actual_cost } = body;

    const updateData: Partial<{
      status: string;
      assigned_to_name: string | null;
      actual_duration_hours: number | string | null;
      root_cause: string | null;
      actual_cost: number | string | null;
      completion_date: string | null;
      updated_at: string;
    }> = {};
    if (status) updateData.status = status;
    if (assigned_to_name) updateData.assigned_to_name = assigned_to_name;
    if (actual_duration_hours !== undefined) updateData.actual_duration_hours = actual_duration_hours;
    if (root_cause) updateData.root_cause = root_cause;
    if (actual_cost !== undefined) updateData.actual_cost = actual_cost;
    if (status === 'completed') updateData.completion_date = new Date().toISOString();
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await context.supabase
      .from('maintenance_work_orders')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', context.organizationId)
      .select('*, asset:maintenance_assets(id, asset_name, asset_code, asset_type)')
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'No se encontró la orden de trabajo' }, { status: 404 });

    return NextResponse.json({ data: mapWorkOrder(data) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo actualizar la orden de trabajo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const { id } = await params;

  try {
    const { error } = await context.supabase
      .from('maintenance_work_orders')
      .delete()
      .eq('id', id)
      .eq('organization_id', context.organizationId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo eliminar la orden de trabajo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
