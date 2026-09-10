export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type AttentionRow = {
  domain: string | null;
  alert_key: string;
  severity: string | null;
  priority_score: number | null;
  title: string;
  evidence_summary: string | null;
  status: string | null;
  affects_operation: boolean | null;
  material_related: boolean | null;
  occurred_at: string | null;
  recommended_action: string | null;
};

type PreventiveRow = {
  schedule_id: string;
  canonical_asset_id: string | null;
  asset_code: string | null;
  asset_name: string | null;
  task_name: string | null;
  due_meter: number | null;
  effective_current_meter: number | null;
  remaining_hours: number | null;
  hour_status: string | null;
  alert_due: boolean | null;
  meter_basis_conflict: boolean | null;
};

type ArielPriorityRow = {
  source_row_id: string;
  canonical_asset_id: string;
  asset_code: string | null;
  asset_name: string | null;
  mine_raw: string | null;
  meter_unit: string | null;
  interval_mp: number | null;
  last_mp: number | null;
  next_due_meter: number | null;
  current_reading_at: string | null;
  current_reading: number | null;
  remaining_meter: number | null;
  utilization_per_day: number | null;
  projected_days: number | null;
  projected_due_at: string | null;
  criticality_raw: string | null;
  total_score: number | null;
  priority: string | null;
  recommended_action: string | null;
  scheduled_date: string | null;
  programming_status_raw: string | null;
  responsible_raw: string | null;
  parts_status_raw: string | null;
  observations: string | null;
  source_file: string | null;
  source_file_sha256: string | null;
  imported_at: string | null;
};

type ProductionPlanRow = {
  id: string;
  plan_code: string;
  period_start: string;
  period_end: string;
  status: string;
  prepared_by: string | null;
  total_mineral_to_plant_tons: number | null;
  total_waste_tons: number | null;
  total_movement_tons: number | null;
  planned_advance_m: number | null;
  planned_drilling_m: number | null;
};

function actionUrl(domain: string | null) {
  const value = String(domain || '').toLowerCase();
  if (value.includes('maintenance')) return '/dashboard/mantenimiento';
  if (value.includes('inventory') || value.includes('material') || value.includes('warehouse')) return '/dashboard/bodega';
  if (value.includes('purchase') || value.includes('procurement')) return '/dashboard/compras';
  if (value.includes('production') || value.includes('drilling')) return '/dashboard/produccion';
  return '/dashboard/alertas';
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const sourceStatus: Record<string, { available: boolean; error?: string }> = {
    attention: { available: false },
    preventive: { available: false },
    arielPlanning: { available: false },
    productionPlan: { available: false },
  };

  const [attentionResult, summaryResult, preventiveResult, arielPriorityResult, sourceCoverageResult, planResult] = await Promise.all([
    context.supabase
      .from('operational_attention_global_v1')
      .select('domain, alert_key, severity, priority_score, title, evidence_summary, status, affects_operation, material_related, occurred_at, recommended_action')
      .eq('organization_id', context.organizationId)
      .eq('status', 'pending')
      .order('priority_score', { ascending: false })
      .order('occurred_at', { ascending: false })
      .limit(50),
    context.supabase
      .from('operational_attention_global_summary_v1')
      .select('active_alerts, critical_alerts, warning_alerts, material_blockers, maintenance_alerts, max_priority')
      .eq('organization_id', context.organizationId)
      .maybeSingle(),
    context.supabase
      .from('preventive_maintenance_hour_status_v1')
      .select('schedule_id, canonical_asset_id, asset_code, asset_name, task_name, due_meter, effective_current_meter, remaining_hours, hour_status, alert_due, meter_basis_conflict')
      .eq('organization_id', context.organizationId)
      .eq('enabled', true)
      .eq('alert_due', true)
      .order('remaining_hours', { ascending: true })
      .limit(20),
    context.supabase
      .from('planning_maintenance_priority_v1')
      .select('source_row_id, canonical_asset_id, asset_code, asset_name, mine_raw, meter_unit, interval_mp, last_mp, next_due_meter, current_reading_at, current_reading, remaining_meter, utilization_per_day, projected_days, projected_due_at, criticality_raw, total_score, priority, recommended_action, scheduled_date, programming_status_raw, responsible_raw, parts_status_raw, observations, source_file, source_file_sha256, imported_at')
      .eq('organization_id', context.organizationId)
      .order('total_score', { ascending: false, nullsFirst: false })
      .order('remaining_meter', { ascending: true, nullsFirst: false })
      .limit(40),
    context.supabase
      .from('planning_maintenance_source_rows')
      .select('reconciliation_status', { count: 'exact', head: false })
      .eq('organization_id', context.organizationId),
    context.supabase
      .from('production_monthly_plans')
      .select('id, plan_code, period_start, period_end, status, prepared_by, total_mineral_to_plant_tons, total_waste_tons, total_movement_tons, planned_advance_m, planned_drilling_m')
      .eq('organization_id', context.organizationId)
      .eq('status', 'active')
      .order('period_start', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  sourceStatus.attention = attentionResult.error
    ? { available: false, error: attentionResult.error.message }
    : { available: true };
  sourceStatus.preventive = preventiveResult.error
    ? { available: false, error: preventiveResult.error.message }
    : { available: true };
  sourceStatus.arielPlanning = arielPriorityResult.error || sourceCoverageResult.error
    ? { available: false, error: arielPriorityResult.error?.message || sourceCoverageResult.error?.message }
    : { available: true };
  sourceStatus.productionPlan = planResult.error
    ? { available: false, error: planResult.error.message }
    : { available: true };

  const attention = ((attentionResult.data || []) as AttentionRow[]).map((row) => ({
    ...row,
    action_url: actionUrl(row.domain),
  }));
  const preventive = (preventiveResult.data || []) as PreventiveRow[];
  const arielPriorities = (arielPriorityResult.data || []) as ArielPriorityRow[];
  const sourceRows = sourceCoverageResult.data || [];
  const matchedRows = sourceRows.filter((row: any) => row.reconciliation_status === 'matched').length;
  const totalRows = sourceCoverageResult.count || sourceRows.length;
  const sourceCoverage = {
    total_rows: totalRows,
    matched_rows: matchedRows,
    unmatched_rows: Math.max(0, totalRows - matchedRows),
    matched_percent: totalRows > 0 ? Math.round((matchedRows / totalRows) * 1000) / 10 : 0,
  };
  const priorityCounts = arielPriorities.reduce<Record<string, number>>((acc, row) => {
    const key = row.priority || 'SIN CLASIFICAR';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const productionPlan = (planResult.data || null) as ProductionPlanRow | null;

  const complete = Object.values(sourceStatus).every((source) => source.available);

  return NextResponse.json({
    planner: {
      name: context.userName || context.userEmail || 'Planificador',
      role: 'Jefe de Planificación',
      scope: ['Mantenimiento', 'Producción', 'Bodega', 'Compras'],
    },
    summary: summaryResult.error ? null : summaryResult.data,
    attention,
    preventive,
    arielPlanning: {
      sourceCoverage,
      priorityCounts,
      priorities: arielPriorities,
      semantics: {
        source: 'Workbook de Ariel preservado como evidencia con reconciliación contra activos canónicos.',
        priority: 'P1-P5 se calcula determinísticamente desde intervalo MP, lecturas, utilización y criticidad; no es diagnóstico ni autorización automática.',
        authority: 'Ariel confirma la programación, ventana, responsable y siguiente acción.',
      },
    },
    productionPlan,
    sourceStatus: {
      ...sourceStatus,
      complete,
    },
    generatedAt: new Date().toISOString(),
  });
}
