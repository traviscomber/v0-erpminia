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
  if (access !== 'LEC' && access !== 'ED') return NextResponse.json({ error: 'Acceso gerencial de Mantención no autorizado' }, { status: 403 });

  try {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const { data, error } = await context.supabase
      .from('maintenance_work_orders')
      .select('id,assigned_person_id,assigned_to_name,status,priority,total_timer_minutes,created_at,scheduled_date,completion_date')
      .eq('organization_id', context.organizationId)
      .gte('created_at', since.toISOString());
    if (error) throw error;

    const groups = new Map<string, any[]>();
    for (const wo of data || []) {
      const key = wo.assigned_person_id || wo.assigned_to_name || 'unassigned';
      const rows = groups.get(key) || [];
      rows.push(wo);
      groups.set(key, rows);
    }

    const technicians = [...groups.entries()].map(([key, rows]) => {
      const completed = rows.filter((wo) => CLOSED.has(norm(wo.status)));
      const open = rows.filter((wo) => !CLOSED.has(norm(wo.status)));
      const timed = completed.filter((wo) => Number(wo.total_timer_minutes || 0) > 0);
      const onTime = completed.filter((wo) => wo.scheduled_date && wo.completion_date && new Date(wo.completion_date).getTime() <= new Date(`${wo.scheduled_date}T23:59:59Z`).getTime());
      return {
        technicianId: key === 'unassigned' ? null : key,
        name: rows.find((wo) => wo.assigned_to_name)?.assigned_to_name || 'Sin asignar',
        totalOrders: rows.length,
        completedOrders: completed.length,
        openOrders: open.length,
        highPriorityOpen: open.filter((wo) => HIGH.has(norm(wo.priority))).length,
        loggedHours: rows.reduce((sum, wo) => sum + Number(wo.total_timer_minutes || 0), 0) / 60,
        avgObservedCompletionHours: timed.length ? timed.reduce((sum, wo) => sum + Number(wo.total_timer_minutes || 0), 0) / timed.length / 60 : null,
        onTimeCompleted: onTime.length,
        onTimeComparable: completed.filter((wo) => wo.scheduled_date && wo.completion_date).length,
      };
    }).sort((a,b) => b.openOrders - a.openOrders || b.highPriorityOpen - a.highPriorityOpen || b.totalOrders - a.totalOrders);

    return NextResponse.json({ data: technicians, policy: 'Se muestran carga, cierre, horas registradas y cumplimiento comparable. No se calcula score de eficiencia ni ranking de desempeño sin contexto de complejidad.', generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('[maintenance/analytics/technician-analytics]', error);
    return NextResponse.json({ error: 'No fue posible calcular carga por técnico' }, { status: 500 });
  }
}
