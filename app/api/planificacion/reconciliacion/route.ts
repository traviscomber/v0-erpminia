export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';
import { getSupabaseServerClient } from '@/lib/supabase-server';

const REVIEWABLE_STATUSES = new Set(['unmatched', 'ambiguous', 'needs_review', 'review_required']);
const ACTIVE_REVIEW_STATUSES = ['ambiguous', 'needs_review', 'review_required'];
const MISSING_ASSET_METHODS = new Set(['planner_declared_missing_asset', 'system_verified_missing_asset']);

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
        .in('reconciliation_status', ACTIVE_REVIEW_STATUSES)
        .order('source_row', { ascending: true })
        .limit(250),
      context.supabase
        .from('maintenance_canonical_assets_v1')
        .select('id,asset_code,name,asset_type,manufacturer,model,license_plate')
        .eq('organization_id', context.organizationId)
        .eq('is_active', true)
        .order('asset_code', { ascending: true })
        .limit(5000),
      context.supabase
        .from('planning_maintenance_source_rows')
        .select('reconciliation_status,match_method')
        .eq('organization_id', context.organizationId),
    ]);

    const error = rowsResult.error || assetsResult.error || countsResult.error;
    if (error) throw error;

    const allRows = countsResult.data || [];
    const counts = allRows.reduce<Record<string, number>>((acc, row: any) => {
      const key = row.reconciliation_status || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const missingAssets = allRows.filter((row: any) => MISSING_ASSET_METHODS.has(row.match_method)).length;
    const systemResolvedMissingAssets = allRows.filter((row: any) => row.match_method === 'system_verified_missing_asset').length;
    const plannerDeclaredMissingAssets = allRows.filter((row: any) => row.match_method === 'planner_declared_missing_asset').length;

    return NextResponse.json({
      rows: rowsResult.data || [],
      assets: (assetsResult.data || []).map((asset: any) => ({ ...asset, location: null })),
      counts,
      missingAssets,
      systemResolvedMissingAssets,
      plannerDeclaredMissingAssets,
      canReview: access.canWrite,
      semantics: {
        authority: 'MOTIL resuelve sólo los casos demostrables con el maestro canónico actual. Ariel recibe únicamente las identidades que siguen siendo ambiguas y mantiene la decisión final sobre esos casos.',
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
    const action = String(body?.action || 'match').trim();
    const canonicalAssetId = String(body?.canonicalAssetId || '').trim();
    const note = String(body?.note || '').trim();

    if (!rowId) return NextResponse.json({ error: 'La fila es obligatoria' }, { status: 400 });
    if (!['match', 'missing_asset'].includes(action)) {
      return NextResponse.json({ error: 'Acción de aclaración no válida' }, { status: 400 });
    }
    if (action === 'match' && !canonicalAssetId) {
      return NextResponse.json({ error: 'Selecciona el mismo equipo en MOTIL' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient(access.user.id);
    const { data: row, error: rowError } = await supabase
      .from('planning_maintenance_source_rows')
      .select('id,organization_id,import_id,source_row,asset_name_raw,meter_unit,initial_reading_at,initial_reading,current_reading_at,current_reading,reconciliation_status')
      .eq('id', rowId)
      .eq('organization_id', access.organizationId)
      .maybeSingle();

    if (rowError) throw rowError;
    if (!row) return NextResponse.json({ error: 'Fila de origen no encontrada' }, { status: 404 });
    if (!REVIEWABLE_STATUSES.has(row.reconciliation_status)) {
      return NextResponse.json({ error: 'La fila ya fue aclarada y no se modifica desde este flujo' }, { status: 409 });
    }

    const reviewedAt = new Date().toISOString();

    if (action === 'missing_asset') {
      const reconciliationNotes = note || `Ariel/planificador declaró que ${row.asset_name_raw} no tiene todavía un activo canónico identificable en MOTIL.`;
      const { error: updateError } = await supabase
        .from('planning_maintenance_source_rows')
        .update({
          canonical_asset_id: null,
          reconciliation_status: 'unmatched',
          match_method: 'planner_declared_missing_asset',
          match_score: null,
          reconciliation_notes: reconciliationNotes,
          reconciliation_reviewed_by: access.user.id,
          reconciliation_reviewed_at: reviewedAt,
          updated_at: reviewedAt,
        })
        .eq('id', rowId)
        .eq('organization_id', access.organizationId)
        .in('reconciliation_status', ['unmatched', 'ambiguous', 'needs_review', 'review_required']);
      if (updateError) throw updateError;

      return NextResponse.json({ ok: true, action: 'missing_asset', rowId, reviewedAt });
    }

    const { data: asset, error: assetError } = await supabase
      .from('maintenance_canonical_assets_v1')
      .select('id,asset_code,name')
      .eq('id', canonicalAssetId)
      .eq('organization_id', access.organizationId)
      .eq('is_active', true)
      .maybeSingle();
    if (assetError) throw assetError;
    if (!asset) return NextResponse.json({ error: 'Activo canónico no encontrado en la organización' }, { status: 404 });

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
      .in('reconciliation_status', ['unmatched', 'ambiguous', 'needs_review', 'review_required']);
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
      action: 'match',
      rowId,
      canonicalAssetId,
      asset: { id: asset.id, asset_code: asset.asset_code, name: asset.name },
      reviewedAt,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo guardar la aclaración' }, { status: 500 });
  }
}
