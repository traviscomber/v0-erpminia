export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

type MetallurgyRow = {
  operation_date:string|null;
  head_grade:number|null;
  source_file:string|null;
  source_sheet:string|null;
  validation_status:string|null;
};

type DrillingRow = {
  operation_date:string|null;
  hole_code_raw:string|null;
  drilled_meters:number|null;
};

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.PROD_GEOLOGIA);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const [metallurgy, plans, planLines, drilling] = await Promise.all([
    context.supabase
      .from('production_metallurgy_automatic_v1')
      .select('operation_date,head_grade,source_file,source_sheet,validation_status')
      .eq('organization_id', context.organizationId)
      .order('operation_date', { ascending: false })
      .limit(15000),
    context.supabase
      .from('production_monthly_plans')
      .select('id,plan_code,period_start,period_end,status,target_cu_grade_pct,planned_advance_m,planned_drilling_m,total_mineral_to_plant_tons,total_waste_tons,total_movement_tons,source_document_id')
      .eq('organization_id', context.organizationId)
      .order('period_start', { ascending: false })
      .limit(60),
    context.supabase
      .from('production_monthly_plan_lines')
      .select('id,plan_id,line_type,mine_source_id,mine_name_raw,sector_raw,level_raw,section_raw,planned_tons,planned_grade_pct,planned_fine_cu,planned_advance_m,planned_drilling_m,source_reference,priority')
      .eq('organization_id', context.organizationId)
      .order('priority', { ascending: true })
      .limit(2000),
    context.supabase
      .from('production_drilling_source_reports')
      .select('operation_date,hole_code_raw,drilled_meters')
      .eq('organization_id', context.organizationId)
      .order('operation_date', { ascending: false })
      .order('source_row', { ascending: false })
      .limit(6000),
  ]);

  const error = metallurgy.error || plans.error || planLines.error || drilling.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (metallurgy.data || []) as MetallurgyRow[];
  const validRows = rows.filter((row) => String(row.validation_status || '').toLowerCase() === 'valid' && row.operation_date && row.head_grade != null);
  const reviewRows = rows.filter((row) => String(row.validation_status || '').toLowerCase() !== 'valid');

  const byMonth = new Map<string, {sum:number;count:number;min:number;max:number;sources:Set<string>}>();
  for (const row of validRows) {
    const month = String(row.operation_date).slice(0, 7);
    const value = Number(row.head_grade);
    if (!Number.isFinite(value)) continue;
    const current = byMonth.get(month) || { sum: 0, count: 0, min: value, max: value, sources: new Set<string>() };
    current.sum += value;
    current.count += 1;
    current.min = Math.min(current.min, value);
    current.max = Math.max(current.max, value);
    if (row.source_file) current.sources.add(row.source_file);
    byMonth.set(month, current);
  }

  const headGradeHistory = [...byMonth.entries()]
    .map(([month, value]) => ({
      month: `${month}-01`,
      records: value.count,
      avgHeadGradePct: value.count ? value.sum / value.count : null,
      minHeadGradePct: value.min,
      maxHeadGradePct: value.max,
      sourceFiles: [...value.sources].sort(),
    }))
    .sort((a, b) => b.month.localeCompare(a.month));

  const planRows = plans.data || [];
  const lineRows = planLines.data || [];
  const minePlans = planRows.map((plan) => ({
    ...plan,
    lines: lineRows
      .filter((line) => line.plan_id === plan.id)
      .sort((a, b) => Number(a.priority ?? 9999) - Number(b.priority ?? 9999)),
  }));

  const validDates = validRows
    .map((row) => row.operation_date)
    .filter((value): value is string => Boolean(value))
    .sort();

  const drillingRows = (drilling.data || []) as DrillingRow[];
  const drillingDates = drillingRows
    .map((row) => row.operation_date)
    .filter((value): value is string => Boolean(value))
    .sort();
  const drillingMeters = drillingRows.reduce((sum, row) => sum + Number(row.drilled_meters || 0), 0);
  const drillingHoles = new Set(drillingRows.map((row) => row.hole_code_raw).filter(Boolean)).size;

  return NextResponse.json({
    provenance: 'La Patagua',
    chronology: 'newest_first',
    headGradeSummary: {
      validRecords: validRows.length,
      reviewRecords: reviewRows.length,
      firstDate: validDates[0] || null,
      lastDate: validDates[validDates.length - 1] || null,
      months: headGradeHistory.length,
      latestMonth: headGradeHistory[0]?.month || null,
      latestAvgHeadGradePct: headGradeHistory[0]?.avgHeadGradePct ?? null,
    },
    drillingSummary: {
      reportRows: drillingRows.length,
      holes: drillingHoles,
      drilledMeters: drillingMeters,
      firstDate: drillingDates[0] || null,
      lastDate: drillingDates[drillingDates.length - 1] || null,
      source: 'production_drilling_source_reports',
    },
    headGradeHistory,
    minePlans,
  });
}
