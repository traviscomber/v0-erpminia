export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const { id } = await params;

  try {
    type AssetShape = {
      id: string;
      asset_code: string | null;
      asset_name: string | null;
      asset_type: string | null;
      location: string | null;
      status: string | null;
      manufacturer: string | null;
      model: string | null;
      criticality: string | null;
      mtbf_hours: number | null;
    };

    // Primary lookup: by UUID in maintenance_assets
    const { data: assetFromDB, error: assetError } = await context.supabase
      .from('maintenance_assets')
      .select('id, asset_code, asset_name, asset_type, location, status, manufacturer, model, criticality, mtbf_hours')
      .eq('id', id)
      .eq('organization_id', context.organizationId)
      .maybeSingle();

    // assetError (400/RLS) means the maintenance_assets lookup failed — fall through to cost_center
    let asset: AssetShape | null = (!assetError && assetFromDB) ? (assetFromDB as AssetShape) : null;

    // Fallback: id may be a cost_center.id — synthesize from cost center data
    if (!asset) {
      const { data: costCenter } = await context.supabase
        .from('cost_centers')
        .select('id, code, name, status')
        .eq('id', id)
        .eq('organization_id', context.organizationId)
        .maybeSingle();

      if (costCenter) {
        asset = {
          id: costCenter.id,
          asset_code: costCenter.code ?? null,
          asset_name: costCenter.name ?? null,
          asset_type: null,
          location: null,
          status: costCenter.status ?? 'activo',
          manufacturer: null,
          model: null,
          criticality: null,
          mtbf_hours: null,
        };
      }
    }

    if (!asset) {
      return NextResponse.json({ error: 'No se encontro el activo solicitado' }, { status: 404 });
    }

    const { data: history, error: historyError } = await context.supabase
      .from('maintenance_history')
      .select(`
        id,
        work_order_id,
        asset_id,
        maintenance_type,
        performed_by_name,
        start_time,
        end_time,
        parts_replaced,
        parts_cost,
        labor_hours,
        labor_cost,
        notes,
        created_at,
        work_order:maintenance_work_orders(work_order_number, title, status, priority)
      `)
      .eq('asset_id', id)
      .order('created_at', { ascending: false });

    // Don't throw on historyError — the table may not exist yet for this asset.
    // Return empty history so the ficha still renders with asset data.

    return NextResponse.json({ asset, history: history || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar el historial del activo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
