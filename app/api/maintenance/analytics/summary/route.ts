export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { getModuleAccessLevel, MODULE_KEYS } from '@/lib/api/module-access';

const CLOSED = new Set(['completed','closed','cancelled','canceled','completada','cerrada','cancelada']);
const HIGH = new Set(['critical','critica','high','alta']);
const norm = (value: unknown) => String(value ?? '').trim().toLocaleLowerCase('es-CL');

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const access = await getModuleAccessLevel(context.userId, context.role, MODULE_KEYS.MANT_GERENCIAL);
  if (access !== 'LEC' && access !== 'ED') {
    return NextResponse.json({ error: 'Acceso gerencial de Mantención no autorizado' }, { status: 403 });
  }

  try {
    const since = new Date();
    since.setDate(since.getDate() - 90);
    const { data, error } = await context.supabase
      .from('maintenance_work_orders')
      .select('id,status,priority,created_at,completion_date,scheduled_date,total_timer_minutes,asset_id')
      .eq('organization_id', context.organizationId)
      .gte('created_at', since.toISOString());
    if (error) throw error;

    const rows = data || [];
    const now = new Date();
    const completed = rows.filter((wo) => CLOSED.has(norm(wo.status)));
    const open = rows.filter((wo) => !CLOSED.has(norm(wo.status)));
    const timedCompleted = completed.filter((wo) => Number(wo.total_timer_minutes || 0) > 0);
    const avgHours = timedCompleted.length
      ? timedCompleted.reduce((sum, wo) => sum + Number(wo.total_timer_minutes || 0), 0) / timedCompleted.length / 60
      : null;

    return NextResponse.json({ data: {
      total: rows.length,
      completed: completed.length,
      pending: rows.filter((wo) => norm(wo.status) === 'pending').length,
      in_progress: rows.filter((wo) => norm(wo.status) === 'in_progress').length,
      overdue: open.filter((wo) => wo.scheduled_date && new Date(`${wo.scheduled_date}T23:59:59Z`) < now).length,
      older_30d: open.filter((wo) => new Date(wo.created_at).getTime() < now.getTime() - 30 * 86400000).length,
      completion_rate: rows.length ? Math.round((completed.length / rows.length) * 100) : 0,
      avg_time_hours: avgHours == null ? null : Math.round(avgHours * 100) / 100,
      critical_priority: open.filter((wo) => HIGH.has(norm(wo.priority))).length,
      missing_asset: open.filter((wo) => !wo.asset_id).length,
    }, source: 'public.maintenance_work_orders', generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('[maintenance/analytics/summary]', error);
    return NextResponse.json({ error: 'No fue posible calcular analytics de Mantención' }, { status: 500 });
  }
}
