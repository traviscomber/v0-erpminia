export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type WorkOrderRow = {
  id: string;
  work_order_number: string;
  assigned_to_name: string | null;
  status: string | null;
  work_type: string | null;
  priority: string | null;
  planned_duration_hours: number | string | null;
  actual_duration_hours: number | string | null;
  scheduled_date: string | null;
  completion_date: string | null;
};

function safeNum(val: number | string | null | undefined): number {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const url = new URL(request.url);
    const days = Math.min(365, Math.max(7, parseInt(url.searchParams.get('days') ?? '60', 10)));
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data: workOrders, error } = await context.supabase
      .from('maintenance_work_orders')
      .select(
        'id, work_order_number, assigned_to_name, status, work_type, priority, planned_duration_hours, actual_duration_hours, scheduled_date, completion_date'
      )
      .eq('organization_id', context.organizationId)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    const rows = (Array.isArray(workOrders) ? workOrders : []) as WorkOrderRow[];

    // Group by technician name
    const techMap = new Map<
      string,
      {
        name: string;
        total: number;
        completed: number;
        inProgress: number;
        pending: number;
        overdue: number;
        preventive: number;
        corrective: number;
        predictive: number;
        totalPlannedHours: number;
        totalActualHours: number;
        efficiencyScores: number[];
        criticalCompleted: number;
      }
    >();

    const now = Date.now();

    for (const wo of rows) {
      const techName = wo.assigned_to_name?.trim() || 'Sin asignar';
      const existing = techMap.get(techName) ?? {
        name: techName,
        total: 0,
        completed: 0,
        inProgress: 0,
        pending: 0,
        overdue: 0,
        preventive: 0,
        corrective: 0,
        predictive: 0,
        totalPlannedHours: 0,
        totalActualHours: 0,
        efficiencyScores: [],
        criticalCompleted: 0,
      };

      existing.total += 1;

      const status = (wo.status ?? '').toLowerCase();
      if (status === 'completed') existing.completed += 1;
      else if (status === 'in_progress') existing.inProgress += 1;
      else existing.pending += 1;

      // Overdue: past scheduled_date and not completed
      if (wo.scheduled_date && status !== 'completed' && new Date(wo.scheduled_date).getTime() < now) {
        existing.overdue += 1;
      }

      // Work type split
      const wt = (wo.work_type ?? '').toLowerCase();
      if (wt.includes('prevent')) existing.preventive += 1;
      else if (wt.includes('correct')) existing.corrective += 1;
      else if (wt.includes('predict')) existing.predictive += 1;

      // Hours
      const planned = safeNum(wo.planned_duration_hours);
      const actual = safeNum(wo.actual_duration_hours);
      existing.totalPlannedHours += planned;
      existing.totalActualHours += actual;

      // Efficiency: planned / actual (>1 means faster than planned)
      if (status === 'completed' && planned > 0 && actual > 0) {
        existing.efficiencyScores.push(planned / actual);
      }

      // Critical completed
      if (status === 'completed' && ['critical', 'high'].includes((wo.priority ?? '').toLowerCase())) {
        existing.criticalCompleted += 1;
      }

      techMap.set(techName, existing);
    }

    const technicians = Array.from(techMap.values())
      .filter((t) => t.name !== 'Sin asignar')
      .map((t) => {
        const completionRate = t.total > 0 ? Math.round((t.completed / t.total) * 100) : 0;
        const avgEfficiency =
          t.efficiencyScores.length > 0
            ? Math.round((t.efficiencyScores.reduce((s, v) => s + v, 0) / t.efficiencyScores.length) * 100)
            : 0;
        // Score 0-100: 60% completion rate + 20% efficiency + 20% critical tasks
        const score = Math.min(
          100,
          Math.round(completionRate * 0.6 + Math.min(100, avgEfficiency) * 0.2 + Math.min(20, t.criticalCompleted * 4))
        );
        return {
          name: t.name,
          total: t.total,
          completed: t.completed,
          inProgress: t.inProgress,
          pending: t.pending,
          overdue: t.overdue,
          preventive: t.preventive,
          corrective: t.corrective,
          predictive: t.predictive,
          totalPlannedHours: Math.round(t.totalPlannedHours * 10) / 10,
          totalActualHours: Math.round(t.totalActualHours * 10) / 10,
          completionRate,
          avgEfficiency,
          criticalCompleted: t.criticalCompleted,
          performanceScore: score,
        };
      })
      .sort((a, b) => b.performanceScore - a.performanceScore);

    // Fleet summary
    const totalWOs = rows.length;
    const completedWOs = rows.filter((w) => (w.status ?? '').toLowerCase() === 'completed').length;
    const avgMTTR =
      rows
        .filter((w) => (w.status ?? '').toLowerCase() === 'completed' && safeNum(w.actual_duration_hours) > 0)
        .reduce((sum, w) => sum + safeNum(w.actual_duration_hours), 0) /
      Math.max(1, rows.filter((w) => (w.status ?? '').toLowerCase() === 'completed' && safeNum(w.actual_duration_hours) > 0).length);

    return NextResponse.json({
      technicians,
      summary: {
        totalWorkOrders: totalWOs,
        completedWorkOrders: completedWOs,
        completionRate: totalWOs > 0 ? Math.round((completedWOs / totalWOs) * 100) : 0,
        avgMTTR: Math.round(avgMTTR * 10) / 10,
        activeTechnicians: technicians.length,
        periodDays: days,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al cargar desempeno de tecnicos';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
