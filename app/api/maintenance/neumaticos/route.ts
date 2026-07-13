export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext, type OrganizationSuccessContext } from '@/lib/api/organization-context';
import {
  normalizeTireCondition,
  normalizeTireStatus,
  tireConditionLabel,
  tireEventLabel,
  tireLifecycleLabel,
  type TireCondition,
  type TireEventType,
  type TireLifecycleStatus,
} from '@/lib/maintenance/tire-traceability';
import { normalizeText } from '@/lib/bodega-normalization';

type WarehouseStockRow = {
  id: string;
  part_code: string | null;
  part_name: string | null;
  quantity_on_hand: number | string | null;
  quantity_reserved: number | string | null;
  quantity_available: number | string | null;
  reorder_level: number | string | null;
  reorder_quantity: number | string | null;
  unit_cost: number | string | null;
  bin?: Array<{
    bin_code: string | null;
    bin_location: string | null;
  }> | null;
};

type TireStockItem = {
  id: string;
  partCode: string | null;
  partName: string | null;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  reorderLevel: number;
  reorderQuantity: number;
  unitCost: number;
  binCode: string | null;
  binLocation: string | null;
  totalValue: number;
  lowStock: boolean;
  isTire: boolean;
};

type TireMasterRow = {
  id: string;
  tire_code: string;
  tire_name: string;
  tire_condition: TireCondition | string | null;
  lifecycle_status: TireLifecycleStatus | string | null;
  size: string | null;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  purchase_order_number: string | null;
  installed_at: string | null;
  removed_at: string | null;
  notes: string | null;
  current_bin_id: string | null;
  work_order_id: string | null;
  updated_at: string | null;
};

type TireEventRow = {
  id: string;
  event_type: TireEventType | string;
  event_status: string | null;
  event_date: string | null;
  quantity: number | string | null;
  notes: string | null;
  tire?:
    | {
        id: string;
        tire_code: string;
        tire_name: string;
        tire_condition: string | null;
        lifecycle_status: string | null;
      }
    | Array<{
        id: string;
        tire_code: string;
        tire_name: string;
        tire_condition: string | null;
        lifecycle_status: string | null;
      }>
    | null;
  asset?:
    | {
        asset_code: string | null;
        asset_name: string | null;
      }
    | Array<{
        asset_code: string | null;
        asset_name: string | null;
      }>
    | null;
  work_order?:
    | {
        work_order_number: string | null;
        title: string | null;
      }
    | Array<{
        work_order_number: string | null;
        title: string | null;
      }>
    | null;
  purchase_order?:
    | {
        po_number: string | null;
        vendor_name: string | null;
      }
    | Array<{
        po_number: string | null;
        vendor_name: string | null;
      }>
    | null;
};

function isMissingTableError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error || '').toLowerCase();
  return message.includes('maintenance_tires') || message.includes('maintenance_tire_events') || message.includes('42p01');
}

function mapStockItem(item: WarehouseStockRow): TireStockItem {
  const searchable = normalizeText(`${item.part_code || ''} ${item.part_name || ''}`);
  const isTire =
    searchable.includes('neumatic') ||
    searchable.includes('llanta') ||
    searchable.startsWith('neu') ||
    searchable.includes('rodado');

  const quantityOnHand = Number(item.quantity_on_hand || 0);
  const quantityReserved = Number(item.quantity_reserved || 0);
  const quantityAvailable = Number(item.quantity_available ?? Math.max(0, quantityOnHand - quantityReserved));

  return {
    id: item.id,
    partCode: item.part_code,
    partName: item.part_name,
    quantityOnHand,
    quantityReserved,
    quantityAvailable,
    reorderLevel: Number(item.reorder_level || 0),
    reorderQuantity: Number(item.reorder_quantity || 0),
    unitCost: Number(item.unit_cost || 0),
    binCode: item.bin?.[0]?.bin_code || null,
    binLocation: item.bin?.[0]?.bin_location || null,
    totalValue: Number((quantityOnHand * Number(item.unit_cost || 0)).toFixed(2)),
    lowStock: quantityAvailable <= Number(item.reorder_level || 0),
    isTire,
  };
}

function mapTireMaster(item: TireMasterRow) {
  return {
    id: item.id,
    tireCode: item.tire_code,
    tireName: item.tire_name,
    condition: normalizeTireCondition(item.tire_condition),
    conditionLabel: tireConditionLabel(normalizeTireCondition(item.tire_condition)),
    lifecycleStatus: normalizeTireStatus(item.lifecycle_status),
    lifecycleLabel: tireLifecycleLabel(item.lifecycle_status),
    size: item.size,
    brand: item.brand,
    model: item.model,
    serialNumber: item.serial_number,
    purchaseOrderNumber: item.purchase_order_number,
    installedAt: item.installed_at,
    removedAt: item.removed_at,
    notes: item.notes,
    currentBinId: item.current_bin_id,
    workOrderId: item.work_order_id,
    updatedAt: item.updated_at,
  };
}

function mapTireEvent(item: TireEventRow) {
  const tire = Array.isArray(item.tire) ? item.tire[0] : item.tire;
  const asset = Array.isArray(item.asset) ? item.asset[0] : item.asset;
  const workOrder = Array.isArray(item.work_order) ? item.work_order[0] : item.work_order;
  const purchaseOrder = Array.isArray(item.purchase_order) ? item.purchase_order[0] : item.purchase_order;

  return {
    id: item.id,
    eventType: item.event_type,
    eventLabel: tireEventLabel(item.event_type),
    eventStatus: item.event_status,
    eventDate: item.event_date,
    quantity: Number(item.quantity || 0),
    notes: item.notes,
    tireCode: tire?.tire_code || null,
    tireName: tire?.tire_name || null,
    tireCondition: normalizeTireCondition(tire?.tire_condition),
    lifecycleStatus: normalizeTireStatus(tire?.lifecycle_status),
    assetCode: asset?.asset_code || null,
    assetName: asset?.asset_name || null,
    workOrderNumber: workOrder?.work_order_number || null,
    workOrderTitle: workOrder?.title || null,
    purchaseOrderNumber: purchaseOrder?.po_number || null,
    purchaseOrderVendor: purchaseOrder?.vendor_name || null,
  };
}

async function loadStockItems(context: OrganizationSuccessContext) {
  const { data, error } = await context.supabase
    .from('warehouse_stock')
    .select('id, part_code, part_name, quantity_on_hand, quantity_reserved, quantity_available, reorder_level, reorder_quantity, unit_cost, bin:warehouse_bins(bin_code, bin_location)')
    .eq('organization_id', context.organizationId)
    .order('part_name', { ascending: true });

  if (error) throw error;

  const items = (Array.isArray(data) ? (data as WarehouseStockRow[]) : []).map(mapStockItem).filter((item) => item.isTire);
  const summary = {
    totalItems: items.length,
    lowStock: items.filter((item) => item.lowStock).length,
    totalQuantity: items.reduce((sum, item) => sum + item.quantityOnHand, 0),
    totalValue: items.reduce((sum, item) => sum + item.totalValue, 0),
  };

  return { items, summary };
}

async function loadTraceability(context: OrganizationSuccessContext) {
  const [tiresResult, eventsResult] = await Promise.all([
    context.supabase
      .from('maintenance_tires')
      .select('id, tire_code, tire_name, tire_condition, lifecycle_status, size, brand, model, serial_number, purchase_order_number, installed_at, removed_at, notes, current_bin_id, work_order_id, updated_at')
      .eq('organization_id', context.organizationId)
      .order('updated_at', { ascending: false }),
    context.supabase
      .from('maintenance_tire_events')
      .select('id, event_type, event_status, event_date, quantity, notes, tire:maintenance_tires(id, tire_code, tire_name, tire_condition, lifecycle_status), asset:maintenance_assets(asset_code, asset_name), work_order:maintenance_work_orders(work_order_number, title), purchase_order:purchase_orders(po_number, vendor_name)')
      .eq('organization_id', context.organizationId)
      .order('event_date', { ascending: false })
      .limit(20),
  ]);

  if (tiresResult.error) throw tiresResult.error;
  if (eventsResult.error) throw eventsResult.error;

  const tires = (Array.isArray(tiresResult.data) ? (tiresResult.data as TireMasterRow[]) : []).map(mapTireMaster);
  const events = (Array.isArray(eventsResult.data) ? (eventsResult.data as TireEventRow[]) : []).map(mapTireEvent);

  const summary = {
    totalTires: tires.length,
    newTires: tires.filter((item) => item.condition === 'new').length,
    usedTires: tires.filter((item) => item.condition === 'used').length,
    installed: tires.filter((item) => item.lifecycleStatus === 'installed').length,
    inStock: tires.filter((item) => item.lifecycleStatus === 'in_stock').length,
    replaced: tires.filter((item) => item.lifecycleStatus === 'replaced').length,
    retired: tires.filter((item) => item.lifecycleStatus === 'retired').length,
  };

  return {
    summary,
    tires: tires.slice(0, 50),
    events,
  };
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const stock = await loadStockItems(context);

    try {
      const traceability = await loadTraceability(context);
      return NextResponse.json({
        items: stock.items,
        summary: stock.summary,
        traceability,
      });
    } catch (traceabilityError) {
      if (!isMissingTableError(traceabilityError)) throw traceabilityError;
      return NextResponse.json({
        items: stock.items,
        summary: stock.summary,
        traceability: {
          summary: {
            totalTires: 0,
            newTires: 0,
            usedTires: 0,
            installed: 0,
            inStock: 0,
            replaced: 0,
            retired: 0,
          },
          tires: [],
          events: [],
        },
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar la gestion de neumaticos';
    return NextResponse.json(
      {
        items: [],
        summary: { totalItems: 0, lowStock: 0, totalQuantity: 0, totalValue: 0 },
        traceability: {
          summary: {
            totalTires: 0,
            newTires: 0,
            usedTires: 0,
            installed: 0,
            inStock: 0,
            replaced: 0,
            retired: 0,
          },
          tires: [],
          events: [],
        },
        error: message,
      },
      { status: 500 },
    );
  }
}

type TireEventPayload = {
  tireId?: string;
  tireCode?: string;
  tireName?: string;
  tireCondition?: TireCondition | string;
  lifecycleStatus?: TireLifecycleStatus | string;
  eventType?: TireEventType | string;
  purchaseOrderId?: string | null;
  purchaseOrderNumber?: string | null;
  workOrderId?: string | null;
  workOrderNumber?: string | null;
  assetId?: string | null;
  stockId?: string | null;
  binId?: string | null;
  relatedTireId?: string | null;
  notes?: string | null;
};

async function resolvePurchaseOrderId(context: OrganizationSuccessContext, payload: TireEventPayload) {
  if (payload.purchaseOrderId) return String(payload.purchaseOrderId);
  const purchaseOrderNumber = String(payload.purchaseOrderNumber || '').trim();
  if (!purchaseOrderNumber) return null;

  const { data, error } = await context.supabase
    .from('purchase_orders')
    .select('id')
    .eq('organization_id', context.organizationId)
    .or(`po_number.eq.${purchaseOrderNumber},purchase_order_number.eq.${purchaseOrderNumber},number.eq.${purchaseOrderNumber},code.eq.${purchaseOrderNumber}`)
    .maybeSingle();

  if (error) throw error;
  return data?.id || null;
}

async function resolveWorkOrderId(context: OrganizationSuccessContext, payload: TireEventPayload) {
  if (payload.workOrderId) return String(payload.workOrderId);
  const workOrderNumber = String(payload.workOrderNumber || '').trim();
  if (!workOrderNumber) return null;

  const { data, error } = await context.supabase
    .from('maintenance_work_orders')
    .select('id')
    .eq('organization_id', context.organizationId)
    .eq('work_order_number', workOrderNumber)
    .maybeSingle();

  if (error) throw error;
  return data?.id || null;
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const body = (await request.json()) as TireEventPayload;
    const tireCode = String(body.tireCode || '').trim();
    const tireName = String(body.tireName || '').trim() || tireCode || 'Neumatico';
    const eventType = String(body.eventType || 'adjusted').trim() as TireEventType;
    const tireCondition = normalizeTireCondition(body.tireCondition);
    const lifecycleStatus = normalizeTireStatus(body.lifecycleStatus);
    const resolvedPurchaseOrderId = await resolvePurchaseOrderId(context, body);
    const resolvedWorkOrderId = await resolveWorkOrderId(context, body);

    let tireId = String(body.tireId || '').trim() || null;
    if (!tireId) {
      if (!tireCode) {
        return NextResponse.json({ error: 'Se requiere tireCode o tireId' }, { status: 400 });
      }

      const { data: existingTire, error: existingError } = await context.supabase
        .from('maintenance_tires')
        .select('id')
        .eq('organization_id', context.organizationId)
        .eq('tire_code', tireCode)
        .maybeSingle();

      if (existingError && !isMissingTableError(existingError)) throw existingError;
      if (existingTire?.id) {
        tireId = existingTire.id;
      } else {
        const { data: insertedTire, error: insertError } = await context.supabase
          .from('maintenance_tires')
          .insert({
            organization_id: context.organizationId,
            tire_code: tireCode,
            tire_name: tireName,
            tire_condition: tireCondition,
            lifecycle_status: lifecycleStatus,
            purchase_order_id: resolvedPurchaseOrderId,
            purchase_order_number: body.purchaseOrderNumber || null,
            work_order_id: resolvedWorkOrderId,
            installed_asset_id: body.assetId || null,
            source_stock_id: body.stockId || null,
            current_stock_id: body.stockId || null,
            current_bin_id: body.binId || null,
            notes: body.notes || null,
          })
          .select('id')
          .single();

        if (insertError) throw insertError;
        tireId = insertedTire.id;
      }
    }

    if (!tireId) {
      return NextResponse.json({ error: 'No se pudo resolver el neumático objetivo' }, { status: 400 });
    }

    const { error: eventError } = await context.supabase.from('maintenance_tire_events').insert({
      organization_id: context.organizationId,
      tire_id: tireId,
      event_type: eventType,
      event_status: lifecycleStatus,
      purchase_order_id: resolvedPurchaseOrderId,
      work_order_id: resolvedWorkOrderId,
      stock_id: body.stockId || null,
      asset_id: body.assetId || null,
      related_tire_id: body.relatedTireId || null,
      quantity: 1,
      location: body.binId || null,
      notes: body.notes || null,
      created_by: context.userId,
      event_date: new Date().toISOString(),
    });

    if (eventError) throw eventError;

    const updatePatch: Record<string, unknown> = {
      tire_condition: tireCondition,
      lifecycle_status: lifecycleStatus,
      purchase_order_id: resolvedPurchaseOrderId,
      purchase_order_number: body.purchaseOrderNumber || null,
      work_order_id: resolvedWorkOrderId,
      installed_asset_id: body.assetId || null,
      current_stock_id: body.stockId || null,
      current_bin_id: body.binId || null,
      notes: body.notes || null,
      updated_at: new Date().toISOString(),
    };

    if (eventType === 'installed') {
      updatePatch.installed_at = new Date().toISOString();
      updatePatch.removed_at = null;
      updatePatch.lifecycle_status = 'installed';
    } else if (eventType === 'replaced' || eventType === 'removed' || eventType === 'retired') {
      updatePatch.removed_at = new Date().toISOString();
      updatePatch.lifecycle_status = eventType === 'retired' ? 'retired' : 'replaced';
    } else if (eventType === 'returned') {
      updatePatch.installed_at = null;
      updatePatch.removed_at = null;
      updatePatch.lifecycle_status = 'in_stock';
    } else if (eventType === 'repaired') {
      updatePatch.lifecycle_status = 'in_repair';
    } else if (eventType === 'received' || eventType === 'purchase_order') {
      updatePatch.lifecycle_status = 'in_stock';
    }

    const { data: updatedTire, error: updateError } = await context.supabase
      .from('maintenance_tires')
      .update(updatePatch)
      .eq('id', tireId)
      .select('id, tire_code, tire_name, tire_condition, lifecycle_status, size, brand, model, serial_number, purchase_order_number, installed_at, removed_at, notes, current_bin_id, work_order_id, updated_at')
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      tire: mapTireMaster(updatedTire as TireMasterRow),
    }, { status: 201 });
  } catch (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json(
        {
          error: 'La trazabilidad de neumáticos aún no está creada en la base de datos',
        },
        { status: 409 },
      );
    }

    const message = error instanceof Error ? error.message : 'No se pudo registrar la trazabilidad del neumatico';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
