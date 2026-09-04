type SupabaseClientLike = any;

const n = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export async function buildCanonicalGeologyContext(args: {
  supabase: SupabaseClientLike;
  organizationId: string;
}) {
  const { supabase, organizationId } = args;

  const [mines, sectors, drilling, holes, samples, results, plans, planLines, metallurgy] = await Promise.all([
    supabase.from('production_mine_sources').select('id,code,name,status').eq('organization_id', organizationId).order('name'),
    supabase.from('production_mine_sectors').select('id,mine_source_id,name,status').eq('organization_id', organizationId).order('name'),
    supabase.from('production_drilling_source_reports')
      .select('operation_date,hole_code_raw,mine_raw,sector_raw,drilled_meters,reconciliation_status,canonical_mine_source_id,canonical_mine_sector_id,canonical_drill_hole_id')
      .eq('organization_id', organizationId)
      .order('operation_date', { ascending: false })
      .order('source_row', { ascending: false })
      .limit(500),
    supabase.from('production_drill_holes')
      .select('id,hole_code,mine_source_id,mine_sector_id,drilled_depth_m,collar_easting,collar_northing,azimuth_deg,dip_deg,start_at,completed_at,status,geological_purpose,operational_purpose,source_reference')
      .eq('organization_id', organizationId)
      .order('start_at', { ascending: false, nullsFirst: false })
      .limit(500),
    supabase.from('production_chemistry_samples')
      .select('id,sample_code,sample_type,sample_date,mine_source_id,mine_sector_id,drill_hole_id,depth_from_m,depth_to_m,source_file,source_sheet,validation_status')
      .eq('organization_id', organizationId)
      .order('sample_date', { ascending: false })
      .limit(300),
    supabase.from('production_chemistry_results')
      .select('sample_id,analyte_code,analyte_name,result_value,result_unit,result_date,source_file,source_sheet,validation_status')
      .eq('organization_id', organizationId)
      .order('result_date', { ascending: false })
      .limit(500),
    supabase.from('production_monthly_plans')
      .select('id,plan_code,period_start,period_end,status,target_cu_grade_pct,planned_advance_m,planned_drilling_m,total_mineral_to_plant_tons,total_waste_tons,total_movement_tons')
      .eq('organization_id', organizationId)
      .order('period_start', { ascending: false })
      .limit(12),
    supabase.from('production_monthly_plan_lines')
      .select('id,plan_id,line_type,mine_name_raw,sector_raw,level_raw,section_raw,planned_tons,planned_grade_pct,planned_fine_cu,planned_advance_m,planned_drilling_m,source_reference,priority')
      .eq('organization_id', organizationId)
      .order('priority', { ascending: true })
      .limit(1000),
    supabase.from('production_metallurgy_automatic_v1')
      .select('operation_date,head_grade,source_file,source_sheet,validation_status')
      .eq('organization_id', organizationId)
      .order('operation_date', { ascending: false })
      .limit(6000),
  ]);

  const firstError = [mines, sectors, drilling, holes, samples, results, plans, planLines, metallurgy].find((item) => item.error)?.error;
  if (firstError) throw new Error(firstError.message || 'No fue posible construir contexto canónico');

  const mineRows = mines.data || [];
  const sectorRows = sectors.data || [];
  const drillingRows = drilling.data || [];
  const holeRows = holes.data || [];
  const sampleRows = samples.data || [];
  const resultRows = results.data || [];
  const planRows = plans.data || [];
  const planLineRows = planLines.data || [];
  const metallurgyRows = metallurgy.data || [];

  const mineById = new Map(mineRows.map((row: any) => [row.id, row.name]));
  const sectorById = new Map(sectorRows.map((row: any) => [row.id, row.name]));
  const sampleById = new Map(sampleRows.map((row: any) => [row.id, row]));

  const validMetallurgy = metallurgyRows.filter((row: any) => String(row.validation_status || '').toLowerCase() === 'valid' && row.operation_date && n(row.head_grade) != null);
  const gradeMonths = new Map<string, { sum: number; count: number; min: number; max: number; sources: Set<string> }>();
  for (const row of validMetallurgy) {
    const month = String(row.operation_date).slice(0, 7);
    const value = Number(row.head_grade);
    const current = gradeMonths.get(month) || { sum: 0, count: 0, min: value, max: value, sources: new Set<string>() };
    current.sum += value;
    current.count += 1;
    current.min = Math.min(current.min, value);
    current.max = Math.max(current.max, value);
    if (row.source_file) current.sources.add(row.source_file);
    gradeMonths.set(month, current);
  }

  const headGradeHistory = [...gradeMonths.entries()]
    .map(([month, value]) => ({
      month,
      records: value.count,
      avg_head_grade_pct: value.count ? value.sum / value.count : null,
      min_head_grade_pct: value.min,
      max_head_grade_pct: value.max,
      source_files: [...value.sources].sort(),
    }))
    .sort((a, b) => b.month.localeCompare(a.month));

  const latestPlan = planRows[0] || null;
  const latestPlanLines = latestPlan
    ? planLineRows.filter((row: any) => row.plan_id === latestPlan.id).slice(0, 120)
    : [];

  const recentDrilling = drillingRows.slice(0, 120).map((row: any) => ({
    date: row.operation_date,
    hole: row.hole_code_raw,
    mine: row.canonical_mine_source_id ? mineById.get(row.canonical_mine_source_id) : row.mine_raw,
    sector: row.canonical_mine_sector_id ? sectorById.get(row.canonical_mine_sector_id) : row.sector_raw,
    drilled_m: n(row.drilled_meters),
    reconciliation_status: row.reconciliation_status,
    canonical_hole_linked: Boolean(row.canonical_drill_hole_id),
  }));

  const recentAssays = resultRows.slice(0, 120).map((row: any) => {
    const sample = sampleById.get(row.sample_id) as any;
    return {
      sample_code: sample?.sample_code || null,
      sample_date: sample?.sample_date || row.result_date || null,
      mine: sample?.mine_source_id ? mineById.get(sample.mine_source_id) : null,
      sector: sample?.mine_sector_id ? sectorById.get(sample.mine_sector_id) : null,
      drill_hole_id: sample?.drill_hole_id || null,
      depth_from_m: sample?.depth_from_m ?? null,
      depth_to_m: sample?.depth_to_m ?? null,
      analyte: row.analyte_name || row.analyte_code,
      value: n(row.result_value),
      unit: row.result_unit,
      validation_status: row.validation_status,
      source_file: row.source_file || sample?.source_file || null,
      source_sheet: row.source_sheet || sample?.source_sheet || null,
    };
  });

  const locatedHoles = holeRows.filter((row: any) => row.collar_easting != null && row.collar_northing != null).length;
  const orientedHoles = holeRows.filter((row: any) => row.azimuth_deg != null && row.dip_deg != null).length;
  const geologicalPurposeHoles = holeRows.filter((row: any) => String(row.geological_purpose || '').trim()).length;

  return {
    provenance: 'La Patagua canonical only',
    chronology: 'newest_first',
    sources: [
      'production_mine_sources',
      'production_mine_sectors',
      'production_drilling_source_reports',
      'production_drill_holes',
      'production_chemistry_samples',
      'production_chemistry_results',
      'production_monthly_plans',
      'production_monthly_plan_lines',
      'production_metallurgy_automatic_v1',
    ],
    current: {
      latest_plan: latestPlan ? { ...latestPlan, lines: latestPlanLines } : null,
      latest_head_grade: headGradeHistory[0] || null,
      latest_drilling: recentDrilling[0] || null,
    },
    coverage: {
      mines: mineRows.map((row: any) => ({ id: row.id, code: row.code, name: row.name, status: row.status })),
      sectors: sectorRows.map((row: any) => ({ id: row.id, mine_source_id: row.mine_source_id, name: row.name, status: row.status })),
      holes: holeRows.length,
      located_holes: locatedHoles,
      oriented_holes: orientedHoles,
      geological_purpose_holes: geologicalPurposeHoles,
      samples: sampleRows.length,
      assay_results: resultRows.length,
      note: 'Los conteos están limitados por las ventanas consultadas cuando corresponda; no inferir cobertura total fuera de los resúmenes explícitos.',
    },
    head_grade_history_recent: headGradeHistory.slice(0, 36),
    recent_drilling: recentDrilling,
    recent_assays: recentAssays,
    recent_holes: holeRows.slice(0, 120).map((row: any) => ({
      hole_code: row.hole_code,
      mine: row.mine_source_id ? mineById.get(row.mine_source_id) : null,
      sector: row.mine_sector_id ? sectorById.get(row.mine_sector_id) : null,
      drilled_depth_m: n(row.drilled_depth_m),
      collar_easting: n(row.collar_easting),
      collar_northing: n(row.collar_northing),
      azimuth_deg: n(row.azimuth_deg),
      dip_deg: n(row.dip_deg),
      start_at: row.start_at,
      completed_at: row.completed_at,
      status: row.status,
      geological_purpose: row.geological_purpose,
      operational_purpose: row.operational_purpose,
      source_reference: row.source_reference,
    })),
    evidence_gaps: {
      detailed_geological_intervals: 'production_drill_intervals no se incorpora como evidencia positiva salvo que existan filas; no inventar logging.',
      semantics: 'Ley cabeza, ley plan/ingeniería, ley geológica y ensayes son conceptos separados.',
    },
  };
}
