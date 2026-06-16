export const dynamic = 'force-dynamic';

import { getSupabaseServerClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/sostenibilidad/dashboard/overview
// Retorna un resumen ejecutivo con KPIs principales
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || getCurrentPeriod();

    // 1. Compliance Score
    const { data: complianceData } = await supabase
      .from('sostenibilidad_compliance_history')
      .select('*')
      .eq('report_period', period)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 2. No-Conformidades
    const { data: ncStats } = await supabase.rpc('get_nc_stats', {
      p_period: period,
    });

    // 3. Acciones Correctivas
    const { data: caStats } = await supabase.rpc('get_ca_stats', {
      p_period: period,
    });

    // 4. Tendencias
    const { data: trends } = await supabase
      .from('sostenibilidad_compliance_history')
      .select('compliance_score, report_period')
      .order('report_period', { ascending: false })
      .limit(12);

    // 5. Top Riesgos
    const { data: topRisks } = await supabase
      .from('sostenibilidad_nonconformances')
      .select('id, nc_number, title, severity, status')
      .eq('status', 'abierta')
      .order('discovered_date', { ascending: true })
      .limit(5);

    // 6. Inspecciones completadas
    const { count: inspectionsCompleted = 0 } = await supabase
      .from('inspecciones_internas')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'completada');

    const nc = (ncStats as any)?.[0] ?? {};
    const ca = (caStats as any)?.[0] ?? {};

    return NextResponse.json({
      period,
      overview: {
        compliance_score: complianceData?.compliance_score ?? 0,
        total_ncs: complianceData?.total_ncs ?? nc.total ?? 0,
        open_ncs: complianceData?.open_ncs ?? nc.open ?? 0,
        closed_ncs: complianceData?.closed_ncs ?? nc.closed ?? 0,
        overdue_cas: complianceData?.overdue_cas ?? ca.overdue ?? 0,
        trend: complianceData?.trend ?? 'stable',
      },
      nc_stats: nc,
      ca_stats: ca,
      trends: trends ?? [],
      top_risks: topRisks ?? [],
      inspections_completed: inspectionsCompleted ?? 0,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    return NextResponse.json(
      { error: 'No se pudieron cargar los datos del dashboard' },
      { status: 500 }
    );
  }
}

// Helper function
function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
