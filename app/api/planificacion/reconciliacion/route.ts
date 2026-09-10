export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';
import { getSupabaseServerClient } from '@/lib/supabase-server';

const REVIEWABLE_STATUSES = new Set(['unmatched', 'ambiguous', 'review_required']);

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_OPERACIONES);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const [rowsResult, assetsResult, countsResult] = await Promise.all([
      context.supabase
        .from('planning_maintenance_source_rows')
        .select('id,source_row,mine_raw,asset_name_raw,meter_unit,interval_mp,last_mp,initial_reading_at,initial_reading,current_reading_at,current_reading,criticality_raw,programming_status_raw,responsible_raw,parts_status_raw,observations,reconciliation_status,reconciliation_notes')
        .eq('organization_id', context.organizationId)
        .in('reconciliation_status', ['unmatched', 'ambiguous', 'review_required'])
        .order('source_row', { ascending: true })
        .limit(250),
      context.supabase
        .from('maintenance_canonical_assets_v1')
        .select('id,asset_code,name,asset_type')
        .eq('organization_id', context.organizationId)
        .order('asset_code', { ascending: true })
        .limit(5000),
      context.supabase
        .from('planning_maintenance_source_rows')
        .select('reconciliation_status')
        .eq('organization_id', context.organizationId),
    ]);

    const error = rowsResult.error || assetsResult.error || countsResult.error;
    if (error) throw error;

    const counts = (countsResult.data || []).reduce<Record<string, number>>((acc, row: any) => {
      const key = row.reconciliation_status || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      rows: rowsResult.data || [],
      assets: (assetsResult.data || []).map((asset: any) => ({ ...asset, location: null })),
      counts,
      canReview: access.canWrite,
      semantics: {
        authority: 'Ariel, como planificador con permiso de edición, puede aclarar y confirmar identidades. La reconciliación manual no modifica el activo canónico ni inventa datos operacionales.',
        source: 'nuevo_maestro_v11_dj09sep.xlsx preservado como evidencia de Ariel López.',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo cargar la cola de reconciliación' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_OPERACIONES, true);
  if (!access.authorized) return access.response;

  try {
    const body = await request.json();
    const rowId = String(body?.rowId || '').trim();
    const canonicalAssetId = String(body?.canonicalAssetId || '').trim();
    const note = String(body?.note || '').trim();

    if (!rowId || !canonicalAssetId) {
      return NextResponse.json({ error: 'Fila y activo canónico son obligatorios' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient(access.user.id);

    const [{ data: row, error: rowError }, { data: asset, error: assetError }] = await Promise.all([
      supabase
        .from('planning_maintenance_source_rows')
        .select('id,organization_id,import_id,source_row,asset_name_raw,meter_unit,initial_reading_at,initial_reading,current_reading_at,current_reading,reconciliation_status')
        .eq('id', rowId)
        .eq('organization_id', access.organizationId)
        .maybeSingle(),
      supabase
        .from('maintenance_canonical_assets_v1')
        .select('id,asset_code,name')
        .eq('id', canonicalAssetId)
        .eq('organization_id', access.organizationId)
        .maybeSingle(),
    ]);

    if (rowError || assetError) throw rowError || assetError;
    if (!row) return NextResponse.json({ error: 'Fila de origen no encontrada' }, { status: 404 });
    if (!asset) return NextResponse.json({ error: 'Activo canónico no encontrado en la organización' }, { status: 404 });
    if (!REVIEWABLE_STATUSES.has(row.reconciliation_status)) {
      return NextResponse.json({ error: 'La fila ya fue reconciliada y no se modifica desde este flujo' }, { status: 409 });
    }

    const reviewedAt = new Date().toISOString();
    const reconciliationNotes = note || `Reconciliación manual confirmada por planificador: ${row.asset_name_raw} → ${asset.asset_code} · ${asset.name}`;

    const { error: updateError } = await supabase
      .from('planning_maintenance_source_rows')
      .update({
        canonical_asset_id: canonicalAssetId,
        reconciliation_status: 'matched',
        match_method: 'manual_planner_review',
        match_score: 1,
        reconciliation_notes: reconciliationNotes,
        reconciliation_reviewed_by: access.user.id,
        reconciliation_reviewed_at: reviewedAt,
        updated_at: reviewedAt,
      })
      .eq('id', rowId)
      .eq('organization_id', access.organizationId)
      .in('reconciliation_status', ['unmatched', 'ambiguous', 'review_required']);
    if (updateError) throw updateError;

    const unit = String(row.meter_unit || '').trim().toLowerCase();
    if (unit === 'h' || unit === 'km') {
      const candidates = [
        row.initial_reading_at && row.initial_reading != null
          ? { recorded_at: row.initial_reading_at, meter_value: row.initial_reading, source_kind: 'workbook_initial' }
          : null,
        row.current_reading_at && row.current_reading != null
          ? { recorded_at: row.current_reading_at, meter_value: row.current_reading, source_kind: 'workbook_current' }
          : null,
      ].filter(Boolean) as Array<{ recorded_at: string; meter_value: number; source_kind: string }>;

      for (const candidate of candidates) {
        const { error: readingError } = await supabase
          .from('planning_asset_meter_readings')
          .upsert({
            organization_id: access.organizationId,
            canonical_asset_id: canonicalAssetId,
            recorded_at: candidate.recorded_at,
            meter_value: candidate.meter_value,
            meter_unit: unit,
            source_import_id: row.import_id,
            source_row_id: row.id,
            source_kind: candidate.source_kind,
            source_reference: `Programa Maestro · fila ${row.source_row}`,
          }, {
            onConflict: 'organization_id,canonical_asset_id,recorded_at,meter_unit,source_kind,source_row_id',
            ignoreDuplicates: true,
          });
        if (readingError) throw readingError;
      }
    }

    return NextResponse.json({
      ok: true,
      rowId,
      canonicalAssetId,
      asset: { id: asset.id, asset_code: asset.asset_code, name: asset.name },
      reviewedAt,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo reconciliar la fila' }, { status: 500 });
  }
}
