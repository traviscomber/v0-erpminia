import { classifyIntervalEvidence } from '@/lib/geology-ai/interval-evidence-classifier';

type SupabaseClientLike = any;

type SourceStatus = 'exact_source_clues' | 'historical_source_clues' | 'lineage_gap';

type RecoveryExample = {
  hole_code: string | null;
  source_reference: string;
  evidence_text?: string | null;
};

type RecoverySource = {
  category: string;
  label: string;
  status: SourceStatus;
  candidate_holes: number;
  evidence_rows: number;
  gap_holes?: number;
  source_files: string[];
  source_authority: string;
  recovery_action: string;
  examples: RecoveryExample[];
};

const unique = (values: Array<string | null | undefined>) => [...new Set(values.filter(Boolean).map(String))];

const parseSourceFiles = (values: Array<string | null | undefined>) => {
  const files = values.flatMap((value) => String(value || '').split('|'))
    .map((value) => value.trim())
    .filter((value) => /^[^()]*\.(xlsx|xlsm|xls|csv|tsv|dwg|dxf|kmz|kml)\b/i.test(value))
    .map((value) => value.replace(/\s+row\s+\d+.*$/i, '').trim());
  return unique(files).slice(0, 6);
};

export async function buildEvidenceRecoveryLocator(args: { supabase: SupabaseClientLike; organizationId: string }) {
  const { supabase, organizationId } = args;

  const [topography, survey, topographyGap, holeContext, intervals, chemistry] = await Promise.all([
    supabase
      .from('production_geology_topography_recovery_v1')
      .select('drill_hole_id,hole_code,topography_evidence_rows,source_refs,latest_evidence_text,recovery_action')
      .eq('organization_id', organizationId)
      .order('topography_evidence_rows', { ascending: false }),
    supabase
      .from('production_geology_survey_recovery_v1')
      .select('drill_hole_id,hole_code,survey_evidence_rows,source_refs,latest_evidence_text,recovery_action')
      .eq('organization_id', organizationId)
      .order('survey_evidence_rows', { ascending: false }),
    supabase
      .from('production_geology_topography_source_gap_2026_v1')
      .select('drill_hole_id,hole_code,source_report_ids,source_gap_class,required_source_action')
      .eq('organization_id', organizationId),
    supabase
      .from('production_geology_hole_context_v2')
      .select('drill_hole_id,hole_code,interval_count,lithology_span_count,structure_span_count,source_reference')
      .eq('organization_id', organizationId),
    supabase
      .from('production_drill_intervals')
      .select('drill_hole_id,notes,lithology,mineralization,operational_result')
      .eq('organization_id', organizationId),
    supabase
      .from('production_chemistry_lineage_v1')
      .select('sample_code,drill_hole_id,source_file,source_sheet,source_row,lineage_status')
      .eq('organization_id', organizationId),
  ]);

  const error = topography.error || survey.error || topographyGap.error || holeContext.error || intervals.error || chemistry.error;
  if (error) throw new Error(error.message || 'No fue posible localizar fuentes de recuperación');

  const topographyRows = topography.data || [];
  const surveyRows = survey.data || [];
  const topographyGapRows = topographyGap.data || [];
  const contextRows = holeContext.data || [];
  const intervalRows = intervals.data || [];
  const chemistryRows = chemistry.data || [];

  const holeCodeById = new Map(contextRows.map((row: any) => [row.drill_hole_id, row.hole_code]));
  const formalLoggingRows = intervalRows.filter((row: any) => classifyIntervalEvidence(row.notes) === 'explicit_formal_logging');
  const operationalIntervalRows = intervalRows.filter((row: any) => classifyIntervalEvidence(row.notes) === 'operational_source_interval');
  const structuralClues = contextRows.filter((row: any) => Number(row.structure_span_count || 0) > 0);
  const linkedChemistry = chemistryRows.filter((row: any) => Boolean(row.drill_hole_id));

  const sources: RecoverySource[] = [
    {
      category: 'collar_geometry',
      label: 'Collar XY / CRS',
      status: topographyRows.length ? 'exact_source_clues' : 'lineage_gap',
      candidate_holes: new Set(topographyRows.map((row: any) => row.drill_hole_id).filter(Boolean)).size,
      evidence_rows: topographyRows.reduce((sum: number, row: any) => sum + Number(row.topography_evidence_rows || 0), 0),
      gap_holes: new Set(topographyGapRows.map((row: any) => row.drill_hole_id).filter(Boolean)).size,
      source_files: parseSourceFiles(topographyRows.map((row: any) => row.source_refs)),
      source_authority: 'Las filas históricas prueban que Topografía intervino o intentó medir. No contienen por sí mismas coordenadas canónicas.',
      recovery_action: 'Abrir las filas fuente indicadas y recuperar el levantamiento/exportación topográfica original con XY, elevación y CRS. No convertir texto narrativo en coordenadas.',
      examples: topographyRows.slice(0, 5).map((row: any) => ({
        hole_code: row.hole_code || null,
        source_reference: String(row.source_refs || ''),
        evidence_text: row.latest_evidence_text || null,
      })),
    },
    {
      category: 'drill_orientation',
      label: 'Orientación / survey downhole',
      status: surveyRows.length ? 'exact_source_clues' : 'lineage_gap',
      candidate_holes: new Set(surveyRows.map((row: any) => row.drill_hole_id).filter(Boolean)).size,
      evidence_rows: surveyRows.reduce((sum: number, row: any) => sum + Number(row.survey_evidence_rows || 0), 0),
      source_files: parseSourceFiles(surveyRows.map((row: any) => row.source_refs)),
      source_authority: 'La evidencia histórica confirma mediciones o intentos de medición; no reemplaza estaciones numéricas depth/azimuth/dip.',
      recovery_action: 'Usar las referencias para localizar la planilla o exportación numérica del survey y validar estaciones antes de materializarlas.',
      examples: surveyRows.slice(0, 5).map((row: any) => ({
        hole_code: row.hole_code || null,
        source_reference: String(row.source_refs || ''),
        evidence_text: row.latest_evidence_text || null,
      })),
    },
    {
      category: 'geological_logging',
      label: 'Logging geológico formal',
      status: formalLoggingRows.length ? 'exact_source_clues' : 'lineage_gap',
      candidate_holes: new Set(formalLoggingRows.map((row: any) => row.drill_hole_id).filter(Boolean)).size,
      evidence_rows: formalLoggingRows.length,
      source_files: parseSourceFiles(formalLoggingRows.map((row: any) => row.notes)),
      source_authority: formalLoggingRows.length
        ? 'Sólo se cuentan intervalos cuya procedencia está explícitamente identificada como logging geológico formal. No se mezclan con observaciones operacionales.'
        : 'No hay intervalos cuya procedencia esté explícitamente identificada como logging geológico formal. Las observaciones operacionales existentes no cierran esta brecha.',
      recovery_action: formalLoggingRows.length
        ? 'Revisar trazabilidad, columnas y validación del geólogo antes de usar estos intervalos como logging formal.'
        : 'Solicitar la fuente original de logging por sondaje e intervalo. Debe preservar hole_code, from/to y los atributos realmente registrados —litología, alteración, mineralización, estructuras, recuperación/RQD y muestra sólo cuando existan— junto con archivo/hoja/fila o identificador fuente. El geólogo valida antes de materializar.',
      examples: formalLoggingRows.slice(0, 5).map((row: any) => ({
        hole_code: holeCodeById.get(row.drill_hole_id) || null,
        source_reference: String(row.notes || 'logging formal sin referencia textual'),
      })),
    },
    {
      category: 'operational_interval_evidence',
      label: 'Intervalos operacionales existentes',
      status: operationalIntervalRows.length ? 'historical_source_clues' : 'lineage_gap',
      candidate_holes: new Set(operationalIntervalRows.map((row: any) => row.drill_hole_id).filter(Boolean)).size,
      evidence_rows: operationalIntervalRows.length,
      source_files: parseSourceFiles(operationalIntervalRows.map((row: any) => row.notes)),
      source_authority: 'Son tramos estructurados desde reportes de perforación u observaciones operacionales. Pueden contener litología o mineralización visual, pero no equivalen a logging geológico formal, RQD, recuperación, alteración validada, muestreo ni contacto geológico cerrado.',
      recovery_action: 'Usarlos como pista para localizar el registro fuente correspondiente y contrastarlo con el logging original. No promover estos tramos a logging formal por similitud de profundidad o descripción.',
      examples: operationalIntervalRows.slice(0, 5).map((row: any) => ({
        hole_code: holeCodeById.get(row.drill_hole_id) || null,
        source_reference: String(row.notes || 'intervalo operacional sin referencia textual'),
        evidence_text: [row.lithology, row.mineralization, row.operational_result].filter(Boolean).join(' · ') || null,
      })),
    },
    {
      category: 'structural_orientation',
      label: 'Evidencia estructural',
      status: structuralClues.length ? 'historical_source_clues' : 'lineage_gap',
      candidate_holes: new Set(structuralClues.map((row: any) => row.drill_hole_id).filter(Boolean)).size,
      evidence_rows: structuralClues.reduce((sum: number, row: any) => sum + Number(row.structure_span_count || 0), 0),
      source_files: parseSourceFiles(structuralClues.map((row: any) => row.source_reference)),
      source_authority: 'Las menciones estructurales son evidencia narrativa/operacional; no equivalen a orientación estructural medida.',
      recovery_action: 'Localizar mediciones estructurales originales o logging orientado. Sin rumbo/buzamiento u otra medición explícita, mantener la estructura como observación no orientada.',
      examples: structuralClues.slice(0, 5).map((row: any) => ({
        hole_code: row.hole_code || null,
        source_reference: String(row.source_reference || ''),
      })),
    },
    {
      category: 'assays',
      label: 'Ensayes vinculados al sondaje',
      status: linkedChemistry.length ? 'exact_source_clues' : 'lineage_gap',
      candidate_holes: new Set(linkedChemistry.map((row: any) => row.drill_hole_id).filter(Boolean)).size,
      evidence_rows: chemistryRows.length,
      source_files: unique(chemistryRows.map((row: any) => row.source_file && row.source_sheet ? `${row.source_file}/${row.source_sheet}` : row.source_file)).slice(0, 6),
      source_authority: linkedChemistry.length
        ? 'Existen muestras químicas con vínculo explícito a sondaje; todavía se debe validar el intervalo antes de usarlas para interpretación local.'
        : 'Existe química canónica, pero actualmente no tiene drill_hole_id enlazado. No puede presentarse como ensaye de un sondaje específico.',
      recovery_action: linkedChemistry.length
        ? 'Revisar sample_code, profundidad y fuente antes de cruzar el resultado con un patrón observado.'
        : 'Recuperar la relación explícita muestra → sondaje → intervalo desde la fuente original. No inferirla sólo por sector, fecha o similitud de código.',
      examples: chemistryRows.slice(0, 5).map((row: any) => ({
        hole_code: null,
        source_reference: `${row.source_file || 'fuente química'}${row.source_sheet ? `/${row.source_sheet}` : ''}${row.source_row ? ` row ${row.source_row}` : ''} · ${row.sample_code || 'muestra sin código'}`,
      })),
    },
  ];

  return {
    semantics: 'Este mapa localiza fuentes candidatas para recuperar evidencia faltante. Una pista de fuente no materializa hechos geológicos y una fuente sin linaje explícito no se asigna a un sondaje. Logging formal y evidencia operacional permanecen separados.',
    sources,
    summary: {
      topography_candidate_holes: sources[0].candidate_holes,
      survey_candidate_holes: sources[1].candidate_holes,
      formal_logging_holes: sources[2].candidate_holes,
      operational_interval_holes: sources[3].candidate_holes,
      logging_clue_holes: sources[3].candidate_holes,
      structural_clue_holes: sources[4].candidate_holes,
      chemistry_rows: chemistryRows.length,
      chemistry_linked_holes: sources[5].candidate_holes,
    },
  };
}
