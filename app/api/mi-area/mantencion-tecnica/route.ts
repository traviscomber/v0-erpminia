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

  const { data: profile, error: profileError } = await context.supabase.from('profiles').select('cargo_id').eq('id', context.userId).maybeSingle();
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  const { data: cargo, error: cargoError } = profile?.cargo_id
    ? await context.supabase.from('cargos').select('name').eq('id', profile.cargo_id).maybeSingle()
    : { data: null, error: null };
  if (cargoError) return NextResponse.json({ error: cargoError.message }, { status: 500 });

  const cargoName = String(cargo?.name || '').trim();
  const normalized = cargoName.toUpperCase();
  const isMiningEquipment = normalized === 'JEFE DE EQUIPOS MINEROS';
  const isFleet = normalized === 'JEFE DE CAMIONETAS';
  if (!isMiningEquipment && !isFleet) return NextResponse.json({ error: 'Portal técnico no disponible para este cargo' }, { status: 403 });

  const [flowResult, kpiResult] = await Promise.all([
    context.supabase.from('maintenance_operational_work_order_flow_v1').select('work_order_id,asset_code,asset_name,flow_status').eq('organization_id', context.organizationId).limit(500),
    isMiningEquipment
      ? context.supabase.from('maintenance_role_kpi_snapshot_v1').select('kpi_key,label,unit,measured_value,evaluation_state,measured_at').eq('organization_id', context.organizationId).eq('cargo_name', 'Jefe de Equipos Mineros')
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (flowResult.error) return NextResponse.json({ error: flowResult.error.message }, { status: 500 });
  if (kpiResult.error) return NextResponse.json({ error: kpiResult.error.message }, { status: 500 });

  const rows = flowResult.data || [];
  const classified = rows.filter((row) => row.asset_code || row.asset_name);
  const coverage = rows.length ? (classified.length / rows.length) * 100 : null;

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

  const coverageSignal = coverage == null || coverage < 90 ? {
    level: 'watch' as const,
    code: 'asset_segmentation_incomplete',
    title: 'Falta segmentación confiable de activos',
    detail: coverage == null
      ? 'El flujo general de Mantención no permite separar esta responsabilidad técnica.'
      : `La clasificación global de activos alcanza ${pct(coverage)}. Hasta completar la segmentación, no se muestran OT globales como propias de esta jefatura.`,
  } : null;

  const signals = [coverageSignal].filter(Boolean);
  const title = isMiningEquipment ? 'Mis equipos mineros' : 'Mis camionetas';
  const interpretation = isMiningEquipment
    ? [
        { level: 'info', title: 'Sólo se muestran KPI propios del cargo', detail: 'Backlog, cierre y MTTR provienen del snapshot específico de Jefe de Equipos Mineros. El flujo global de Mantención no se atribuye a esta jefatura.' },
        coverageSignal ? { level: 'watch', title: 'La segmentación por activo aún limita el diagnóstico', detail: 'Cuando la clasificación permita separar Equipos Mineros de otras flotas, se podrán incorporar OT, disponibilidad, tiempos y costos propios.' } : null,
      ].filter(Boolean)
    : [
        { level: 'info', title: 'Portal preparado sin atribuciones globales', detail: 'Todavía no existe un snapshot KPI específico para Jefe de Camionetas, por lo que no se muestran métricas del flujo general como si fueran propias.' },
        { level: 'watch', title: 'La prioridad de datos es identificar la flota en cada OT', detail: 'Con activos trazables podremos mostrar backlog, disponibilidad, tiempos y costos propios de camionetas.' },
      ];

  return NextResponse.json({
    portal: { key: isMiningEquipment ? 'maintenance_equipment' : 'maintenance_fleet', label: 'Mi área', title },
    user: { id: context.userId, name: context.userName, role: context.role, cargo: cargoName },
    status: signals.length ? 'watch' : 'stable',
    metrics: isMiningEquipment
      ? [
          { label: 'Backlog cargo', value: backlog == null ? '—' : backlog.toLocaleString('es-CL') },
          { label: 'Cierre OT', value: pct(closure) },
          { label: 'MTTR', value: mttr == null ? '—' : `${mttr.toLocaleString('es-CL', { maximumFractionDigits: 2 })} h` },
          { label: 'OT propias', value: '—' },
          { label: 'Disponibilidad', value: '—' },
          { label: 'Estado datos', value: coverage != null && coverage >= 90 ? 'Preparado' : 'Incompleto' },
        ]
      : [
          { label: 'Backlog propio', value: '—' },
          { label: 'Cierre OT', value: '—' },
          { label: 'MTTR', value: '—' },
          { label: 'OT propias', value: '—' },
          { label: 'Disponibilidad', value: '—' },
          { label: 'Estado datos', value: coverage != null && coverage >= 90 ? 'Preparado' : 'Incompleto' },
        ],
    signals,
    interpretation,
    change: { available: false, note: 'No existe historial segmentado por activo suficiente para afirmar cambios de esta responsabilidad técnica.', items: [] },
    source: isMiningEquipment ? 'maintenance_role_kpi_snapshot_v1 + maintenance_operational_work_order_flow_v1 (coverage only)' : 'maintenance_operational_work_order_flow_v1 (coverage only)',
  });
}
