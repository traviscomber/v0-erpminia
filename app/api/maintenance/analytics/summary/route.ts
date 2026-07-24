import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const orgId = req.headers.get('x-org-id') || '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee';

  try {
    // Get all work orders for last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: workOrders } = await sb
      .from('maintenance_work_orders')
      .select('id, status, priority, created_at, completion_date, scheduled_date, total_timer_minutes')
      .eq('organization_id', orgId)
      .gte('created_at', ninetyDaysAgo.toISOString());

    // Calculate metrics in real-time
    const metrics = {
      total: workOrders?.length || 0,
      completed: workOrders?.filter((wo) => wo.status === 'completed').length || 0,
      pending: workOrders?.filter((wo) => wo.status === 'pending').length || 0,
      in_progress: workOrders?.filter((wo) => wo.status === 'in_progress').length || 0,
      overdue: 0,
      completion_rate: 0,
      avg_time_hours: 0,
      critical_priority: 0,
    };

    // Calculate overdue (scheduled_date < now and status != completed)
    const now = new Date();
    metrics.overdue = workOrders?.filter((wo) => {
      const scheduled = new Date(wo.scheduled_date);
      return scheduled < now && wo.status !== 'completed';
    }).length || 0;

    // Completion rate
    metrics.completion_rate = metrics.total > 0 ? Math.round((metrics.completed / metrics.total) * 100) : 0;

    // Average completion time (from timer data)
    const completedWOs = workOrders?.filter((wo) => wo.status === 'completed' && wo.total_timer_minutes) || [];
    if (completedWOs.length > 0) {
      const totalMinutes = completedWOs.reduce((sum, wo) => sum + (wo.total_timer_minutes || 0), 0);
      metrics.avg_time_hours = Math.round((totalMinutes / completedWOs.length) / 60 * 100) / 100;
    }

    // Critical priority count
    metrics.critical_priority = workOrders?.filter((wo) => wo.priority === 'high').length || 0;

    return NextResponse.json({ data: metrics });
  } catch (error) {
    console.error('[v0] Analytics summary error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
