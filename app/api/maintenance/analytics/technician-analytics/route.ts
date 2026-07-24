import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const orgId = req.headers.get('x-org-id') || '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee';

  try {
    // Get technician data with cargos
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: workOrders } = await sb
      .from('maintenance_work_orders')
      .select('id, assigned_to_name, status, priority, total_timer_minutes, created_at, scheduled_date')
      .eq('organization_id', orgId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    const { data: profiles } = await sb
      .from('profiles')
      .select('full_name, cargo_id, cargos(name)')
      .eq('organization_id', orgId)
      .eq('role', 'tecnico');

    // Group by technician
    const technicianMap = new Map();

    workOrders?.forEach((wo) => {
      const tech = wo.assigned_to_name;
      if (!technicianMap.has(tech)) {
        // Find profile for cargo
        const profile = profiles?.find((p) => p.full_name === tech);
        const cargo = (profile?.cargos as any)?.name || 'Sin cargo';

        technicianMap.set(tech, {
          name: tech,
          cargo: cargo,
          total_orders: 0,
          completed_orders: 0,
          pending_orders: 0,
          critical_orders: 0,
          total_hours_logged: 0,
          avg_completion_time_hours: 0,
          efficiency_score: 0,
          on_time_rate: 0,
        });
      }

      const techData = technicianMap.get(tech);
      techData.total_orders += 1;

      if (wo.status === 'completed') {
        techData.completed_orders += 1;
      } else if (wo.status === 'pending') {
        techData.pending_orders += 1;
      }

      if (wo.priority === 'high' || wo.priority === 'critical') {
        techData.critical_orders += 1;
      }

      if (wo.total_timer_minutes) {
        techData.total_hours_logged += wo.total_timer_minutes / 60;
      }

      // On-time completion check
      if (wo.status === 'completed' && wo.scheduled_date) {
        const scheduled = new Date(wo.scheduled_date);
        const completed = new Date(wo.created_at);
        if (completed <= scheduled) {
          techData.on_time_rate += 1;
        }
      }
    });

    // Calculate derived metrics
    technicianMap.forEach((tech) => {
      if (tech.total_orders > 0) {
        tech.completion_rate = Math.round((tech.completed_orders / tech.total_orders) * 100);
      }
      if (tech.completed_orders > 0) {
        tech.avg_completion_time_hours = Math.round((tech.total_hours_logged / tech.completed_orders) * 100) / 100;
      }
      if (tech.completed_orders > 0) {
        tech.on_time_rate = Math.round((tech.on_time_rate / tech.completed_orders) * 100);
      }

      // Efficiency score: 50% completion_rate + 30% on-time + 20% critical handling
      tech.efficiency_score = Math.round(
        (tech.completion_rate || 0) * 0.5 + (tech.on_time_rate || 0) * 0.3 + (tech.critical_orders > 0 ? 20 : 0)
      );
    });

    const technicians = Array.from(technicianMap.values()).sort((a, b) => b.efficiency_score - a.efficiency_score);

    return NextResponse.json({ data: technicians });
  } catch (error) {
    console.error('[v0] Technician analytics error:', error);
    return NextResponse.json({ error: 'Failed to fetch technician analytics' }, { status: 500 });
  }
}
