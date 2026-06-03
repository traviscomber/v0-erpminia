import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

function mapWorkOrder(row: any) {
  return {
    id: row.id,
    work_order_number: row.work_order_number,
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
      .select('*')
      .eq('id', id)
      .eq('organization_id', context.organizationId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
    }

    return NextResponse.json({ data: mapWorkOrder(data) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch work order';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
