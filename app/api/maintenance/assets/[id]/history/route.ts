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
    // Primary lookup: by UUID in maintenance_assets
    let { data: asset, error: assetError } = await context.supabase
      .from('maintenance_assets')
      .select('id, asset_code, asset_name, asset_type, location, status, manufacturer, model, criticality, mtbf_hours')
      .eq('id', id)
      .eq('organization_id', context.organizationId)
      .maybeSingle();

    if (assetError) throw assetError;

    // Fallback: id may be a cost_center.id — look up the cost center and try to find
    // or synthesize an asset record from it so the ficha can render something useful.
    if (!asset) {
      const { data: costCenter } = await context.supabase
        .from('cost_centers')
        .select('id, code, name, description, status')
        .eq('id', id)
        .eq('organization_id', context.organizationId)
        .maybeSingle();

      if (costCenter) {
        // Try to match an existing maintenance_asset by code or name
        const { data: matched } = await context.supabase
          .from('maintenance_assets')
          .select('id, asset_code, asset_name, asset_type, location, status, manufacturer, model, criticality, mtbf_hours')
          .eq('organization_id', context.organizationId)
          .or(`asset_code.ilike.${costCenter.code},asset_name.ilike.${costCenter.name}`)
          .maybeSingle();

        if (matched) {
          asset = matched;
        } else {
          // Synthesize a minimal asset from the cost center so the UI renders something
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

    if (historyError) throw historyError;

    return NextResponse.json({ asset, history: history || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar el historial del activo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
