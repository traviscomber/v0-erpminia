export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

type MaterialInput = {
  canonicalProductId: string;
  quantityRequired: number;
  requiredDate?: string | null;
  notes?: string | null;
};

async function getWorkOrder(context: Awaited<ReturnType<typeof getOrganizationContext>> & { ok: true }, id: string) {
  const { data, error } = await context.supabase
    .from('maintenance_work_orders')
    .select('id, organization_id, canonical_asset_id')
    .eq('organization_id', context.organizationId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function refreshStatus(context: Awaited<ReturnType<typeof getOrganizationContext>> & { ok: true }, id: string) {
  const { data: supplyNeedId, error: refreshError } = await context.supabase.rpc('refresh_work_order_supply_need', {
    p_work_order_id: id,
  });
  if (refreshError) throw refreshError;

  const { data: status, error: statusError } = await context.supabase.rpc('get_work_order_supply_status_v1', {
    p_organization_id: context.organizationId,
    p_work_order_id: id,
  });
  if (statusError) throw statusError;
  return { supplyNeedId, status };
}

export async function GET(request: NextRequest, contextRoute: { params: Promise<{ id: string }> }) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_OPERACIONES);
  if (!access.authorized) return access.response;
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

export async function POST(request: NextRequest, contextRoute: { params: Promise<{ id: string }> }) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_OPERACIONES, true);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { id } = await contextRoute.params;
    const item = (await request.json()) as MaterialInput;
    if (!item.canonicalProductId || !Number.isFinite(Number(item.quantityRequired)) || Number(item.quantityRequired) <= 0) {
      return NextResponse.json({ error: 'Producto y cantidad requerida son obligatorios' }, { status: 400 });
    }

    const { data, error } = await context.supabase.rpc('upsert_work_order_material_requirement_v1', {
      p_work_order_id: id,
      p_canonical_product_id: item.canonicalProductId,
      p_quantity_required: Number(item.quantityRequired),
      p_required_date: item.requiredDate || null,
      p_notes: item.notes?.trim() || null,
    });
    if (error) throw error;

    return NextResponse.json({
      supplyNeedId: data?.supply_need_id || null,
      requirementId: data?.requirement_id || null,
      data: data?.supply_status || null,
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo agregar el material requerido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, contextRoute: { params: Promise<{ id: string }> }) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_OPERACIONES, true);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { id } = await contextRoute.params;
    const body = (await request.json()) as { materials?: MaterialInput[] };
    const materials = Array.isArray(body.materials) ? body.materials : [];
    const workOrder = await getWorkOrder(context, id);
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
      const { error: insertError } = await context.supabase.from('work_order_material_requirements').insert(validRows);
      if (insertError) throw insertError;
    }

    const refreshed = await refreshStatus(context, id);
    return NextResponse.json({ supplyNeedId: refreshed.supplyNeedId, data: refreshed.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron actualizar los materiales requeridos';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
