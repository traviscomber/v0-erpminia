import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { getExpedientDefinition } from '@/lib/maintenance/expedient-catalog';

export const dynamic = 'force-dynamic';

type PersistedExpedientRow = {
  id: string;
  organization_id: string;
  expedient_key: string;
  asset_label: string;
  asset_location: string | null;
  source_filename: string;
  record_date: string;
  title: string;
  kind: string;
  canonical_section: string;
  summary: string;
  cause: string | null;
  solution: string | null;
  components: string[] | null;
  extracted_data: Record<string, unknown> | null;
  source_index: number | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

function buildSummary(definitionTitle: string, assetLocation: string, records: PersistedExpedientRow[]) {
  const categories = {
    ot_historica: records.filter((item) => item.canonical_section === 'ot_historica').length,
    arbol_fallas: records.filter((item) => item.canonical_section === 'arbol_fallas').length,
    componentes: records.filter((item) => item.canonical_section === 'componentes').length,
  };

  return {
    asset: definitionTitle,
    location: assetLocation,
    records: records.length,
    categories,
  };
}

function normalizeRow(row: PersistedExpedientRow) {
  return {
    id: row.id,
    source: row.source_filename,
    date: row.record_date,
    title: row.title,
    kind: row.kind,
    canonicalSection: row.canonical_section,
    summary: row.summary,
    cause: row.cause || undefined,
    solution: row.solution || undefined,
    components: Array.isArray(row.components) ? row.components : [],
    extractedData: row.extracted_data || {},
  };
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const searchParams = request.nextUrl.searchParams;
    const expedientKey = searchParams.get('expedientKey');

    if (!expedientKey) {
      return NextResponse.json({ records: [], summary: null }, { status: 400 });
    }

    const definition = getExpedientDefinition(expedientKey);
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from('maintenance_expedient_records')
      .select('*')
      .eq('organization_id', context.organizationId)
      .eq('expedient_key', expedientKey)
      .eq('is_active', true)
      .order('record_date', { ascending: true })
      .order('source_index', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message, records: [] }, { status: 500 });
    }

    const records = (Array.isArray(data) ? (data as PersistedExpedientRow[]) : []).map(normalizeRow);
    const summary = buildSummary(
      definition?.title || expedientKey,
      definition?.location || '',
      Array.isArray(data) ? (data as PersistedExpedientRow[]) : []
    );

    return NextResponse.json({
      expedientKey,
      definition,
      summary,
      records,
      persisted: records.length > 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No fue posible cargar el expediente';
    return NextResponse.json({ error: message, records: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const body = await request.json().catch(() => ({}));
    const expedientKey = String(body?.expedientKey || '').trim();
    const replace = body?.replace !== false;
    const rawRecords = Array.isArray(body?.records) ? body.records : null;

    if (!expedientKey) {
      return NextResponse.json({ error: 'expedientKey es requerido' }, { status: 400 });
    }

    const definition = getExpedientDefinition(expedientKey);
    const records = rawRecords && rawRecords.length > 0 ? rawRecords : definition?.records || [];

    if (!definition && (!rawRecords || rawRecords.length === 0)) {
      return NextResponse.json({ error: 'No existe un lote conocido para este expediente' }, { status: 404 });
    }

    const supabase = getSupabaseServerClient();

    if (replace) {
      const { error: deleteError } = await supabase
        .from('maintenance_expedient_records')
        .delete()
        .eq('organization_id', context.organizationId)
        .eq('expedient_key', expedientKey);

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }
    }

    const rows = records.map((record: any, index: number) => ({
      organization_id: context.organizationId,
      expedient_key: expedientKey,
      asset_label: definition?.assetLabel || String(body?.assetLabel || expedientKey),
      asset_location: definition?.location || String(body?.assetLocation || '') || null,
      source_filename: String(record.source || record.source_filename || `record-${index + 1}`),
      record_date: String(record.date || record.record_date || ''),
      title: String(record.title || ''),
      kind: String(record.kind || 'observacion'),
      canonical_section: String(record.canonicalSection || record.canonical_section || 'pendiente_clasificar'),
      summary: String(record.summary || ''),
      cause: record.cause || null,
      solution: record.solution || null,
      components: Array.isArray(record.components) ? record.components : [],
      extracted_data: record.extractedData || record.extracted_data || {},
      source_index: index,
      is_active: true,
    }));

    const { data, error } = await supabase
      .from('maintenance_expedient_records')
      .insert(rows)
      .select('*');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      expedientKey,
      inserted: Array.isArray(data) ? data.length : 0,
      records: Array.isArray(data) ? data.map(normalizeRow) : [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No fue posible guardar el expediente';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
