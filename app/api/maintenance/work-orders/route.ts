export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

function mapWorkOrder(row: any) {
  return {
    id: row.id,
    work_order_number: row.work_order_number,
    asset_id: row.asset_id || row.asset.id || null,
    asset_name: row.asset.asset_name || null,
    asset_code: row.asset.asset_code || null,
    asset_type: row.asset.asset_type || null,
    title: row.title,
    description: row.description,
    work_type: row.work_type,
    status: row.status,
    priority: row.priority,
    assigned_to_name: row.assigned_to_name,
    cost_center_id: row.cost_center_id || null,
    progress_percentage:
      row.status === 'completed' ? 100 : row.status === 'in_progress' ? 50 : 0,
    planned_duration_hours: row.planned_duration_hours,
    actual_duration_hours: row.actual_duration_hours,
    scheduled_date: row.scheduled_date,
    completion_date: row.completion_date,
    root_cause: row.root_cause,
    preventive_actions: row.preventive_actions,
    created_at: row.created_at,
  };
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { data, error } = await context.supabase
      .from('maintenance_work_orders')
      .select('*, asset:maintenance_assets(id, asset_name, asset_code, asset_type)')
      .eq('organization_id', context.organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ workOrders: (data || []).map(mapWorkOrder) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch work orders';
    return NextResponse.json({ workOrders: [], error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const body = await request.json();
    const { count } = await context.supabase
      .from('maintenance_work_orders')
      .select('*', { head: true, count: 'exact' })
      .eq('organization_id', context.organizationId);

    const workOrderNumber = `WO-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`;

    const { data, error } = await context.supabase
      .from('maintenance_work_orders')
      .insert({
        organization_id: context.organizationId,
        work_order_number: workOrderNumber,
        asset_id: body.assetId || body.asset_id || null,
        title: body.title,
        description: body.description || null,
        work_type: body.workType || body.work_type || 'preventive',
        status: 'open',
        priority: body.priority || 'medium',
        scheduled_date: body.scheduledDate || body.scheduled_date || null,
        planned_duration_hours: Number(body.plannedDurationHours || body.planned_duration_hours || 0),
        assigned_to_name: body.assignedToName || body.assigned_to_name || null,
        cost_center_id: body.costCenterId || body.cost_center_id || null,
        created_by: context.userId,
        updated_at: new Date().toISOString(),
      })
      .select('*, asset:maintenance_assets(id, asset_name, asset_code, asset_type)')
      .single();

    if (error) throw error;

    return NextResponse.json({ data: mapWorkOrder(data) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create work order';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
