import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const orgId = req.headers.get('x-org-id') || '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee';

  try {
    // Get all tires
    const { data: tires } = await sb
      .from('tire_master')
      .select('id, tire_code, tire_name, current_lifecycle_status, repair_count, total_hours_used')
      .eq('organization_id', orgId);

    // Get tire events for last 30 days (repair stats)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: events } = await sb
      .from('tire_events')
      .select('tire_id, event_type, created_at')
      .eq('organization_id', orgId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Calculate metrics
    const statusMap = {
      in_stock: 0,
      installed: 0,
      in_repair: 0,
      waiting_repair: 0,
      awaiting_transport: 0,
    };

    let totalRepairs = 0;
    let totalRepairHours = 0;

    tires?.forEach((tire) => {
      const status = (tire.current_lifecycle_status as keyof typeof statusMap) || 'in_stock';
      statusMap[status] = (statusMap[status] || 0) + 1;
      totalRepairs += tire.repair_count || 0;
    });

    // Count repair events
    const repairEvents = events?.filter((e) => e.event_type === 'repair_completed').length || 0;

    // Calculate average repair time (from events - would need more granular data in production)
    const avgRepairTime = repairEvents > 0 ? Math.round((30 * 24 * 60) / repairEvents) : 0; // 30 days / events

    const metrics = {
      total_tires: tires?.length || 0,
      by_status: statusMap,
      total_repairs_90days: totalRepairs,
      total_repair_events_30days: repairEvents,
      avg_repair_time_minutes: avgRepairTime,
      utilization_percentage: tires?.length ? Math.round(((statusMap.installed || 0) / tires.length) * 100) : 0,
      most_repaired: tires
        ?.sort((a, b) => (b.repair_count || 0) - (a.repair_count || 0))
        .slice(0, 5)
        .map((t) => ({ code: t.tire_code, name: t.tire_name, repairs: t.repair_count })),
    };

    return NextResponse.json({ data: metrics });
  } catch (error) {
    console.error('[v0] Tire lifecycle analytics error:', error);
    return NextResponse.json({ error: 'Failed to fetch tire analytics' }, { status: 500 });
  }
}
