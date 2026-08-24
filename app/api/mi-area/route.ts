export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { getExecutivePortalForRole } from '@/lib/executive-portal-config';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const portal = getExecutivePortalForRole(context.role);
  if (!portal || portal.key !== 'maintenance') {
    return NextResponse.json({ error: 'Portal ejecutivo no disponible para este cargo' }, { status: 403 });
  }

  const { data, error } = await context.supabase
    .from('maintenance_operational_work_order_flow_v1')
    .select('*')
    .eq('organization_id', context.organizationId)
    .order('scheduled_date', { ascending: false, nullsFirst: false })
    .limit(300);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data || [];
  const active = rows.filter((row) => row.flow_status !== 'completed');
  const waitingProcurement = active.filter((row) => row.flow_status === 'waiting_procurement');
  const waitingParts = active.filter((row) => row.flow_status === 'waiting_parts');
  const missingOwner = active.filter((row) => row.flow_status === 'missing_person');
  const missingAsset = active.filter((row) => row.flow_status === 'missing_asset');
  const critical = active.filter((row) => ['critical', 'critica', 'crítica'].includes(String(row.priority || '').toLowerCase()));
  const totalCost = rows.reduce((sum, row) => sum + Number(row.total_cost || 0), 0);
  const purchaseCommitment = rows.reduce((sum, row) => sum + Number(row.purchase_commitment || 0), 0);

  const signals = [
    critical.length ? { level: 'alert', code: 'critical_work_orders', title: 'Órdenes críticas abiertas', detail: `${critical.length} orden(es) crítica(s) siguen abiertas.` } : null,
    waitingProcurement.length ? { level: 'watch', code: 'waiting_procurement', title: 'Trabajos esperando compra', detail: `${waitingProcurement.length} orden(es) están detenidas o condicionadas por compra.` } : null,
    waitingParts.length ? { level: 'watch', code: 'waiting_parts', title: 'Trabajos esperando repuestos', detail: `${waitingParts.length} orden(es) esperan repuestos para continuar.` } : null,
    missingOwner.length ? { level: 'watch', code: 'missing_owner', title: 'Órdenes sin responsable', detail: `${missingOwner.length} orden(es) activas no tienen responsable asignado.` } : null,
    missingAsset.length ? { level: 'watch', code: 'missing_asset', title: 'Órdenes sin equipo trazable', detail: `${missingAsset.length} orden(es) activas no tienen equipo asociado.` } : null,
  ].filter(Boolean);

  const status = critical.length ? 'attention' : signals.length ? 'watch' : 'stable';

  return NextResponse.json({
    portal,
    user: { id: context.userId, name: context.userName, role: context.role },
    status,
    metrics: {
      activeWorkOrders: active.length,
      criticalWorkOrders: critical.length,
      waitingSupply: waitingProcurement.length + waitingParts.length,
      missingOwner: missingOwner.length,
      totalCost,
      purchaseCommitment,
    },
    signals: signals.slice(0, 5),
    interpretation: [
      critical.length ? { level: 'alert', title: 'La prioridad está en las OT críticas', detail: `${critical.length} orden(es) crítica(s) requieren seguimiento hasta cierre.` } : null,
      waitingProcurement.length + waitingParts.length ? { level: 'watch', title: 'Abastecimiento está condicionando mantenimiento', detail: `${waitingProcurement.length + waitingParts.length} orden(es) dependen de compra o repuestos.` } : null,
      missingOwner.length ? { level: 'watch', title: 'Hay trabajo sin dueño operativo', detail: `${missingOwner.length} orden(es) activas deben quedar asignadas antes de evaluar ejecución.` } : null,
      !critical.length && !(waitingProcurement.length + waitingParts.length) && !missingOwner.length ? { level: 'info', title: 'La cartera activa no muestra bloqueos críticos', detail: 'No hay OT críticas ni bloqueos de abastecimiento en la evidencia actual.' } : null,
    ].filter(Boolean).slice(0, 4),
    change: { available: false, note: 'Aún no existe un historial de estados comparable para afirmar qué cambió entre cortes.' },
    source: 'public.maintenance_operational_work_order_flow_v1',
  });
}
