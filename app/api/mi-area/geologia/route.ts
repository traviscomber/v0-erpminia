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
  if (cargo?.name !== 'JEFE GEÓLOGIA') return NextResponse.json({ error: 'Portal disponible sólo para JEFE GEÓLOGIA' }, { status: 403 });

  const { data, error } = await context.supabase
    .from('inventory_geology_role_kpi_snapshot_v1')
    .select('kpi_key,label,unit,measured_value,evaluation_state,measured_at')
    .eq('organization_id', context.organizationId)
    .eq('cargo_name', 'JEFE GEÓLOGIA');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data || [];
  const latest = new Map<string, any>();
  for (const row of rows) {
    const current = latest.get(row.kpi_key);
    if (!current || (row.measured_value != null && current.measured_value == null)) latest.set(row.kpi_key, row);
  }

  const activeSources = n(latest.get('active_mine_sources')?.measured_value);
  const activeSectors = n(latest.get('active_sectors')?.measured_value);
  const coverage = n(latest.get('sector_activity_coverage')?.measured_value);

  const signals = [
    activeSources === 0 ? {
      level: 'watch' as const, code: 'mine_sources', title: 'No hay fuentes mina activas en el corte',
      detail: 'La evidencia del snapshot no registra fuentes mina activas.',
    } : null,
  ].filter(Boolean);

  const interpretation = [
    coverage != null ? {
      level: coverage < 100 ? 'watch' : 'info',
      title: coverage < 100 ? 'La cobertura geológica todavía es incompleta' : 'La cobertura geológica está completa',
      detail: coverage < 100
        ? `${format(coverage, 2)}% de cobertura observada. La brecha se muestra en Calidad de datos y no como prioridad operacional.`
        : `${format(coverage, 2)}% de cobertura observada sobre sectores activos.`,
    } : null,
    activeSectors != null ? {
      level: 'info', title: 'La base operativa tiene sectores activos trazables',
      detail: `${format(activeSectors, 0)} sector(es) aparecen activos en la evidencia canónica.`,
    } : null,
  ].filter(Boolean);

  return NextResponse.json({
    portal: { key: 'geology', label: 'Mi área', title: 'Mi geología', areaPath: '/dashboard/produccion/geologia', actionLabel: 'Abrir geología' },
    user: { id: context.userId, name: context.userName, role: context.role, cargo: cargo?.name || null },
    status: signals.length ? 'watch' : 'stable',
    metrics: [
      { label: 'Sectores activos', value: format(activeSectors, 0) },
      { label: 'Fuentes mina activas', value: format(activeSources, 0) },
      { label: 'Cobertura sectores', value: coverage == null ? '—' : `${format(coverage, 2)}%` },
    ],
    signals,
    interpretation,
    change: { available: false, note: 'El snapshot geológico actual no conserva dos cortes comparables para afirmar una variación temporal.', items: [] },
    source: 'inventory_geology_role_kpi_snapshot_v1',
  });
}
