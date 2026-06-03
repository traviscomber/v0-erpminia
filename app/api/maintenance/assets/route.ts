import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

function mapAsset(asset: any) {
  return {
    id: asset.id,
    asset_code: asset.asset_code,
    asset_name: asset.asset_name,
    asset_type: asset.asset_type,
    location: asset.location,
    status: asset.status,
    manufacturer: asset.manufacturer,
    model: asset.model,
    serial_number: asset.serial_number,
    criticality: asset.criticality,
    mtbf_hours: asset.mtbf_hours,
  };
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const searchParams = new URL(request.url).searchParams;
    const status = searchParams.get('status');
    const criticality = searchParams.get('criticality');

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

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ assets: (data || []).map(mapAsset) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch maintenance assets';
    return NextResponse.json({ assets: [], error: message }, { status: 500 });
  }
}
