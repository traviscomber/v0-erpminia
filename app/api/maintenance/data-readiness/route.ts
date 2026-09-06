export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

const present = (value: unknown) => value !== null && value !== undefined && String(value).trim() !== '';

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_OPERACIONES);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { data, error } = await context.supabase
      .from('canonical_assets_current')
      .select('id,asset_code,name,asset_type,category,manufacturer,model,serial_number,cost_center_code,validation_status,location,operational_status,criticality,source_file,source_sheet,source_row')
      .eq('organization_id', context.organizationId)
      .order('asset_code', { ascending: true });
    if (error) throw error;

    const rows = (data || []).map((asset: any) => {
      const missing: string[] = [];
      if (!present(asset.asset_type)) missing.push('Tipo de activo');
      if (!present(asset.criticality)) missing.push('Criticidad');
      if (!present(asset.operational_status)) missing.push('Estado operacional');
      if (!present(asset.location)) missing.push('Ubicación');
      if (!present(asset.manufacturer)) missing.push('Fabricante');
      if (!present(asset.model)) missing.push('Modelo');
      if (!present(asset.serial_number)) missing.push('Serie');
      if (!present(asset.cost_center_code)) missing.push('Centro de costo');
      const essential = ['Tipo de activo','Criticidad','Estado operacional'];
      const essentialMissing = missing.filter((item) => essential.includes(item));
      const readiness = essentialMissing.length === 0 ? (missing.length === 0 ? 'complete' : 'usable') : 'needs_validation';
      return {
        id: asset.id,
        asset_code: asset.asset_code,
        name: asset.name,
        readiness,
        missing,
        essential_missing: essentialMissing,
        source_ref: [asset.source_file, asset.source_sheet, asset.source_row].filter(Boolean).join(' · ') || null,
        validation_status: asset.validation_status || null,
      };
    });

    const total = rows.length;
    const countMissing = (label: string) => rows.filter((row) => row.missing.includes(label)).length;
    return NextResponse.json({
      summary: {
        total,
        complete: rows.filter((row) => row.readiness === 'complete').length,
        usable: rows.filter((row) => row.readiness === 'usable').length,
        needs_validation: rows.filter((row) => row.readiness === 'needs_validation').length,
        missing_asset_type: countMissing('Tipo de activo'),
        missing_criticality: countMissing('Criticidad'),
        missing_operational_status: countMissing('Estado operacional'),
        missing_location: countMissing('Ubicación'),
      },
      rows: rows.filter((row) => row.readiness !== 'complete'),
      semantics: 'Completitud canónica describe campos materializados. Un campo vacío no autoriza a MOTIL a inferirlo automáticamente.',
      policy: 'La criticidad, el tipo y el estado operacional deben ser validados por una persona responsable antes de usarse para priorización avanzada.',
      canEdit: access.canWrite,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo evaluar la completitud canónica de activos' }, { status: 500 });
  }
}
