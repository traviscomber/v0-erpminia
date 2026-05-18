import { getSupabaseServerClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/sostenibilidad/compliance/calculate-score
// Calcula el compliance score actual de sostenibilidad
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const organization_id = searchParams.get('organization_id');
    const period = searchParams.get('period') || getCurrentPeriod();

    // Obtener todas las NCs (abierta y cerrada)
    const { data: allNCs, error: ncError } = await supabase
      .from('sostenibilidad_nonconformances')
      .select('id, status, severity, created_at');

    if (ncError) throw ncError;

    // Contar por estado
    const totalNCs = allNCs.length;
    const closedNCs = allNCs.filter((nc) => nc.status === 'cerrada').length;
    const openNCs = totalNCs - closedNCs;
    const overduNCs = allNCs.filter(
      (nc) => nc.status !== 'cerrada' && isOverdue(nc.created_at)
    ).length;

    // Calcular compliance score (0-100)
    // Fórmula: (NCs cerradas / NCs totales) * 100
    const complianceScore =
      totalNCs > 0 ? Math.round((closedNCs / totalNCs) * 100) : 100;

    // Obtener tendencia
    const { data: previousHistory } = await supabase
      .from('sostenibilidad_compliance_history')
      .select('compliance_score')
      .eq('organization_id', organization_id || 'default')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let trend = 'estable';
    if (previousHistory) {
      if (complianceScore > previousHistory.compliance_score) {
        trend = 'mejorando';
      } else if (complianceScore < previousHistory.compliance_score) {
        trend = 'empeorando';
      }
    }

    // Guardar en histórico
    const { data: savedHistory, error: saveError } = await supabase
      .from('sostenibilidad_compliance_history')
      .insert([
        {
          organization_id: organization_id || 'default',
          report_period: period,
          compliance_score: complianceScore,
          total_ncs: totalNCs,
          open_ncs: openNCs,
          closed_ncs: closedNCs,
          overdue_cas: overduNCs,
          trend,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (saveError) console.error('Error saving compliance history:', saveError);

    // Generar alertas si es necesario
    const alerts = [];
    if (complianceScore < 60) {
      alerts.push({
        severity: 'crítica',
        message: 'Compliance score bajo (< 60%)',
        action_required: true,
      });
    } else if (complianceScore < 80) {
      alerts.push({
        severity: 'alta',
        message: 'Compliance score bajo (< 80%)',
        action_required: false,
      });
    }

    if (overduNCs > 0) {
      alerts.push({
        severity: 'alta',
        message: `${overduNCs} acciones correctivas vencidas`,
        action_required: true,
      });
    }

    return NextResponse.json({
      compliance_score: complianceScore,
      total_ncs: totalNCs,
      open_ncs: openNCs,
      closed_ncs: closedNCs,
      overdue_cas: overduNCs,
      trend,
      period,
      alerts,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error calculating compliance score:', error);
    return NextResponse.json(
      { error: 'Failed to calculate compliance score' },
      { status: 500 }
    );
  }
}

// POST /api/sostenibilidad/compliance/calculate-score
// Recalcular compliance score manualmente
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const { organization_id, period } = await request.json();

    // Llamar a la lógica GET
    const url = new URL('/api/sostenibilidad/compliance/calculate-score', process.env.NEXTAUTH_URL || 'http://localhost:3000');
    if (organization_id) url.searchParams.append('organization_id', organization_id);
    if (period) url.searchParams.append('period', period);

    const response = await fetch(url.toString());
    const data = await response.json();

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error in compliance score calculation:', error);
    return NextResponse.json(
      { error: 'Failed to calculate compliance score' },
      { status: 500 }
    );
  }
}

// Helper functions
function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function isOverdue(createdDate: string): boolean {
  const created = new Date(createdDate);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return created < thirtyDaysAgo;
}
