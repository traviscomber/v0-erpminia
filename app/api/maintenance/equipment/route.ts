import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type CanonicalAssetRow = {
  asset_id: string;
  code: string;
  name: string;
  asset_type: string | null;
  category: string | null;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  cost_center_code: string | null;
  functional_location: string | null;
  is_active: boolean;
  criticality: string | null;
  source_system: string | null;
  source_key: string | null;
  updated_at: string | null;
};

function inferCriticality(asset: CanonicalAssetRow) {
  if (asset.criticality) return asset.criticality;
  const value = `${asset.asset_type || ''} ${asset.category || ''}`.toLowerCase();
  if (/(perfor|sondaj|excav|scoop|cargador)/.test(value)) return 'Alta';
  if (/(camion|camión|compresor|generador)/.test(value)) return 'Media';
  return 'Media';
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { data, error } = await context.supabase
      .from('maintenance_canonical_assets_v1')
      .select('asset_id,code,name,asset_type,category,manufacturer,model,serial_number,cost_center_code,functional_location,is_active,criticality,source_system,source_key,updated_at')
      .eq('organization_id', context.organizationId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;

    const assets = ((data || []) as CanonicalAssetRow[]).map((asset) => ({
      id: asset.asset_id,
      asset_id: asset.asset_id,
      source: 'canonical_asset' as const,
      code: asset.code,
      name: asset.name,
      model: asset.model,
      serial_number: asset.serial_number,
      type: asset.asset_type || asset.category || 'Activo',
      status: asset.is_active ? 'Activo' : 'Inactivo',
      criticality: inferCriticality(asset),
      purchase_date: null,
      last_maintenance: null,
      next_maintenance: null,
      specs: {
        manufacturer: asset.manufacturer,
        category: asset.category,
        cost_center_code: asset.cost_center_code,
        functional_location: asset.functional_location,
        source_system: asset.source_system,
        source_key: asset.source_key,
        updated_at: asset.updated_at,
      },
    }));

    return NextResponse.json({ equipment: assets, total: assets.length, source: 'public.maintenance_canonical_assets_v1', canonical: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar los activos';
    console.error('[maintenance/equipment]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
