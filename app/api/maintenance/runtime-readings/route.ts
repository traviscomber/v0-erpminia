export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

const SOURCE_TYPES = new Set(['manual', 'import', 'telemetry']);

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_GERENCIAL);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const [summaryResult, readingsResult, assetsResult] = await Promise.all([
      context.supabase
        .from('maintenance_runtime_cost_intelligence_v1')
        .select('*')
        .eq('organization_id', context.organizationId)
        .order('reading_count', { ascending: false })
        .limit(200),
      context.supabase
        .from('asset_runtime_intervals_v1')
        .select('id,canonical_asset_id,meter_hours,recorded_at,source_type,source_reference,notes,previous_meter_hours,operating_hours_delta,reset_detected')
        .eq('organization_id', context.organizationId)
        .order('recorded_at', { ascending: false })
        .limit(200),
      context.supabase
        .from('maintenance_canonical_assets_v1')
        .select('id,asset_code,name')
        .eq('organization_id', context.organizationId)
        .order('asset_code', { ascending: true })
        .limit(5000),
    ]);

    const error = summaryResult.error || readingsResult.error || assetsResult.error;
    if (error) throw error;

    return NextResponse.json({
      assets: assetsResult.data || [],
      runtime: summaryResult.data || [],
      readings: readingsResult.data || [],
      canEdit: access.canWrite,
      source: 'asset_runtime_readings',
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudieron cargar los horómetros' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_OPERACIONES);
  if (!access.authorized) return access.response;
  if (!access.canWrite) return NextResponse.json({ error: 'Sin permiso de edición' }, { status: 403 });
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const body = await request.json();
    const canonicalAssetId = String(body?.canonicalAssetId || '').trim();
    const meterHours = Number(body?.meterHours);
    const recordedAt = String(body?.recordedAt || '').trim();
    const sourceType = String(body?.sourceType || 'manual').trim();
    const sourceReference = String(body?.sourceReference || '').trim() || null;
    const notes = String(body?.notes || '').trim() || null;

    if (!canonicalAssetId || !Number.isFinite(meterHours) || meterHours < 0 || !recordedAt || Number.isNaN(new Date(recordedAt).getTime()) || !SOURCE_TYPES.has(sourceType)) {
      return NextResponse.json({ error: 'Lectura de horómetro inválida' }, { status: 400 });
    }

    const { data: asset, error: assetError } = await context.supabase
      .from('maintenance_canonical_assets_v1')
      .select('id')
      .eq('organization_id', context.organizationId)
      .eq('id', canonicalAssetId)
      .maybeSingle();
    if (assetError) throw assetError;
    if (!asset) return NextResponse.json({ error: 'Activo no pertenece a la organización' }, { status: 404 });

    const { data: latest, error: latestError } = await context.supabase
      .from('asset_runtime_readings')
      .select('meter_hours,recorded_at')
      .eq('organization_id', context.organizationId)
      .eq('canonical_asset_id', canonicalAssetId)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestError) throw latestError;

    const { data, error } = await context.supabase
      .from('asset_runtime_readings')
      .insert({
        organization_id: context.organizationId,
        canonical_asset_id: canonicalAssetId,
        meter_hours: meterHours,
        recorded_at: new Date(recordedAt).toISOString(),
        source_type: sourceType,
        source_reference: sourceReference,
        notes,
        recorded_by: context.userId,
      })
      .select('id,canonical_asset_id,meter_hours,recorded_at,source_type,source_reference,notes')
      .single();
    if (error) throw error;

    return NextResponse.json({
      reading: data,
      resetDetected: Boolean(latest && meterHours < Number(latest.meter_hours)),
      previousMeterHours: latest?.meter_hours ?? null,
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo registrar el horómetro' }, { status: 500 });
  }
}
