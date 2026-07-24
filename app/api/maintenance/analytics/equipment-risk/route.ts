import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const orgId = req.headers.get('x-org-id') || '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee';

  try {
    // Get all work orders by equipment for last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: workOrders } = await sb
      .from('maintenance_work_orders')
      .select('id, equipment_code, equipment_type, status, priority, created_at, scheduled_date, total_timer_minutes')
      .eq('organization_id', orgId)
      .gte('created_at', ninetyDaysAgo.toISOString());

    // Calculate risk by equipment
    const equipmentMap = new Map();

    workOrders?.forEach((wo) => {
      const key = wo.equipment_code || wo.equipment_type;
      if (!equipmentMap.has(key)) {
        equipmentMap.set(key, {
          equipment_code: wo.equipment_code || wo.equipment_type,
          equipment_type: wo.equipment_type,
          total_failures: 0,
          critical_failures: 0,
          total_downtime_hours: 0,
          avg_repair_time_hours: 0,
          risk_score: 0,
          failure_frequency: 0,
        });
      }

      const eq = equipmentMap.get(key);
      eq.total_failures += 1;

      if (wo.priority === 'high' || wo.priority === 'critical') {
        eq.critical_failures += 1;
      }

      if (wo.total_timer_minutes) {
        eq.total_downtime_hours += wo.total_timer_minutes / 60;
      }
    });

    // Calculate risk scores and metrics
    equipmentMap.forEach((eq) => {
      // Average repair time
      if (eq.total_failures > 0) {
        eq.avg_repair_time_hours = Math.round((eq.total_downtime_hours / eq.total_failures) * 100) / 100;
        eq.failure_frequency = Math.round((eq.total_failures / 90) * 100) / 100; // failures per day
      }

      // Risk score: (failures * 30) + (critical failures * 40) + (downtime * 20)
      eq.risk_score = Math.min(100, (eq.total_failures * 2) + (eq.critical_failures * 15) + Math.floor(eq.failure_frequency * 5));
    });

    const equipmentRisk = Array.from(equipmentMap.values())
      .sort((a, b) => b.risk_score - a.risk_score)
      .slice(0, 20); // Top 20 at-risk equipment

    return NextResponse.json({ data: equipmentRisk });
  } catch (error) {
    console.error('[v0] Equipment risk error:', error);
    return NextResponse.json({ error: 'Failed to fetch equipment risk' }, { status: 500 });
  }
}
