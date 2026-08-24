export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

function num(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function pct(value: unknown, digits = 1) {
  const parsed = value === null || value === undefined ? null : Number(value);
  return parsed === null || Number.isNaN(parsed) ? '—' : `${parsed.toLocaleString('es-CL', { maximumFractionDigits: digits })}%`;
}

function count(value: number | null) {
  return value == null ? '—' : value.toLocaleString('es-CL');
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
  if (String(cargo?.name || '').trim().toUpperCase() !== 'JEFE BODEGA') {
    return NextResponse.json({ error: 'Portal disponible sólo para JEFE BODEGA' }, { status: 403 });
  }

  const { data, error } = await context.supabase
    .from('inventory_geology_role_kpi_snapshot_v1')
    .select('kpi_key,label,unit,measured_value,evaluation_state,measured_at')
    .eq('organization_id', context.organizationId)
    .eq('cargo_name', 'JEFE BODEGA');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data || [];
  const map = new Map(rows.map((row) => [row.kpi_key, row]));
  const value = (key: string) => num(map.get(key)?.measured_value);
  const activeItems = value('inventory_active_items');
  const validationCoverage = value('inventory_validation_coverage');
  const lowStock = value('low_stock_items');
  const staleCounts = value('warehouse_stale_counts');

  const signals = [
    lowStock != null && lowStock > 0 ? { level: 'alert', code: 'low_stock_items', title: 'Ítems en o bajo stock mínimo', detail: `${lowStock.toLocaleString('es-CL')} ítem(es) con stock mínimo positivo están en o bajo su umbral.` } : null,
    staleCounts != null && staleCounts > 0 ? { level: 'watch', code: 'warehouse_stale_counts', title: 'Posiciones sin conteo reciente', detail: `${staleCounts.toLocaleString('es-CL')} posición(es) requieren actualización de conteo según el snapshot actual.` } : null,
    validationCoverage != null && validationCoverage < 100 ? { level: validationCoverage >= 99.5 ? 'info' : 'watch', code: 'inventory_validation_coverage', title: 'Cobertura de validación de inventario', detail: `Cobertura observada: ${pct(validationCoverage, 2)}.` } : null,
  ].filter(Boolean) as Array<{ level: 'info' | 'watch' | 'alert'; code: string; title: string; detail: string }>;

  const interpretation = [
    lowStock != null
      ? lowStock > 0
        ? { level: 'alert', title: 'La prioridad es revisar los mínimos con riesgo real de quiebre', detail: 'La señal considera sólo ítems con stock mínimo positivo; los ítems sin mínimo configurado no generan esta alerta.' }
        : { level: 'info', title: 'No hay ítems bajo mínimo en el corte actual', detail: 'No se observan excepciones de stock mínimo en la evidencia consultada.' }
      : null,
    staleCounts != null && staleCounts > 0 ? { level: 'watch', title: 'La confiabilidad física requiere conteos pendientes', detail: `${staleCounts.toLocaleString('es-CL')} posición(es) no tienen conteo reciente.` } : null,
    validationCoverage != null ? { level: validationCoverage >= 99.5 ? 'info' : 'watch', title: 'Cobertura de validación de inventario', detail: `Cobertura canónica observada: ${pct(validationCoverage, 2)} sobre ${count(activeItems)} ítems activos.` } : null,
  ].filter(Boolean).slice(0, 4);

  return NextResponse.json({
    portal: { key: 'warehouse', label: 'Mi área', title: 'Mi bodega', areaPath: '/dashboard/bodega', actionLabel: 'Abrir inventario' },
    user: { id: context.userId, name: context.userName, role: context.role, cargo: cargo?.name || null },
    status: signals.some((item) => item.level === 'alert') ? 'attention' : signals.some((item) => item.level === 'watch') ? 'watch' : 'stable',
    metrics: [
      { label: 'Ítems activos', value: count(activeItems) },
      { label: 'Bajo mínimo', value: count(lowStock) },
      { label: 'Sin conteo reciente', value: count(staleCounts) },
      { label: 'Validación', value: validationCoverage == null ? '—' : pct(validationCoverage, 2) },
    ],
    signals: signals.slice(0, 5),
    interpretation,
    change: { available: false, note: 'El snapshot actual no conserva dos cortes comparables para afirmar una variación temporal.', items: [] },
    source: 'inventory_geology_role_kpi_snapshot_v1',
  });
}
