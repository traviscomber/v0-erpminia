export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

function num(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function pct(value: number | null, digits = 1) {
  return value == null ? '—' : `${value.toLocaleString('es-CL', { maximumFractionDigits: digits })}%`;
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const { data: profile, error: profileError } = await context.supabase
    .from('profiles')
    .select('cargo_id')
    .eq('id', context.userId)
    .maybeSingle();
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  const { data: cargo, error: cargoError } = profile?.cargo_id
    ? await context.supabase.from('cargos').select('name').eq('id', profile.cargo_id).maybeSingle()
    : { data: null, error: null };
  if (cargoError) return NextResponse.json({ error: cargoError.message }, { status: 500 });

  const cargoName = String(cargo?.name || '').trim();
  const normalized = cargoName.toUpperCase();
  const isMiningEquipment = normalized === 'JEFE DE EQUIPOS MINEROS';
  const isFleet = normalized === 'JEFE DE CAMIONETAS';
  if (!isMiningEquipment && !isFleet) {
    return NextResponse.json({ error: 'Portal técnico no disponible para este cargo' }, { status: 403 });
  }

  const [flowResult, kpiResult] = await Promise.all([
    context.supabase
      .from('maintenance_operational_work_order_flow_v1')
      .select('work_order_id,asset_code,asset_name,status,priority,flow_status')
      .eq('organization_id', context.organizationId)
      .limit(500),
    isMiningEquipment
      ? context.supabase
          .from('maintenance_role_kpi_snapshot_v1')
          .select('kpi_key,label,unit,measured_value,evaluation_state,measured_at')
          .eq('organization_id', context.organizationId)
          .eq('cargo_name', 'Jefe de Equipos Mineros')
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (flowResult.error) return NextResponse.json({ error: flowResult.error.message }, { status: 500 });
  if (kpiResult.error) return NextResponse.json({ error: kpiResult.error.message }, { status: 500 });

  const rows = flowResult.data || [];
  const classified = rows.filter((row) => row.asset_code || row.asset_name);
  const unclassified = rows.length - classified.length;
  const coverage = rows.length ? (classified.length / rows.length) * 100 : null;
  const active = rows.filter((row) => row.flow_status !== 'completed');
  const critical = active.filter((row) => ['critical', 'critica', 'crítica'].includes(String(row.priority || '').toLowerCase()));

  const kpis = kpiResult.data || [];
  const latestByKey = new Map<string, any>();
  for (const row of kpis) {
    const existing = latestByKey.get(row.kpi_key);
    if (!existing || String(row.measured_at || '') > String(existing.measured_at || '')) latestByKey.set(row.kpi_key, row);
  }
  const kpiValue = (key: string) => num(latestByKey.get(key)?.measured_value);

  const backlog = kpiValue('open_backlog');
  const closure = kpiValue('wo_closure_rate');
  const mttr = kpiValue('mttr_hours');

  const coverageSignal = coverage == null
    ? { level: 'watch' as const, code: 'asset_coverage_absent', title: 'Sin cobertura de activos suficiente', detail: 'No hay OT clasificadas suficientes para separar esta responsabilidad técnica.' }
    : coverage < 90
      ? { level: 'watch' as const, code: 'asset_coverage_low', title: 'Clasificación de activos incompleta', detail: `Sólo ${pct(coverage)} de las OT consultadas tiene activo trazable. No se atribuyen cifras globales a esta jefatura.` }
      : null;

  const signals = [
    coverageSignal,
    unclassified > 0 ? { level: 'watch' as const, code: 'missing_asset', title: 'OT sin activo asociado', detail: `${unclassified.toLocaleString('es-CL')} OT no tienen activo trazable en la evidencia consultada.` } : null,
    isMiningEquipment && critical.length > 0 ? { level: 'info' as const, code: 'critical_global', title: 'Existen OT críticas en Mantención', detail: `${critical.length.toLocaleString('es-CL')} OT críticas aparecen en el flujo general. Sin clasificación de activo suficiente no se atribuyen a Equipos Mineros.` } : null,
  ].filter(Boolean);

  const title = isMiningEquipment ? 'Mis equipos mineros' : 'Mis camionetas';
  const interpretation = isMiningEquipment
    ? [
        { level: 'info', title: 'Los KPI del cargo son baseline', detail: 'Backlog, cierre y MTTR se muestran como evidencia del cargo; no son una evaluación personal ni se comparan contra metas no aprobadas.' },
        coverageSignal ? { level: 'watch', title: 'La segmentación por activo aún limita el diagnóstico', detail: 'Hasta completar la clasificación de activos, el portal no adjudica OT del flujo general a Equipos Mineros.' } : null,
      ].filter(Boolean)
    : [
        { level: 'info', title: 'Portal técnico preparado sin inventar métricas', detail: 'Todavía no existe un snapshot KPI específico para Jefe de Camionetas.' },
        { level: 'watch', title: 'La prioridad de datos es identificar la flota en cada OT', detail: 'Con activos trazables podremos mostrar backlog, disponibilidad, tiempos y costos propios de camionetas.' },
      ];

  return NextResponse.json({
    portal: {
      key: isMiningEquipment ? 'maintenance_equipment' : 'maintenance_fleet',
      label: 'Mi área',
      title,
      areaPath: '/dashboard/mantenimiento',
      actionLabel: 'Abrir mantenimiento',
    },
    user: { id: context.userId, name: context.userName, role: context.role, cargo: cargoName },
    status: signals.length ? 'watch' : 'stable',
    metrics: isMiningEquipment
      ? [
          { label: 'Backlog cargo', value: backlog == null ? '—' : backlog.toLocaleString('es-CL') },
          { label: 'Cierre OT', value: pct(closure) },
          { label: 'MTTR', value: mttr == null ? '—' : `${mttr.toLocaleString('es-CL', { maximumFractionDigits: 2 })} h` },
          { label: 'OT con activo', value: classified.length.toLocaleString('es-CL') },
          { label: 'OT sin activo', value: unclassified.toLocaleString('es-CL') },
          { label: 'Cobertura activo', value: pct(coverage) },
        ]
      : [
          { label: 'OT con activo', value: classified.length.toLocaleString('es-CL') },
          { label: 'OT sin activo', value: unclassified.toLocaleString('es-CL') },
          { label: 'Cobertura activo', value: pct(coverage) },
          { label: 'KPI propios', value: 'Sin snapshot' },
          { label: 'OT atribuidas', value: '—' },
          { label: 'Estado datos', value: coverage != null && coverage >= 90 ? 'Preparado' : 'Incompleto' },
        ],
    signals,
    interpretation,
    change: { available: false, note: 'No existe historial segmentado por activo suficiente para afirmar cambios de esta responsabilidad técnica.', items: [] },
    source: isMiningEquipment
      ? 'maintenance_role_kpi_snapshot_v1 + maintenance_operational_work_order_flow_v1'
      : 'maintenance_operational_work_order_flow_v1',
  });
}
