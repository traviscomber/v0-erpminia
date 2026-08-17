export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const { data, error } = await context.supabase
    .from('hse_epp_durability_diagnostics_v1')
    .select('*')
    .eq('organization_id', context.organizationId)
    .order('epp_type', { ascending: true })
    .order('avg_cost_per_observed_day', { ascending: true, nullsFirst: false });

  if (error) {
    return NextResponse.json({ error: error.message || 'No fue posible cargar el diagnóstico EPP' }, { status: 500 });
  }

  const rows = data || [];
  const comparable = rows.filter((row) => Number(row.completed_cycles || 0) > 0 && row.avg_cost_per_observed_day != null);
  const bestByType = new Map<string, (typeof comparable)[number]>();

  for (const row of comparable) {
    const key = String(row.epp_type || 'Sin categoría');
    const current = bestByType.get(key);
    if (!current || Number(row.avg_cost_per_observed_day) < Number(current.avg_cost_per_observed_day)) {
      bestByType.set(key, row);
    }
  }

  return NextResponse.json({
    rows,
    summary: {
      catalogItems: rows.length,
      comparableItems: comparable.length,
      observedCycles: rows.reduce((sum, row) => sum + Number(row.completed_cycles || 0), 0),
      failureReplacements: rows.reduce((sum, row) => sum + Number(row.failure_replacements || 0), 0),
      lossReplacements: rows.reduce((sum, row) => sum + Number(row.loss_replacements || 0), 0),
    },
    bestByType: Array.from(bestByType.values()),
    methodology: {
      primaryMetric: 'avg_cost_per_observed_day',
      note: 'La comparación prioriza costo por día efectivo observado y conserva por separado fallas, pérdidas, certificación y cobertura de ciclos. No recomienda automáticamente una compra cuando la evidencia es insuficiente.',
    },
  });
}
