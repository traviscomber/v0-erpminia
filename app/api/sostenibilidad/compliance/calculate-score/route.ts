export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/guard';
import { getSupabaseServerClient } from '@/lib/supabase-server';

// Helper: Calculate compliance score (read-only)
interface NonConformance {
  id: string;
  status: string;
  severity: string;
  created_at: string;
}

async function calculateComplianceScore(supabase: any, organization_id: string) {
  let query = supabase
    .from('sostenibilidad_nonconformances')
    .select('id, status, severity, created_at');

  if (organization_id) {
    query = query.eq('organization_id', organization_id);
  }

  const { data: allNCs, error: ncError } = await query;

  if (ncError) throw ncError;

  const ncs: NonConformance[] = allNCs || [];
  const totalNCs = ncs.length;
  const closedNCs = ncs.filter((nc: NonConformance) => nc.status === 'cerrada').length;
  const openNCs = totalNCs - closedNCs;
  const overduNCs = ncs.filter(
    (nc: NonConformance) => nc.status !== 'cerrada' && isOverdue(nc.created_at)
  ).length;

  const complianceScore = totalNCs > 0 ? Math.round((closedNCs / totalNCs) * 100) : 100;

  return { totalNCs, closedNCs, openNCs, overduNCs, complianceScore };
}

// GET /api/sostenibilidad/compliance/calculate-score - READ ONLY
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized || !auth.organizationId) {
    return auth.response || NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseServerClient();
    const organization_id = auth.organizationId;

    const { totalNCs, closedNCs, openNCs, overduNCs, complianceScore } = 
      await calculateComplianceScore(supabase, organization_id);

    // Generate alerts
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
      alerts,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error calculating compliance score:', error);
    return NextResponse.json(
      { error: 'No se pudo calcular el puntaje de cumplimiento' },
      { status: 500 }
    );
  }
}

// POST /api/sostenibilidad/compliance/calculate-score - SAVE HISTORY
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized || !auth.organizationId) {
    return auth.response || NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseServerClient();
    const { period } = await request.json();
    const org = auth.organizationId;
    const p = period || getCurrentPeriod();

    const { totalNCs, closedNCs, openNCs, overduNCs, complianceScore } = 
      await calculateComplianceScore(supabase, org);

    // Save to history (POST side effect)
    const { error: saveError } = await supabase
      .from('sostenibilidad_compliance_history')
      .insert([
        {
          organization_id: org,
          report_period: p,
          compliance_score: complianceScore,
          total_ncs: totalNCs,
          open_ncs: openNCs,
          closed_ncs: closedNCs,
          overdue_cas: overduNCs,
          created_at: new Date().toISOString(),
        },
      ]);

    if (saveError) console.error('Error saving compliance history:', saveError);

    return NextResponse.json({
      compliance_score: complianceScore,
      saved: !saveError,
    });
  } catch (error) {
    console.error('Error in compliance score calculation:', error);
    return NextResponse.json(
      { error: 'No se pudo calcular el puntaje de cumplimiento' },
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
