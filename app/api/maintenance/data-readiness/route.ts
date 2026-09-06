export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

const present = (value: unknown) => value !== null && value !== undefined && String(value).trim() !== '';

const LABELS = {
  asset_type: 'Tipo de activo',
  criticality: 'Criticidad',
  operational_status: 'Estado operacional',
  location: 'Ubicación',
  manufacturer: 'Fabricante',
  model: 'Modelo',
  serial_number: 'Serie',
  cost_center_code: 'Centro de costo',
} as const;

const ESSENTIAL_FIELDS = ['asset_type', 'criticality', 'operational_status'] as const;

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_OPERACIONES);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { data, error } = await context.supabase
      .from('canonical_assets_current')
      .select('id,asset_code,name,asset_type,criticality,operational_status,location,manufacturer,model,serial_number,cost_center_code,validation_status,source_file,source_sheet,source_row')
      .eq('organization_id', context.organizationId)
      .order('asset_code', { ascending: true });
    if (error) throw error;

    const rows = (data || []).map((asset: any) => {
      const fieldEntries = Object.entries(LABELS) as Array<[keyof typeof LABELS, string]>;
      const missing = fieldEntries.filter(([field]) => !present(asset[field])).map(([, label]) => label);
      const essentialMissing = ESSENTIAL_FIELDS.filter((field) => !present(asset[field])).map((field) => LABELS[field]);
      const readiness = essentialMissing.length > 0 ? 'needs_validation' : missing.length > 0 ? 'usable' : 'complete';
      return {
        id: asset.id,
        asset_code: asset.asset_code,
        name: asset.name,
        readiness,
        missing,
        essential_missing: essentialMissing,
        validation_status: asset.validation_status || null,
        source_ref: [asset.source_file, asset.source_sheet, asset.source_row].filter((value) => present(value)).join(' · ') || null,
      };
    });

    const countMissing = (label: string) => rows.filter((row) => row.missing.includes(label)).length;
    return NextResponse.json({
      summary: {
        total: rows.length,
        complete: rows.filter((row) => row.readiness === 'complete').length,
        usable: rows.filter((row) => row.readiness === 'usable').length,
        needs_validation: rows.filter((row) => row.readiness === 'needs_validation').length,
        missing_asset_type: countMissing(LABELS.asset_type),
        missing_criticality: countMissing(LABELS.criticality),
        missing_operational_status: countMissing(LABELS.operational_status),
        missing_location: countMissing(LABELS.location),
      },
      rows: rows.filter((row) => row.readiness !== 'complete'),
      semantics: 'Completitud canónica describe campos materializados. Un campo vacío no autoriza a MOTIL a inferirlo automáticamente.',
      policy: 'Tipo, criticidad y estado operacional requieren evidencia o validación humana antes de usarse para priorización avanzada.',
      source: 'canonical_assets_current',
      canEdit: access.canWrite,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo evaluar la completitud canónica de activos' }, { status: 500 });
  }
}
