type SupabaseClientLike = any;

export type RecoveryCategory = 'collar_geometry' | 'drill_orientation' | 'geological_logging' | 'structural_orientation' | 'assays';

const ALLOWED_CATEGORIES = new Set<RecoveryCategory>([
  'collar_geometry',
  'drill_orientation',
  'geological_logging',
  'structural_orientation',
  'assays',
]);

export function parseRecoveryCategory(value: string | null): RecoveryCategory {
  return ALLOWED_CATEGORIES.has(value as RecoveryCategory) ? value as RecoveryCategory : 'collar_geometry';
}

const physicalSource = (value: string | null | undefined) => {
  const segment = String(value || '').split('|')
    .map((item) => item.trim())
    .find((item) => /\.(xlsx|xlsm|xls|csv|tsv|dwg|dxf|kmz|kml)\b/i.test(item));
  return segment?.replace(/\s+row\s+\d+.*$/i, '').trim() || null;
};

export async function buildEvidenceRecoveryWorklist(args: {
  supabase: SupabaseClientLike;
  organizationId: string;
  category: RecoveryCategory;
}) {
  const { supabase, organizationId, category } = args;

  if (category === 'collar_geometry') {
    const result = await supabase
      .from('production_geology_topography_recovery_v1')
      .select('drill_hole_id,hole_code,mine_name,sector_name,first_evidence_date,last_evidence_date,topography_evidence_rows,source_refs,latest_evidence_text,collar_state,recovery_action')
      .eq('organization_id', organizationId)
      .order('topography_evidence_rows', { ascending: false })
      .order('last_evidence_date', { ascending: false, nullsFirst: false })
      .limit(100);
    if (result.error) throw new Error(result.error.message);
    return {
      category,
      semantics: 'Filas donde existe evidencia histórica explícita de intervención topográfica. La referencia ayuda a recuperar el levantamiento original; no autoriza a derivar XY/CRS desde narrativa.',
      rows: (result.data || []).map((row: any) => ({
        drill_hole_id: row.drill_hole_id,
        hole_code: row.hole_code,
        mine_name: row.mine_name,
        sector_name: row.sector_name,
        evidence_date: row.last_evidence_date,
        evidence_rows: Number(row.topography_evidence_rows || 0),
        source_reference: row.source_refs,
        source_file: physicalSource(row.source_refs),
        evidence_text: row.latest_evidence_text,
        state: row.collar_state,
        next_action: row.recovery_action || 'Recuperar coordenadas y CRS desde la fuente topográfica original.',
      })),
    };
  }

  if (category === 'drill_orientation') {
    const result = await supabase
      .from('production_geology_survey_recovery_v1')
      .select('drill_hole_id,hole_code,mine_name,sector_name,first_evidence_date,last_evidence_date,survey_evidence_rows,source_refs,latest_evidence_text,orientation_state,recovery_action')
      .eq('organization_id', organizationId)
      .order('survey_evidence_rows', { ascending: false })
      .order('last_evidence_date', { ascending: false, nullsFirst: false })
      .limit(100);
    if (result.error) throw new Error(result.error.message);
    return {
      category,
      semantics: 'Filas donde el reporte declara medición de pozo, desviación o survey. Se requiere recuperar estaciones numéricas depth/azimuth/dip antes de tratar la orientación como completa.',
      rows: (result.data || []).map((row: any) => ({
        drill_hole_id: row.drill_hole_id,
        hole_code: row.hole_code,
        mine_name: row.mine_name,
        sector_name: row.sector_name,
        evidence_date: row.last_evidence_date,
        evidence_rows: Number(row.survey_evidence_rows || 0),
        source_reference: row.source_refs,
        source_file: physicalSource(row.source_refs),
        evidence_text: row.latest_evidence_text,
        state: row.orientation_state,
        next_action: row.recovery_action || 'Recuperar las estaciones numéricas del survey original.',
      })),
    };
  }

  if (category === 'geological_logging' || category === 'structural_orientation') {
    const field = category === 'geological_logging' ? 'lithology_span_count' : 'structure_span_count';
    let query = supabase
      .from('production_geology_hole_context_v2')
      .select('drill_hole_id,hole_code,mine_name,sector_name,interval_count,lithology_span_count,structure_span_count,first_span_date,last_span_date,source_reference')
      .eq('organization_id', organizationId)
      .gt(field, 0)
      .order(field, { ascending: false })
      .limit(100);
    if (category === 'geological_logging') query = query.eq('interval_count', 0);
    const result = await query;
    if (result.error) throw new Error(result.error.message);
    return {
      category,
      semantics: category === 'geological_logging'
        ? 'Sondajes sin intervalos canónicos que sí contienen observaciones históricas con señal litológica. Son candidatos para revisar la fuente; no son logging materializado.'
        : 'Sondajes con observaciones históricas estructurales. La mención de una falla, fractura o estructura no equivale a una medición orientada.',
      rows: (result.data || []).map((row: any) => ({
        drill_hole_id: row.drill_hole_id,
        hole_code: row.hole_code,
        mine_name: row.mine_name,
        sector_name: row.sector_name,
        evidence_date: row.last_span_date,
        evidence_rows: Number(row[field] || 0),
        source_reference: row.source_reference,
        source_file: physicalSource(row.source_reference),
        evidence_text: null,
        state: category === 'geological_logging' ? 'historical_lithology_clue_not_structured' : 'historical_structure_clue_not_oriented',
        next_action: category === 'geological_logging'
          ? 'Abrir la fuente y estructurar sólo intervalos con límites from/to explícitos; validar con geólogo.'
          : 'Buscar logging orientado o medición estructural original; mantener la observación como no orientada mientras falte medición.',
      })),
    };
  }

  const result = await supabase
    .from('production_chemistry_lineage_v1')
    .select('sample_id,sample_code,sample_type,sample_date,drill_hole_id,source_file,source_sheet,source_row,validation_status,lineage_status')
    .eq('organization_id', organizationId)
    .order('sample_date', { ascending: false, nullsFirst: false })
    .limit(100);
  if (result.error) throw new Error(result.error.message);
  return {
    category,
    semantics: 'Muestras químicas con linaje de archivo. Si drill_hole_id está vacío, no existe todavía evidencia suficiente para atribuir la muestra a un sondaje o intervalo específico.',
    rows: (result.data || []).map((row: any) => ({
      drill_hole_id: row.drill_hole_id,
      hole_code: null,
      mine_name: null,
      sector_name: null,
      evidence_date: row.sample_date,
      evidence_rows: 1,
      source_reference: `${row.source_file || 'fuente química'}${row.source_sheet ? `/${row.source_sheet}` : ''}${row.source_row ? ` row ${row.source_row}` : ''}`,
      source_file: row.source_file && row.source_sheet ? `${row.source_file}/${row.source_sheet}` : row.source_file,
      evidence_text: row.sample_code,
      state: row.drill_hole_id ? 'explicit_hole_link_requires_interval_validation' : 'sample_to_hole_lineage_gap',
      next_action: row.drill_hole_id
        ? 'Validar profundidad/intervalo y resultado antes de cruzar con interpretación geológica.'
        : 'Recuperar relación explícita muestra → sondaje → intervalo desde la fuente original; no inferir por sector, fecha ni similitud de código.',
    })),
  };
}
