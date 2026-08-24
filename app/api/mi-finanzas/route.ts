export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

const DANIEL_PROFILE_ID = '999fd840-8923-4dd2-b1cc-af8da2e7ef30';

function num(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function pct(value: unknown, digits = 1) {
  const parsed = value === null || value === undefined ? null : Number(value);
  return parsed === null || Number.isNaN(parsed)
    ? '—'
    : `${parsed.toLocaleString('es-CL', { maximumFractionDigits: digits })}%`;
}

function clp(value: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  if (context.userId !== DANIEL_PROFILE_ID) {
    return NextResponse.json({ error: 'Vista financiera ejecutiva no disponible para este usuario' }, { status: 403 });
  }

  const { data: profile, error: profileError } = await context.supabase
    .from('profiles')
    .select('full_name,status')
    .eq('id', context.userId)
    .maybeSingle();

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });
  if (!profile || profile.status !== 'active') {
    return NextResponse.json({ error: 'Perfil ejecutivo no activo' }, { status: 403 });
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
  const pendingRecognition = Math.max(committed - recognized, 0);
  const costCenterCoverage = value('cost_center_coverage');
  const purchaseOrders = value('purchase_orders');
  const purchaseOrderValidation = value('purchase_order_validation');

  const signals = [
    costCenterCoverage > 0 && costCenterCoverage < 100
      ? {
          level: costCenterCoverage < 90 ? 'watch' : 'info',
          code: 'cost_center_coverage',
          title: 'La trazabilidad por centro de costo no está completa',
          detail: `Cobertura observada: ${pct(costCenterCoverage, 2)}. El remanente es información sin clasificación, no costo cero.`,
        }
      : null,
    purchaseOrderValidation > 0 && purchaseOrderValidation < 100
      ? {
          level: 'watch',
          code: 'purchase_order_validation',
          title: 'Existen órdenes de compra pendientes de validación',
          detail: `Validación observada: ${pct(purchaseOrderValidation, 2)}.`,
        }
      : null,
  ].filter(Boolean) as Array<{ level: 'info' | 'watch' | 'alert'; code: string; title: string; detail: string }>;

  const interpretation = [
    {
      level: 'info',
      title: 'La lectura financiera sigue en baseline',
      detail: 'Los montos son evidencia canónica del corte. Sin presupuesto o meta aprobada no se clasifican como favorables o desfavorables.',
    },
    costCenterCoverage > 0
      ? {
          level: costCenterCoverage < 90 ? 'watch' : 'info',
          title: 'La cobertura de centros de costo determina la calidad del análisis',
          detail: `Cobertura actual: ${pct(costCenterCoverage, 2)}.`,
        }
      : null,
    purchaseOrderValidation >= 100
      ? {
          level: 'info',
          title: 'Las órdenes de compra del corte están validadas',
          detail: `${purchaseOrders.toLocaleString('es-CL')} OC canónicas con ${pct(purchaseOrderValidation, 2)} de validación.`,
        }
      : null,
  ].filter(Boolean).slice(0, 4);

  return NextResponse.json({
    portal: {
      key: 'finance-executive',
      label: 'Mi finanzas',
      title: 'Mi finanzas',
      areaPath: '/dashboard/finanzas',
      actionLabel: 'Abrir finanzas',
    },
    user: { id: context.userId, name: profile.full_name || context.userName, role: context.role, cargo: 'Gerente de Finanzas' },
    status: signals.some((item) => item.level === 'alert')
      ? 'attention'
      : signals.some((item) => item.level === 'watch')
        ? 'watch'
        : 'stable',
    metrics: [
      { label: 'Costo comprometido', value: clp(committed) },
      { label: 'Costo reconocido', value: clp(recognized) },
      { label: 'Pendiente reconocer', value: clp(pendingRecognition) },
      { label: 'Centros de costo', value: costCenterCoverage ? pct(costCenterCoverage, 2) : '—' },
      { label: 'Órdenes de compra', value: purchaseOrders.toLocaleString('es-CL') },
      { label: 'OC validadas', value: purchaseOrderValidation ? pct(purchaseOrderValidation, 2) : '—' },
    ],
    signals: signals.slice(0, 5),
    interpretation,
    change: {
      available: false,
      note: 'El snapshot financiero actual no conserva dos cortes comparables para afirmar una variación temporal.',
      items: [],
    },
    source: 'admin_finance_role_kpi_snapshot_v1 · vista gerencial, no evaluación personal',
  });
}
