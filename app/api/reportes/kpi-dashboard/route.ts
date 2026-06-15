import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Fetch and calculate all operational KPIs
export async function GET(request: NextRequest) {
  try {
    // Production KPIs
    const { data: prodKpi } = await supabase
      .from('produccion_kpi')
      .select('*')
      .order('date', { ascending: false })
      .limit(30);

    // Maintenance KPIs
    const { data: mttrKpi } = await supabase
      .from('mantenimiento_kpi')
      .select('*')
      .order('mes', { ascending: false })
      .limit(12);

    // HSE KPIs
    const { data: hseKpi } = await supabase
      .from('sostenibilidad_kpi_mes')
      .select('*')
      .order('mes', { ascending: false })
      .limit(12);

    // Finance KPIs
    const { data: budgets } = await supabase
      .from('finanzas_presupuestos')
      .select('*');

    const { data: movements } = await supabase
      .from('finanzas_movements')
      .select('*');

    // Calculate aggregates
    const totalBudget = (budgets || []).reduce((sum, b: any) => sum + (b.monto_asignado || 0), 0);
    const totalSpent = (movements || [])
      .filter((m: any) => m.type === 'egreso')
      .reduce((sum, m: any) => sum + (m.amount || 0), 0);

    const avgProduction = prodKpi ? 
      prodKpi.reduce((sum: number, p: any) => sum + p.production_tons, 0) / prodKpi.length : 0;

    const avgUptime = prodKpi ?
      prodKpi.reduce((sum: number, p: any) => sum + p.equipment_uptime, 0) / prodKpi.length : 0;

    const avgMttr = mttrKpi ?
      mttrKpi.reduce((sum: number, m: any) => sum + (m.mttr_promedio || 0), 0) / mttrKpi.length : 0;

    const totalIncidents = hseKpi ?
      hseKpi.reduce((sum: number, h: any) => sum + (h.incidentes_totales || 0), 0) : 0;

    return NextResponse.json({
      kpi_dashboard: {
        production: {
          avg_production_tons: Math.round(avgProduction),
          avg_equipment_uptime: Math.round(avgUptime * 10) / 10,
          last_30_days: prodKpi || [],
        },
        maintenance: {
          avg_mttr_hours: Math.round(avgMttr * 10) / 10,
          last_12_months: mttrKpi || [],
        },
        hse: {
          total_incidents_year: totalIncidents,
          last_12_months: hseKpi || [],
        },
        finance: {
          total_budget: totalBudget,
          total_spent: totalSpent,
          budget_utilization: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[v0] Error fetching KPI dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch KPI dashboard' },
      { status: 500 }
    );
  }
}
