import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { getDashboardSnapshot } from '@/lib/api/dashboard-snapshot';

function averageHours(rows: any[]) {
  const values = rows
    .map((row) => {
      const start = new Date(row.created_at || row.createdAt || row.start_time || row.startDate || 0).getTime();
      const end = new Date(row.completion_date || row.completed_at || row.closed_at || row.end_time || row.endDate || 0).getTime();
      if (!start || !end || Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
      return (end - start) / (1000 * 60 * 60);
    })
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

  if (values.length === 0) return 0;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const [snapshot, incidentsResult] = await Promise.all([
      getDashboardSnapshot({ organizationId: context.organizationId, supabase: context.supabase }),
      context.supabase
        .from('incidents')
        .select('id, date_reported')
        .eq('organization_id', context.organizationId)
        .order('date_reported', { ascending: false })
        .limit(100),
    ]);

    const incidents = incidentsResult.data || [];
    const completedWorkOrders = snapshot.workOrders.filter((item: any) => {
      const status = String(item.status || '').toLowerCase();
      return ['completed', 'closed', 'done', 'finalizado', 'cerrado', 'resuelto'].includes(status);
    });

    const latestIncidentDate = incidents[0]?.date_reported;
    const daysNoIncidents = latestIncidentDate
      ? Math.max(0, Math.floor((Date.now() - new Date(latestIncidentDate).getTime()) / (1000 * 60 * 60 * 24)))
      : snapshot.daysNoIncidents;

    const budgetAnnual = snapshot.costCenters.reduce(
      (sum: number, item: any) => sum + Number(item.budget_annual || 0),
      0
    );
    const budgetUsed = snapshot.costCenters.reduce(
      (sum: number, item: any) => sum + Number(item.budget_used || 0),
      0
    );
    const budgetVariance = budgetAnnual > 0 ? Number((((budgetUsed - budgetAnnual) / budgetAnnual) * 100).toFixed(1)) : 0;

    const mttrHours = averageHours(completedWorkOrders);
    const availabilityPercent = snapshot.assets.length > 0
      ? Number(((snapshot.operationalEquipment / snapshot.assets.length) * 100).toFixed(1))
      : 100;

    return NextResponse.json({
      kpis: {
        operating_equipment: snapshot.operationalEquipment,
        mtbf_hours: snapshot.mtbfHours,
        mttr_hours: mttrHours,
        availability_percent: availabilityPercent,
        incidents_this_month: incidents.filter((item: any) => {
          const reported = new Date(item.date_reported || 0).getTime();
          const monthStart = new Date();
          monthStart.setDate(1);
          monthStart.setHours(0, 0, 0, 0);
          return reported >= monthStart.getTime();
        }).length,
        pending_maintenance: snapshot.summary.overdueWorkOrders + snapshot.summary.preventiveOrders,
        critical_stock_items: snapshot.lowStockItems.length,
        valid_documents_pct: snapshot.validDocumentsPct,
        days_no_incidents: daysNoIncidents,
        on_time_purchase_orders_pct: snapshot.onTimePurchaseOrdersPct,
        operational_costs_monthly: snapshot.operationalCostsMonthly,
        active_alerts: snapshot.summary.activeAlerts,
        budget_variance: budgetVariance,
      },
      trendData: snapshot.trendData,
      alertsDistribution: snapshot.alertsDistribution,
      recommendations: snapshot.recommendations.map((item: any) => item.description),
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[v0] Error in KPI dashboard API:', error);
    return NextResponse.json(
      { error: 'Error al cargar datos KPI' },
      { status: 500 }
    );
  }
}
