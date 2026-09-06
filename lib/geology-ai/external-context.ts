type SupabaseClientLike = any;

const TRUSTED_STATUSES = new Set(['verified', 'validated', 'approved']);

export async function buildExternalGeologyContext(args: {
  supabase: SupabaseClientLike;
  organizationId: string;
}) {
  const { supabase, organizationId } = args;
  const { data, error } = await supabase
    .from('production_geology_external_context')
    .select('id,source_provider,source_dataset,source_record_key,record_type,title,status,valid_from,valid_to,geometry_geojson,properties,source_url,retrieved_at,validation_status,validation_notes')
    .eq('organization_id', organizationId)
    .order('retrieved_at', { ascending: false, nullsFirst: false })
    .limit(100);

  if (error) throw new Error(error.message || 'No fue posible cargar contexto geológico externo');

  const rows = (data || []).filter((row: any) => TRUSTED_STATUSES.has(String(row.validation_status || '').toLowerCase()));

  return {
    provenance: 'External geological context; never canonical La Patagua operational evidence',
    authority_boundary: 'Use only as regional/district context. It may support questions and comparisons but cannot prove a local lithology, structure, mineralized control, continuity, grade, domain, resource or reserve without La Patagua evidence and geologist validation.',
    records: rows.map((row: any) => ({
      id: row.id,
      provider: row.source_provider,
      dataset: row.source_dataset,
      source_record_key: row.source_record_key,
      type: row.record_type,
      title: row.title,
      status: row.status,
      valid_from: row.valid_from,
      valid_to: row.valid_to,
      geometry_geojson: row.geometry_geojson,
      facts: row.properties,
      source_url: row.source_url,
      retrieved_at: row.retrieved_at,
      validation_status: row.validation_status,
      validation_notes: row.validation_notes,
      interpretation_semantics: 'Regional/district context only; compatible observations are not confirmation of local geological control.',
    })),
    sources: rows.length ? ['production_geology_external_context'] : [],
    record_count: rows.length,
  };
}
