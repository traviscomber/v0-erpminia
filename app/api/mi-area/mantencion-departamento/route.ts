export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

function num(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function pct(value: unknown, digits = 1) {
  const parsed = value === null || value === undefined ? null : Number(value);
  return parsed === null || Number.isNaN(parsed) ? '—' : `${parsed.toLocaleString('es-CL', { maximumFractionDigits: digits })}%`;
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const { data: profile, error: profileError } = await context.supabase.from('profiles').select('cargo_id').eq('id', context.userId).maybeSingle();
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  const { data: cargo, error: cargoError } = profile?.cargo_id
    ? await context.supabase.from('cargos').select('name').eq('id', profile.cargo_id).maybeSingle()
    : { data: null, error: null };
  if (cargoError) return NextResponse.json({ error: cargoError.message }, { status: 500 });

  if (String(cargo?.name || '').trim().toUpperCase() !== 'JEFE DEPARTAMENTO DE MANTENCIÓN') {
    return NextResponse.json({ error: 'Portal disponible sólo para Jefe Departamento de Mantención.' }, { status: 403 });
  }

  const [kpiResult, flowResult] = await Promise.all([
    context.supabase.from('maintenance_role_kpi_snapshot_v1').select('kpi_key,label,unit,measured_value,evaluation_state,measured_at').eq('organization_id', context.organizationId).eq('cargo_name', 'Jefe Departamento de Mantención'),
    context.supabase.from('maintenance_operational_work_order_flow_v1').select('work_order_id,status,priority,flow_status,total_cost,purchase_commitment').eq('organization_id', context.organizationId).limit(300),
  ]);

  if (kpiResult.error) return NextResponse.json({ error: kpiResult.error.message }, { status: 500 });
  if (flowResult.error) return NextResponse.json({ error: flowResult.error.message }, { status: 500 });

  const kpis = kpiResult.data || [];
  const kpiMap = new Map(kpis.map((row) => [row.kpi_key, row]));
  const value = (key: string) => {
    const raw = kpiMap.get(key)?.measured_value;
    return raw === null || raw === undefined ? null : num(raw);
  };

  const backlog = value('open_backlog');
  const closureRate = value('wo_closure_rate');
  const preventiveRate = value('preventive_closure_rate');
  const mttr = value('mttr_hours');

  const rows = flowResult.data || [];
  const active = rows.filter((row) => row.flow_status !== 'completed');
  const critical = active.filter((row) => ['critical', 'critica', 'crítica'].includes(String(row.priority || '').toLowerCase()));
  const waitingProcurement = active.filter((row) => row.flow_status === 'waiting_procurement');
  const waitingParts = active.filter((row) => row.flow_status === 'waiting_parts');
  const missingAsset = active.filter((row) => row.flow_status === 'missing_asset');

  const signals = [
    critical.length ? { level: 'alert', code: 'critical_work_orders', title: 'Órdenes críticas abiertas', detail: `${critical.length} orden(es) crítica(s) permanecen abiertas.` } : null,
    waitingProcurement.length ? { level: 'watch', code: 'waiting_procurement', title: 'Trabajos condicionados por compra', detail: `${waitingProcurement.length} orden(es) esperan gestión de compra.` } : null,
    waitingParts.length ? { level: 'watch', code: 'waiting_parts', title: 'Trabajos esperando repuestos', detail: `${waitingParts.length} orden(es) esperan repuestos.` } : null,
    missingAsset.length ? { level: 'watch', code: 'missing_asset', title: 'Falta trazabilidad de equipo', detail: `${missingAsset.length} orden(es) activas no tienen activo asociado.` } : null,
  ].filter(Boolean) as Array<{ level: 'info' | 'watch' | 'alert'; code: string; title: string; detail: string }>;

  const interpretation = [
    { level: 'info' as const, title: 'Los KPI de mantenimiento siguen en baseline', detail: 'Cierre de OT, preventivo y MTTR se muestran como evidencia observada; no se comparan contra una meta mientras no exista un objetivo aprobado.' },
    backlog !== null ? { level: 'info' as const, title: 'Backlog trazable del cargo', detail: `El snapshot registra ${backlog.toLocaleString('es-CL')} OT abiertas para la jefatura departamental.` } : null,
    mttr === null ? { level: 'watch' as const, title: 'MTTR no disponible en el corte actual', detail: 'La ausencia de valor se mantiene como dato faltante y no se convierte en cero.' } : null,
  ].filter(Boolean).slice(0, 4);

  return NextResponse.json({
    portal: { key: 'maintenance', label: 'Mi área', title: 'Mi mantenimiento' },
    user: { id: context.userId, name: context.userName, role: context.role, cargo: cargo?.name || null },
    status: signals.some((item) => item.level === 'alert') ? 'attention' : signals.length ? 'watch' : 'stable',
    metrics: [
      { label: 'Backlog abierto', value: backlog === null ? '—' : backlog.toLocaleString('es-CL') },
      { label: 'Cierre OT', value: closureRate === null ? '—' : pct(closureRate) },
      { label: 'Preventivo', value: preventiveRate === null ? '—' : pct(preventiveRate) },
      { label: 'MTTR', value: mttr === null ? '—' : `${mttr.toLocaleString('es-CL', { maximumFractionDigits: 1 })} h` },
      { label: 'OT activas', value: active.length.toLocaleString('es-CL') },
      { label: 'OT críticas', value: critical.length.toLocaleString('es-CL') },
    ],
    signals: signals.slice(0, 5),
    interpretation,
    change: { available: false, note: 'El snapshot de Mantención actual no conserva dos cortes comparables para afirmar una variación temporal.', items: [] },
    source: 'maintenance_role_kpi_snapshot_v1 + maintenance_operational_work_order_flow_v1',
  });
}
