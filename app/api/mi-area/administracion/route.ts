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

function clp(value: number | null) {
  return value == null ? '—' : new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
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
  if (String(cargo?.name || '').trim().toUpperCase() !== 'JEFE ADM.') {
    return NextResponse.json({ error: 'Portal disponible sólo para JEFE ADM.' }, { status: 403 });
  }

  const { data, error } = await context.supabase
    .from('admin_finance_role_kpi_snapshot_v1')
    .select('kpi_key,label,unit,measured_value,evaluation_state,measured_at')
    .eq('organization_id', context.organizationId)
    .eq('cargo_name', 'JEFE ADM.');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data || [];
  const map = new Map(rows.map((row) => [row.kpi_key, row]));
  const value = (key: string) => num(map.get(key)?.measured_value);
  const committed = value('committed_cost_clp');
  const recognized = value('recognized_cost_clp');
  const costCenterCoverage = value('cost_center_coverage');
  const purchaseOrders = value('purchase_orders');
  const purchaseOrderValidation = value('purchase_order_validation');
  const pendingRecognition = committed != null && recognized != null ? Math.max(committed - recognized, 0) : null;

  const signals = [
    costCenterCoverage != null && costCenterCoverage < 100 ? { level: costCenterCoverage < 90 ? 'watch' : 'info', code: 'cost_center_coverage', title: 'Cobertura de centro de costo incompleta', detail: `Cobertura observada: ${pct(costCenterCoverage, 2)}. El remanente debe tratarse como falta de clasificación, no como costo cero.` } : null,
    purchaseOrderValidation != null && purchaseOrderValidation < 100 ? { level: 'watch', code: 'purchase_order_validation', title: 'Hay órdenes de compra pendientes de validación', detail: `Validación observada: ${pct(purchaseOrderValidation, 2)}.` } : null,
  ].filter(Boolean) as Array<{ level: 'info' | 'watch' | 'alert'; code: string; title: string; detail: string }>;

  const interpretation = [
    { level: 'info', title: 'Los costos se muestran como baseline, no como evaluación', detail: 'Sin presupuesto o meta aprobada no se clasifica el nivel de gasto como favorable o desfavorable.' },
    costCenterCoverage != null ? { level: costCenterCoverage < 90 ? 'watch' : 'info', title: 'Trazabilidad de centro de costo', detail: `Cobertura actual: ${pct(costCenterCoverage, 2)}.` } : null,
    purchaseOrderValidation != null && purchaseOrderValidation >= 100 ? { level: 'info', title: 'Las órdenes de compra del corte están validadas', detail: `${count(purchaseOrders)} OC canónicas con cobertura de validación de ${pct(purchaseOrderValidation, 2)}.` } : null,
  ].filter(Boolean).slice(0, 4);

  return NextResponse.json({
    portal: { key: 'administration', label: 'Mi área', title: 'Mi administración', areaPath: '/dashboard/finanzas', actionLabel: 'Abrir finanzas' },
    user: { id: context.userId, name: context.userName, role: context.role, cargo: cargo?.name || null },
    status: signals.some((item) => item.level === 'alert') ? 'attention' : signals.some((item) => item.level === 'watch') ? 'watch' : 'stable',
    metrics: [
      { label: 'Costo comprometido', value: clp(committed) },
      { label: 'Costo reconocido', value: clp(recognized) },
      { label: 'Pendiente reconocer', value: clp(pendingRecognition) },
      { label: 'Centros de costo', value: costCenterCoverage == null ? '—' : pct(costCenterCoverage, 2) },
      { label: 'Órdenes de compra', value: count(purchaseOrders) },
      { label: 'OC validadas', value: purchaseOrderValidation == null ? '—' : pct(purchaseOrderValidation, 2) },
    ],
    signals: signals.slice(0, 5),
    interpretation,
    change: { available: false, note: 'El snapshot administrativo actual no conserva dos cortes comparables para afirmar una variación temporal.', items: [] },
    source: 'admin_finance_role_kpi_snapshot_v1',
  });
}
