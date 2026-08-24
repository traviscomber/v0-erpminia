export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

function n(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function format(value: number | null, digits = 1) {
  return value == null ? '—' : value.toLocaleString('es-CL', { maximumFractionDigits: digits });
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
  if (cargo?.name !== 'JEFE SONDAJE') return NextResponse.json({ error: 'Portal disponible sólo para JEFE SONDAJE' }, { status: 403 });

  const { data, error } = await context.supabase
    .from('drilling_role_kpi_snapshot_v1')
    .select('kpi_key,label,unit,measured_value,evaluation_state,measured_at')
    .eq('organization_id', context.organizationId)
    .eq('cargo_name', 'JEFE SONDAJE');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data || [];
  const latest = new Map<string, any>();
  for (const row of rows) {
    const current = latest.get(row.kpi_key);
    if (!current || (row.measured_value != null && current.measured_value == null)) latest.set(row.kpi_key, row);
  }

  const drilledMeters = n(latest.get('drilled_meters')?.measured_value);
  const drillingHoles = n(latest.get('drilling_holes')?.measured_value);
  const capture = n(latest.get('meter_capture_pct')?.measured_value);
  const outOfService = n(latest.get('out_of_service_reports')?.measured_value);
  const rigsReporting = n(latest.get('rigs_reporting')?.measured_value);

  const signals = [
    capture != null && capture < 100 ? {
      level: 'watch', code: 'meter_capture', title: 'La captura de metros perforados no está completa',
      detail: `Cobertura observada: ${format(capture, 2)}%.`,
    } : null,
    outOfService != null && outOfService > 0 ? {
      level: 'watch', code: 'out_of_service_reports', title: 'Existen reportes fuera de servicio',
      detail: `${format(outOfService, 0)} reporte(s) aparecen en el snapshot canónico; no se asume que sean todos eventos abiertos actuales.`,
    } : null,
  ].filter(Boolean);

  const interpretation = [
    capture != null ? {
      level: capture < 100 ? 'watch' : 'info',
      title: capture < 100 ? 'La principal brecha es de cobertura de captura' : 'La captura de metros está completa',
      detail: `${format(capture, 2)}% de los metros perforados tiene cobertura en la evidencia actual.`,
    } : null,
    drilledMeters != null ? {
      level: 'info', title: 'La actividad de sondaje tiene volumen trazable',
      detail: `${format(drilledMeters, 2)} m perforados en la evidencia canónica y ${format(drillingHoles, 0)} sondaje(s) con actividad.`,
    } : null,
  ].filter(Boolean);

  return NextResponse.json({
    portal: { key: 'drilling', label: 'Mi área', title: 'Mi sondaje', areaPath: '/dashboard/produccion/sondaje', actionLabel: 'Abrir sondaje' },
    user: { id: context.userId, name: context.userName, role: context.role, cargo: cargo?.name || null },
    status: signals.length ? 'watch' : 'stable',
    metrics: [
      { label: 'Metros perforados', value: drilledMeters == null ? '—' : `${format(drilledMeters, 2)} m` },
      { label: 'Sondajes activos', value: format(drillingHoles, 0) },
      { label: 'Cobertura metros', value: capture == null ? '—' : `${format(capture, 2)}%` },
      { label: 'Sondas reportando', value: format(rigsReporting, 0) },
      { label: 'Reportes fuera servicio', value: format(outOfService, 0) },
    ],
    signals,
    interpretation,
    change: { available: false, note: 'El snapshot de sondaje actual no conserva dos cortes comparables para afirmar una variación temporal.', items: [] },
    source: 'drilling_role_kpi_snapshot_v1',
  });
}
