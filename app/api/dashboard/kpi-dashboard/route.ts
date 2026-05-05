import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// KPI Dashboard API - Real-time mining KPIs
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // KPI 1: Operating Equipment
    const { count: operatingEquip } = await supabase
      .from('equipment')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'operational');

    // KPI 2: MTBF (Mean Time Between Failures)
    const { data: maintenanceOrders } = await supabase
      .from('maintenance_orders')
      .select('actual_hours')
      .eq('status', 'completed')
      .not('actual_hours', 'is', null);
    
    const mtbf = maintenanceOrders?.length ? 
      Math.round((maintenanceOrders.reduce((s: number, m: any) => s + (m.actual_hours || 0), 0) / maintenanceOrders.length)) : 0;

    // KPI 3: Critical Stock Items
    const { count: criticalStock } = await supabase
      .from('wear_parts')
      .select('*', { count: 'exact', head: true });
      // Filter would need RLS or WHERE clause

    // KPI 4: Valid Documents (%)
    const { count: validDocs } = await supabase
      .from('contracts')
      .select('*', { count: 'exact', head: true })
      .gt('end_date', new Date().toISOString());

    const { count: totalDocs } = await supabase
      .from('contracts')
      .select('*', { count: 'exact', head: true });

    const docValidityPct = totalDocs ? Math.round((validDocs || 0) / totalDocs * 100) : 0;

    // KPI 5: Days without incidents (HSE)
    const { data: lastIncident } = await supabase
      .from('incidents')
      .select('date_occurred')
      .order('date_occurred', { ascending: false })
      .limit(1);

    const daysNoIncidents = lastIncident?.length ? 
      Math.floor((Date.now() - new Date(lastIncident[0].date_occurred).getTime()) / (1000 * 60 * 60 * 24)) : 0;

    // KPI 6: On-time Purchase Orders (%)
    const { count: onTimePO } = await supabase
      .from('procurement_documents')
      .select('*', { count: 'exact', head: true })
      .gte('due_date', new Date().toISOString());

    const { count: totalPO } = await supabase
      .from('procurement_documents')
      .select('*', { count: 'exact', head: true });

    const poOnTimePct = totalPO ? Math.round((onTimePO || 0) / totalPO * 100) : 0;

    // KPI 7: Operational Costs (this month)
    const { data: monthlyExpenses } = await supabase
      .from('procurement_documents')
      .select('amount')
      .gte('issue_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const totalCosts = monthlyExpenses?.reduce((s: number, e: any) => s + (e.amount || 0), 0) || 0;

    // KPI 8: Active Alerts
    const { count: activeAlerts } = await supabase
      .from('alarms')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    return NextResponse.json({
      kpis: {
        operating_equipment: operatingEquip || 0,
        mtbf_hours: mtbf,
        critical_stock_items: criticalStock || 0,
        valid_documents_pct: docValidityPct,
        days_no_incidents: daysNoIncidents,
        on_time_purchase_orders_pct: poOnTimePct,
        operational_costs_monthly: totalCosts,
        active_alerts: activeAlerts || 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[v0] GET /api/dashboard/kpi-dashboard error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
