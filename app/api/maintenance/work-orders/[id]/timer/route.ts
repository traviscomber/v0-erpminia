import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { action, notes } = await request.json();
  const { id: woId } = await params;

  if (!['play', 'pause', 'resume', 'terminate'].includes(action)) {
    return NextResponse.json({ ok: false, error: 'Invalid action' }, { status: 400 });
  }

  const context = await getOrganizationContext(request);
  if (!context.ok) return NextResponse.json(context.response);

  const supabase = await createClient();
  const now = new Date();

  try {
    // Get current WO state
    const { data: wo, error: woErr } = await supabase
      .from('maintenance_work_orders')
      .select('id, timer_status, timer_start_time, total_timer_minutes, assigned_to_name')
      .eq('id', woId)
      .eq('organization_id', context.organizationId)
      .single();

    if (woErr || !wo) {
      return NextResponse.json({ ok: false, error: 'WO not found' }, { status: 404 });
    }

    let newStatus = wo.timer_status;
    let newStartTime = wo.timer_start_time;
    let newTotalMinutes = wo.total_timer_minutes;
    let durationMinutes = 0;

    // Handle action logic
    if (action === 'play') {
      newStatus = 'running';
      newStartTime = now.toISOString();
    } else if (action === 'pause' && wo.timer_status === 'running') {
      newStatus = 'paused';
      const elapsed = (now.getTime() - new Date(wo.timer_start_time!).getTime()) / (1000 * 60);
      durationMinutes = Math.round(elapsed);
      newTotalMinutes += durationMinutes;
      newStartTime = null;
    } else if (action === 'resume') {
      newStatus = 'running';
      newStartTime = now.toISOString();
    } else if (action === 'terminate') {
      newStatus = 'idle';
      if (wo.timer_status === 'running') {
        const elapsed = (now.getTime() - new Date(wo.timer_start_time!).getTime()) / (1000 * 60);
        durationMinutes = Math.round(elapsed);
        newTotalMinutes += durationMinutes;
      }
      newStartTime = null;
    }

    // Update WO with new timer state
    const { error: updateErr } = await supabase.from('maintenance_work_orders').update({
      timer_status: newStatus,
      timer_start_time: newStartTime,
      total_timer_minutes: newTotalMinutes,
      actual_duration_hours: newTotalMinutes / 60,
    }).eq('id', woId);

    if (updateErr) throw updateErr;

    // Record action in timeline
    await supabase.from('work_order_action_timeline').insert({
      organization_id: context.organizationId,
      work_order_id: woId,
      event_type: action,
      event_timestamp: now.toISOString(),
      event_data: {
        previous_status: wo.timer_status,
        new_status: newStatus,
        duration_minutes: durationMinutes,
        total_accumulated: newTotalMinutes,
      },
      created_by: wo.assigned_to_name,
      notes,
    });

    return NextResponse.json({
      ok: true,
      action,
      timer_status: newStatus,
      total_minutes: newTotalMinutes,
      total_hours: Math.round(newTotalMinutes / 60 * 10) / 10,
    });
  } catch (error) {
    console.error('[v0] Timer action error:', error);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: woId } = await params;
  const context = await getOrganizationContext(request);
  if (!context.ok) return NextResponse.json(context.response);

  const supabase = await createClient();

  const { data: wo, error } = await supabase
    .from('maintenance_work_orders')
    .select('timer_status, timer_start_time, total_timer_minutes')
    .eq('id', woId)
    .eq('organization_id', context.organizationId)
    .single();

  if (error) return NextResponse.json({ ok: false, error: 'WO not found' }, { status: 404 });

  // Get timeline history
  const { data: timeline } = await supabase
    .from('work_order_action_timeline')
    .select('*')
    .eq('work_order_id', woId)
    .order('event_timestamp', { ascending: false })
    .limit(10);

  return NextResponse.json({
    ok: true,
    current: {
      timer_status: wo?.timer_status,
      timer_start_time: wo?.timer_start_time,
      total_minutes: wo?.total_timer_minutes,
      total_hours: Math.round((wo?.total_timer_minutes || 0) / 60 * 10) / 10,
    },
    timeline: timeline || [],
  });
}
