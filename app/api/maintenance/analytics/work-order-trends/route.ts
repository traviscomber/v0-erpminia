export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { getModuleAccessLevel, MODULE_KEYS } from '@/lib/api/module-access';

const CLOSED = new Set(['completed','closed','cancelled','canceled','completada','cerrada','cancelada']);
const norm = (value: unknown) => String(value ?? '').trim().toLocaleLowerCase('es-CL');

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const access = await getModuleAccessLevel(context.userId, context.role, MODULE_KEYS.MANT_GERENCIAL);
  if (access !== 'LEC' && access !== 'ED') return NextResponse.json({ error: 'Acceso gerencial de Mantención no autorizado' }, { status: 403 });

  try {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const { data, error } = await context.supabase
      .from('maintenance_work_orders')
      .select('id,created_at,completion_date,work_type,status')
      .eq('organization_id', context.organizationId)
      .gte('created_at', since.toISOString());
    if (error) throw error;

    const timeline = new Map<string, { date: string; created: number; completed: number }>();
    const byType = new Map<string, { type: string; count: number; completed: number; open: number }>();
    for (const wo of data || []) {
      const createdDate = new Date(wo.created_at).toISOString().slice(0, 10);
      const created = timeline.get(createdDate) || { date: createdDate, created: 0, completed: 0 };
      created.created += 1;
      timeline.set(createdDate, created);

      if (CLOSED.has(norm(wo.status)) && wo.completion_date) {
        const completedDate = new Date(wo.completion_date).toISOString().slice(0, 10);
        const completed = timeline.get(completedDate) || { date: completedDate, created: 0, completed: 0 };
        completed.completed += 1;
        timeline.set(completedDate, completed);
      }

      const type = wo.work_type || 'Sin tipo';
      const bucket = byType.get(type) || { type, count: 0, completed: 0, open: 0 };
      bucket.count += 1;
      if (CLOSED.has(norm(wo.status))) bucket.completed += 1; else bucket.open += 1;
      byType.set(type, bucket);
    }

    return NextResponse.json({ data: {
      timeline: [...timeline.values()].sort((a,b) => a.date.localeCompare(b.date)),
      byType: [...byType.values()].sort((a,b) => b.count - a.count),
    }, generatedAt: new Date().toISOString(), policy: 'Creación y cierre se cuentan por sus fechas reales; no se infiere productividad cuando falta cierre.' });
  } catch (error) {
    console.error('[maintenance/analytics/work-order-trends]', error);
    return NextResponse.json({ error: 'No fue posible calcular tendencias de OT' }, { status: 500 });
  }
}
