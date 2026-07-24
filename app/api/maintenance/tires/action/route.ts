import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type ActionType = 'play' | 'pause' | 'resume' | 'terminate';

export async function POST(request: NextRequest) {
  try {
    const context = await getOrganizationContext(request);
    if (!context.ok) return context.response;

    const body = await request.json();
    const { work_order_id, tire_id, action, notes } = body;

    if (!work_order_id || !tire_id || !action) {
      return NextResponse.json(
        { error: 'work_order_id, tire_id, and action are required' },
        { status: 400 }
      );
    }

    const validActions: ActionType[] = ['play', 'pause', 'resume', 'terminate'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    // Get or create tire action record
    let { data: actionRecord, error: fetchError } = await context.supabase
      .from('tire_work_order_actions')
      .select('*')
      .eq('work_order_id', work_order_id)
      .eq('tire_id', tire_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Handle action
    let eventType = '';
    let statusAfter = '';
    let timeDelta = 0;

    if (action === 'play') {
      eventType = 'in_transport';
      statusAfter = 'awaiting_transport';
      actionRecord = { play_at: new Date(), pauses: [] };
    } else if (action === 'pause' && actionRecord) {
      if (!actionRecord.pauses) actionRecord.pauses = [];
      actionRecord.pauses.push({ pause_at: new Date(), duration_ms: 0 });
    } else if (action === 'resume' && actionRecord) {
      if (actionRecord.pauses?.length > 0) {
        const lastPause = actionRecord.pauses[actionRecord.pauses.length - 1];
        lastPause.duration_ms = new Date().getTime() - lastPause.pause_at.getTime();
      }
    } else if (action === 'terminate') {
      eventType = 'received_workshop';
      statusAfter = 'in_repair';

      // Calculate total time logged
      if (actionRecord?.play_at) {
        const playTime = new Date(actionRecord.play_at).getTime();
        const now = new Date().getTime();
        let totalTime = now - playTime;

        // Subtract pause durations
        if (actionRecord.pauses) {
          totalTime -= actionRecord.pauses.reduce((sum: number, p: any) => sum + (p.duration_ms || 0), 0);
        }

        timeDelta = totalTime / (1000 * 60 * 60); // Convert to hours
      }
    }

    // Record action in tire_work_order_actions
    const { data: newAction, error: actionError } = await context.supabase
      .from('tire_work_order_actions')
      .insert({
        organization_id: context.organizationId,
        work_order_id,
        tire_id,
        action_type: action,
        action_timestamp: new Date().toISOString(),
        total_time_logged: timeDelta,
        notes: notes || `${action} action executed`,
      })
      .select('*')
      .single();

    if (actionError) throw actionError;

    // Create tire event for terminate
    if (action === 'terminate') {
      const { error: eventError } = await context.supabase
        .from('tire_events')
        .insert({
          organization_id: context.organizationId,
          tire_id,
          work_order_id,
          event_type: eventType,
          event_timestamp: new Date().toISOString(),
          created_by: 'mobile_app',
          status_before: 'waiting_repair',
          status_after: statusAfter,
          notes: `Traslado completado. Tiempo total: ${timeDelta.toFixed(2)} horas`,
        });

      if (eventError) throw eventError;

      // Update tire status
      await context.supabase
        .from('tire_master')
        .update({
          current_lifecycle_status: statusAfter,
          current_location: 'taller',
        })
        .eq('id', tire_id);

      // Update WO status
      await context.supabase
        .from('maintenance_work_orders')
        .update({
          status: 'completed',
          completion_date: new Date().toISOString(),
          actual_duration_hours: timeDelta,
        })
        .eq('id', work_order_id);
    }

    return NextResponse.json({
      success: true,
      action: newAction,
      message: `${action.charAt(0).toUpperCase() + action.slice(1)} action completed. Time logged: ${timeDelta.toFixed(2)} hours`,
    });
  } catch (error) {
    console.error('Error executing tire action:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error executing action' },
      { status: 500 }
    );
  }
}
