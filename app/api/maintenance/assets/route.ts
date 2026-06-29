export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type AssetRow = {
  id: string;
  asset_code: string | null;
  asset_name: string | null;
  asset_type: string | null;
  location: string | null;
  status: string | null;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  criticality: string | null;
  mtbf_hours: number | string | null;
  acquisition_cost: number | string | null;
};

function mapAsset(asset: AssetRow) {
  return {
    id: asset.id,
    assetCode: asset.asset_code,
    assetName: asset.asset_name,
    assetType: asset.asset_type,
    location: asset.location,
    status: asset.status,
    manufacturer: asset.manufacturer,
    model: asset.model,
    serialNumber: asset.serial_number,
    criticality: asset.criticality,
    mtbfHours: asset.mtbf_hours !== null && asset.mtbf_hours !== undefined ? Number(asset.mtbf_hours) : null,
    acquisitionCost: asset.acquisition_cost !== null && asset.acquisition_cost !== undefined ? Number(asset.acquisition_cost) : 0,
  };
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const searchParams = new URL(request.url).searchParams;
    const status = searchParams.get('status');
    const criticality = searchParams.get('criticality');
    const assetType = searchParams.get('asset_type');

    let query = context.supabase
      .from('maintenance_assets')
      .select('*')
      .eq('organization_id', context.organizationId)
      .order('criticality', { ascending: false })
      .order('asset_name', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    if (criticality) {
      query = query.eq('criticality', criticality);
    }

    if (assetType) {
      query = query.eq('asset_type', assetType);
    }

    const { data, error } = await query;
    if (error) throw error;

    const assets = Array.isArray(data) ? (data as AssetRow[]) : [];

    return NextResponse.json({ assets: assets.map(mapAsset) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar los activos de mantenimiento';
    return NextResponse.json({ assets: [], error: message }, { status: 500 });
  }
}
