export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

const CLOSED = new Set(['completed', 'closed', 'cancelled', 'canceled', 'completada', 'cerrada', 'cancelada']);

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_GERENCIAL);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const [flowResult, inventoryResult, requestResult] = await Promise.all([
      context.supabase
        .from('work_order_supply_chain_v1')
        .select('work_order_id,work_order_number,canonical_asset_id,title,work_order_status,priority,scheduled_date,material_requirement_count,material_shortage_count,material_shortage_quantity,supply_need_count,open_supply_need_count,procurement_request_count,open_procurement_request_count,procurement_order_count,undelivered_order_count,delivered_order_count,supply_chain_status')
        .eq('organization_id', context.organizationId)
        .limit(500),
      context.supabase
        .from('inventory_intelligence_overview_v1')
        .select('products_with_stock,units_on_hand,units_reserved,units_available,total_stock_value,out_of_stock_products,reorder_products,negative_stock_products')
        .eq('organization_id', context.organizationId)
        .maybeSingle(),
      context.supabase
        .from('canonical_procurement_requests_v1')
        .select('id,status,work_order_id,priority,required_date')
        .eq('organization_id', context.organizationId)
        .limit(1000),
    ]);

    const error = flowResult.error || inventoryResult.error || requestResult.error;
    if (error) throw error;

    const active = (flowResult.data || []).filter((row) => !CLOSED.has(String(row.work_order_status || '').toLowerCase()));
    const withRequirements = active.filter((row) => Number(row.material_requirement_count || 0) > 0);
    const withShortage = active.filter((row) => Number(row.material_shortage_count || 0) > 0);
    const waitingProcurement = active.filter((row) => Number(row.open_procurement_request_count || 0) > 0 || Number(row.undelivered_order_count || 0) > 0);
    const noSupplyEvidence = active.filter((row) => Number(row.material_requirement_count || 0) === 0);

    const exceptions = active
      .filter((row) => Number(row.material_shortage_count || 0) > 0 || Number(row.open_procurement_request_count || 0) > 0 || Number(row.undelivered_order_count || 0) > 0)
      .map((row) => ({
        workOrderId: row.work_order_id,
        workOrderNumber: row.work_order_number,
        title: row.title,
        priority: row.priority,
        scheduledDate: row.scheduled_date,
        shortageLines: Number(row.material_shortage_count || 0),
        shortageQuantity: Number(row.material_shortage_quantity || 0),
        openRequests: Number(row.open_procurement_request_count || 0),
        undeliveredOrders: Number(row.undelivered_order_count || 0),
        supplyChainStatus: row.supply_chain_status,
        action: Number(row.material_shortage_count || 0) > 0 && Number(row.open_procurement_request_count || 0) === 0
          ? 'Enviar los faltantes a Compras desde la orden de trabajo.'
          : Number(row.undelivered_order_count || 0) > 0
            ? 'Revisar fecha comprometida y recepción de la orden de compra.'
            : 'Revisar la solicitud de compra abierta asociada a la OT.',
      }));

    const procurementByStatus = (requestResult.data || []).reduce<Record<string, number>>((acc, row) => {
      const key = String(row.status || 'sin_estado');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      summary: {
        activeWorkOrders: active.length,
        workOrdersWithRequirements: withRequirements.length,
        workOrdersWithShortage: withShortage.length,
        workOrdersWaitingProcurement: waitingProcurement.length,
        workOrdersWithoutSupplyEvidence: noSupplyEvidence.length,
      },
      inventory: inventoryResult.data || null,
      procurement: {
        totalRequests: requestResult.data?.length || 0,
        byStatus: procurementByStatus,
      },
      exceptions,
      readiness: withRequirements.length > 0 ? 'operational' : 'capture_required',
      policy: {
        operationalRisk: 'Una alerta de abastecimiento de Mantención sólo existe cuando una OT tiene un requerimiento de material registrado y evidencia de faltante o compra pendiente.',
        inventoryContext: 'Stock bajo, sin stock o punto de reposición del inventario global es contexto de Bodega; no se atribuye automáticamente a una OT.',
      },
      source: ['public.work_order_supply_chain_v1', 'public.inventory_intelligence_overview_v1', 'public.canonical_procurement_requests_v1'],
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo calcular inteligencia de abastecimiento' }, { status: 500 });
  }
}
