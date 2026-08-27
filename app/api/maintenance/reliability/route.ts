export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_GERENCIAL);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const [summaryResult, assetsResult, causesResult] = await Promise.all([
      context.supabase
        .from('maintenance_reliability_summary_v1')
        .select('*')
        .eq('organization_id', context.organizationId)
        .maybeSingle(),
      context.supabase
        .from('maintenance_reliability_by_asset_v1')
        .select('*')
        .eq('organization_id', context.organizationId)
        .order('has_recurring_root_cause', { ascending: false })
        .order('audited_closures', { ascending: false })
        .order('audited_total_cost', { ascending: false }),
      context.supabase
        .from('maintenance_reliability_by_root_cause_v1')
        .select('*')
        .eq('organization_id', context.organizationId)
        .eq('is_recurring', true)
        .order('occurrences', { ascending: false })
        .order('audited_total_cost', { ascending: false }),
    ]);

    const error = summaryResult.error || assetsResult.error || causesResult.error;
    if (error) throw error;

    return NextResponse.json({
      summary: summaryResult.data || {
        assets_with_audited_closures: 0,
        audited_closures: 0,
        assets_with_recurring_root_cause: 0,
        audited_total_cost: 0,
        total_actual_hours: 0,
        total_downtime_hours: 0,
      },
      assets: assetsResult.data || [],
      recurringCauses: causesResult.data || [],
      rules: {
        evidence: 'Solo cierres con snapshot de costo auditado.',
        recurrence: 'Una causa es recurrente cuando la misma causa raiz aparece al menos dos veces para el mismo activo.',
        interval: 'El intervalo mostrado es entre intervenciones auditadas; no se presenta como MTBF sin evidencia de tiempo operativo continuo.',
      },
      source: 'audited_work_order_closures',
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar la confiabilidad auditada.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
