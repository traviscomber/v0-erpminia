type SupabaseClientLike = any;

function classify(notesValue: unknown) {
  const notes = String(notesValue || '').toLowerCase();
  if (/formal logging|geologist logging|logging geológico formal|validated geological logging/.test(notes)) return 'explicit_formal_logging' as const;
  if (/operational observation|operator observation|production_drilling_source_reports|derived only between two consecutive explicit depth transitions|canonical geology pass|exelito interval pass|geology evidence extraction/.test(notes)) return 'operational_source_interval' as const;
  return 'unclassified_interval' as const;
}

export async function buildIntervalEvidenceBoundary(args: { supabase: SupabaseClientLike; organizationId: string }) {
  const { data, error } = await args.supabase
    .from('production_drill_intervals')
    .select('id,notes,recovery_pct,rqd_pct,alteration,sample_code,assay_reference')
    .eq('organization_id', args.organizationId);
  if (error) throw new Error(error.message || 'No fue posible clasificar la procedencia de intervalos');

  const rows = data || [];
  const operational = rows.filter((row: any) => classify(row.notes) === 'operational_source_interval').length;
  const formal = rows.filter((row: any) => classify(row.notes) === 'explicit_formal_logging').length;
  const unclassified = rows.filter((row: any) => classify(row.notes) === 'unclassified_interval').length;
  const loggingAttributes = rows.filter((row: any) =>
    row.recovery_pct != null || row.rqd_pct != null || row.alteration != null || row.sample_code != null || row.assay_reference != null,
  ).length;

  return {
    source: 'production_drill_intervals',
    total_intervals: rows.length,
    operational_source_intervals: operational,
    explicit_formal_logging_intervals: formal,
    unclassified_intervals: unclassified,
    intervals_with_logging_or_sampling_attributes: loggingAttributes,
    semantics: 'Los intervalos operacionales estructurados desde reportes de perforación son evidencia fuente por profundidad. No equivalen a logging geológico formal, RQD, recuperación, alteración validada, muestreo ni contactos geológicos cerrados.',
    assistant_rule: formal === 0
      ? 'No afirmar que existe logging geológico formal disponible. Si una decisión requiere logging, pedir la fuente geológica original y validación del geólogo.'
      : 'Distinguir explícitamente logging formal de intervalos operacionales en toda respuesta.',
  };
}
