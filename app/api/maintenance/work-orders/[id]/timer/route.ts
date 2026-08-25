import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

const TIMER_ACTIONS = new Set(['play', 'pause', 'resume', 'terminate']);

function timerErrorResponse(error: { code?: string; message?: string } | null | undefined) {
  if (error?.code === 'P0002') {
    return NextResponse.json({ ok: false, error: 'WO not found' }, { status: 404 });
  }
  if (error?.code === '22023') {
    return NextResponse.json({ ok: false, error: error.message || 'Invalid action' }, { status: 400 });
  }
  if (error?.code === '55000') {
    return NextResponse.json({ ok: false, error: error.message || 'Invalid timer transition' }, { status: 409 });
  }
  return NextResponse.json({ ok: false, error: error?.message || 'Internal server error' }, { status: 500 });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const { id: workOrderId } = await params;
  const body = (await request.json().catch(() => null)) as { action?: string; notes?: string | null } | null;
  const action = String(body?.action || '');
  if (!TIMER_ACTIONS.has(action)) {
    return NextResponse.json({ ok: false, error: 'Invalid action' }, { status: 400 });
  }

  const { data, error } = await context.supabase.rpc('update_work_order_timer', {
    p_organization_id: context.organizationId,
    p_work_order_id: workOrderId,
    p_action: action,
    p_actor_id: context.userId,
    p_actor_name: context.userName || context.userEmail || null,
    p_notes: body?.notes?.trim() || null,
  });

  if (error) return timerErrorResponse(error);
  return NextResponse.json(data);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const { id: workOrderId } = await params;
  const { data: workOrder, error } = await context.supabase
    .from('maintenance_work_orders')
    .select('id, timer_status, timer_start_time, total_timer_minutes')
    .eq('id', workOrderId)
    .eq('organization_id', context.organizationId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message || 'No se pudo cargar el temporizador' }, { status: 500 });
  }
  if (!workOrder) {
    return NextResponse.json({ ok: false, error: 'WO not found' }, { status: 404 });
  }

  const { data: timeline, error: timelineError } = await context.supabase
    .from('work_order_events')
    .select('id,event_type,event_at,actor_name,summary,payload')
    .eq('organization_id', context.organizationId)
    .eq('work_order_id', workOrderId)
    .like('event_type', 'timer_%')
    .order('event_at', { ascending: false })
    .limit(10);

  if (timelineError) {
    return NextResponse.json({ ok: false, error: timelineError.message || 'No se pudo cargar el historial del temporizador' }, { status: 500 });
  }

  const totalMinutes = Number(workOrder.total_timer_minutes || 0);
  return NextResponse.json({
    ok: true,
    current: {
      timer_status: workOrder.timer_status || 'idle',
      timer_start_time: workOrder.timer_start_time || null,
      total_minutes: totalMinutes,
      total_hours: Math.round((totalMinutes / 60) * 10) / 10,
    },
    timeline: timeline || [],
  });
}
