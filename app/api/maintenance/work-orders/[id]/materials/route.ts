export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type MaterialInput = {
  canonicalProductId: string;
  quantityRequired: number;
  requiredDate?: string | null;
  notes?: string | null;
};

export async function GET(request: NextRequest, contextRoute: { params: Promise<{ id: string }> }) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { id } = await contextRoute.params;
    const { data, error } = await context.supabase.rpc('get_work_order_supply_status_v1', {
      p_organization_id: context.organizationId,
      p_work_order_id: id,
    });

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar la cobertura de materiales';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, contextRoute: { params: Promise<{ id: string }> }) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { id } = await contextRoute.params;
    const body = (await request.json()) as { materials?: MaterialInput[] };
    const materials = Array.isArray(body.materials) ? body.materials : [];

    const { data: workOrder, error: workOrderError } = await context.supabase
      .from('maintenance_work_orders')
      .select('id, organization_id, canonical_asset_id')
      .eq('organization_id', context.organizationId)
      .eq('id', id)
      .maybeSingle();

    if (workOrderError) throw workOrderError;
    if (!workOrder) return NextResponse.json({ error: 'Orden de trabajo no encontrada' }, { status: 404 });

    const validRows = materials
      .filter((item) => item.canonicalProductId && Number(item.quantityRequired) > 0)
      .map((item) => ({
        organization_id: context.organizationId,
        work_order_id: id,
        canonical_asset_id: workOrder.canonical_asset_id,
        canonical_product_id: item.canonicalProductId,
        quantity_required: Number(item.quantityRequired),
        required_date: item.requiredDate || null,
        notes: item.notes?.trim() || null,
        created_by: context.userId,
        updated_at: new Date().toISOString(),
      }));

    const { error: deleteError } = await context.supabase
      .from('work_order_material_requirements')
      .delete()
      .eq('organization_id', context.organizationId)
      .eq('work_order_id', id);
    if (deleteError) throw deleteError;

    if (validRows.length > 0) {
      const { error: insertError } = await context.supabase
        .from('work_order_material_requirements')
        .insert(validRows);
      if (insertError) throw insertError;
    }

    const { data: supplyNeedId, error: refreshError } = await context.supabase.rpc('refresh_work_order_supply_need', {
      p_work_order_id: id,
    });
    if (refreshError) throw refreshError;

    const { data: status, error: statusError } = await context.supabase.rpc('get_work_order_supply_status_v1', {
      p_organization_id: context.organizationId,
      p_work_order_id: id,
    });
    if (statusError) throw statusError;

    return NextResponse.json({ supplyNeedId, data: status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron actualizar los materiales requeridos';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
