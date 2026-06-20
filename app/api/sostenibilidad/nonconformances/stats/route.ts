export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSustainabilityContext, isPastDue, normalizeNcStatus } from '@/lib/api/sostenibilidad-mvp';

export async function GET(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const { data, error } = await context.supabase
      .from('sostenibilidad_nonconformances')
      .select('id, status, target_closure_date')
      .eq('organization_id', context.organizationId);

    if (error) throw error;

    const rows = (data || []).map((item) => ({
      ...item,
      status: normalizeNcStatus(item.status),
    }));

    const open = rows.filter((item) => item.status === 'open').length;
    const inProgress = rows.filter((item) => item.status === 'in_progress').length;
    const closed = rows.filter((item) => item.status === 'closed').length;
    const overdue = rows.filter(
      (item) => item.status !== 'closed' && isPastDue(item.target_closure_date)
    ).length;
    const complianceScore = rows.length > 0 ? Math.round((closed / rows.length) * 100) : 100;

    return NextResponse.json({
      data: { open, inProgress, closed, overdue, complianceScore, total: rows.length },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar las estadísticas de no conformidades';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

