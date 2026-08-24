import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type CanonicalAssetRow = {
  id: string;
  asset_code: string;
  name: string;
  asset_type: string | null;
  category: string | null;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  license_plate: string | null;
  cost_center_code: string | null;
  location: string | null;
  operational_status: string | null;
  criticality: string | null;
  acquisition_date: string | null;
  is_active: boolean;
  validation_status: string | null;
  validation_notes: string[] | null;
  source_file: string | null;
  source_sheet: string | null;
  source_row: number | null;
  updated_at: string | null;
};

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { data, error } = await context.supabase
      .from('canonical_assets_current')
      .select('id,asset_code,name,asset_type,category,manufacturer,model,serial_number,license_plate,cost_center_code,location,operational_status,criticality,acquisition_date,is_active,validation_status,validation_notes,source_file,source_sheet,source_row,updated_at')
      .eq('organization_id', context.organizationId)
      .eq('is_active', true)
      .order('name', { ascending: true });
    if (error) throw error;

    const assets = ((data || []) as CanonicalAssetRow[]).map((asset) => ({
      id: asset.id,
      asset_id: asset.id,
      source: 'canonical_asset' as const,
      code: asset.asset_code,
      name: asset.name,
      model: asset.model,
      serial_number: asset.serial_number,
      type: asset.asset_type || asset.category || 'Activo',
      status: asset.operational_status || (asset.is_active ? 'Activo' : 'Inactivo'),
      criticality: asset.criticality,
      purchase_date: asset.acquisition_date,
      last_maintenance: null,
      next_maintenance: null,
      specs: {
        manufacturer: asset.manufacturer,
        category: asset.category,
        license_plate: asset.license_plate,
        cost_center_code: asset.cost_center_code,
        location: asset.location,
        validation_status: asset.validation_status,
        validation_notes: asset.validation_notes,
        source_file: asset.source_file,
        source_sheet: asset.source_sheet,
        source_row: asset.source_row,
        updated_at: asset.updated_at,
      },
    }));

    return NextResponse.json({ equipment: assets, total: assets.length, source: 'public.canonical_assets_current', canonical: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar los activos';
    console.error('[maintenance/equipment]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
