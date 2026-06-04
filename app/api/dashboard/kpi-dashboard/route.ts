import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { getDashboardSnapshot } from '@/lib/api/dashboard-snapshot';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const snapshot = await getDashboardSnapshot({
      organizationId: context.organizationId,
      supabase: context.supabase,
    });

    return NextResponse.json({
      kpis: {
        operating_equipment: snapshot.operationalEquipment,
        mtbf_hours: snapshot.mtbfHours,
        critical_stock_items: snapshot.summary.lowStockItems,
        valid_documents_pct: snapshot.validDocumentsPct,
        days_no_incidents: snapshot.daysNoIncidents,
        on_time_purchase_orders_pct: snapshot.onTimePurchaseOrdersPct,
        operational_costs_monthly: snapshot.operationalCostsMonthly,
        active_alerts: snapshot.summary.activeAlerts,
      },
      trendData: snapshot.trendData,
      alertsDistribution: snapshot.alertsDistribution,
      recommendations: snapshot.recommendations,
      summary: snapshot.summary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch KPI dashboard data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
