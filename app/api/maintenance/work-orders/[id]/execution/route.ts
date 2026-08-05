export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type ExecutionPayload = {
  action?: 'install_part' | 'return_part' | 'add_labor';
  workOrderPartId?: string;
  quantity?: number;
  technicianId?: string | null;
  technicianName?: string;
  hours?: number;
  hourlyCost?: number;
  notes?: string | null;
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const { id } = await params;

  try {
    const [partsResult, laborResult, eventsResult, costsResult] = await Promise.all([
      context.supabase
        .from('work_order_parts')
        .select('*, stock:warehouse_stock(id, part_code, part_name, unit_cost)')
        .eq('organization_id', context.organizationId)
        .eq('work_order_id', id)
        .order('created_at', { ascending: false }),
      context.supabase
        .from('work_order_labor_entries')
        .select('*')
        .eq('organization_id', context.organizationId)
        .eq('work_order_id', id)
        .order('created_at', { ascending: false }),
      context.supabase
        .from('work_order_events')
        .select('*')
        .eq('organization_id', context.organizationId)
        .eq('work_order_id', id)
        .order('event_at', { ascending: false })
        .limit(100),
      context.supabase
        .from('work_order_cost_summary')
        .select('*')
        .eq('organization_id', context.organizationId)
        .eq('work_order_id', id)
        .maybeSingle(),
    ]);

    const firstError = partsResult.error || laborResult.error || eventsResult.error || costsResult.error;
    if (firstError) throw firstError;

    return NextResponse.json({
      parts: partsResult.data || [],
      labor: laborResult.data || [],
      events: eventsResult.data || [],
      costs: costsResult.data || { parts_cost: 0, labor_cost: 0, external_cost: 0, total_cost: 0 },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar la ejecución de la OT';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const { id } = await params;

  try {
    const body = (await request.json()) as ExecutionPayload;

    if (body.action === 'install_part' || body.action === 'return_part') {
      if (!body.workOrderPartId || !body.quantity || body.quantity <= 0) {
        return NextResponse.json({ error: 'Repuesto y cantidad son obligatorios' }, { status: 400 });
      }
      const functionName = body.action === 'install_part' ? 'install_work_order_part' : 'return_work_order_part';
      const { data, error } = await context.supabase.rpc(functionName, {
        p_organization_id: context.organizationId,
        p_work_order_part_id: body.workOrderPartId,
        p_quantity: body.quantity,
        p_actor_id: context.userId,
        p_actor_name: null,
        p_notes: body.notes || null,
      });
      if (error) throw error;
      return NextResponse.json({ data });
    }

    if (body.action === 'add_labor') {
      if (!body.technicianName?.trim() || !body.hours || body.hours <= 0) {
        return NextResponse.json({ error: 'Técnico y horas son obligatorios' }, { status: 400 });
      }
      const { data, error } = await context.supabase.rpc('add_work_order_labor', {
        p_organization_id: context.organizationId,
        p_work_order_id: id,
        p_technician_id: body.technicianId || null,
        p_technician_name: body.technicianName.trim(),
        p_hours: body.hours,
        p_hourly_cost: Math.max(0, Number(body.hourlyCost || 0)),
        p_notes: body.notes || null,
        p_actor_id: context.userId,
      });
      if (error) throw error;
      return NextResponse.json({ data }, { status: 201 });
    }

    return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo registrar la ejecución de la OT';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
