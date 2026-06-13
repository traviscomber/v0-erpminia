import { NextRequest, NextResponse } from 'next/server';
import {
  getSustainabilityContext,
  isPastDue,
  normalizeCorrectiveActionStatus,
} from '@/lib/api/sostenibilidad-mvp';

export async function GET(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const { data: ncRows, error: ncError } = await context.supabase
      .from('sostenibilidad_nonconformances')
      .select('id')
      .eq('organization_id', context.organizationId);

    if (ncError) throw ncError;

    const ncIds = (ncRows || []).map((row) => row.id);
    if (ncIds.length === 0) {
      return NextResponse.json({
        data: {
          total: 0,
          planned: 0,
          in_progress: 0,
          completed: 0,
          overdue: 0,
          completionRate: 0,
        },
      });
    }

    const { data, error } = await context.supabase
      .from('sostenibilidad_corrective_actions')
      .select('id, status, scheduled_completion_date')
      .in('nc_id', ncIds);

    if (error) throw error;

    const rows = (data || []).map((item) => ({
      ...item,
      status: normalizeCorrectiveActionStatus(item.status),
    }));

    const planned = rows.filter((item) => item.status === 'planned').length;
    const inProgress = rows.filter((item) => item.status === 'in_progress').length;
    const completed = rows.filter((item) =>
      ['completed', 'verified'].includes(item.status)
    ).length;
    const overdue = rows.filter(
      (item) => !['completed', 'verified'].includes(item.status) && isPastDue(item.scheduled_completion_date)
    ).length;

    return NextResponse.json({
      data: {
        total: rows.length,
        planned,
        in_progress: inProgress,
        completed,
        overdue,
        completionRate: rows.length > 0 ? Math.round((completed / rows.length) * 100) : 0,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar las estadsticas de acciones correctivas';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
