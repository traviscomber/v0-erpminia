export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

const CLOSED = new Set(['completed','closed','cancelled','canceled','completada','cerrada','cancelada']);
const norm = (value: unknown) => String(value ?? '').trim().toLowerCase();

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const [reviewsRes, workOrdersRes, requirementsRes, needsRes, flowRes, ordersRes, receiptsRes] = await Promise.all([
      context.supabase.from('drilling_maintenance_review_queue_v1').select('source_report_id,canonical_asset_id,asset_code,asset_name,operation_date,review_reason,equipment_status_raw,machine_observations,review_status,review_id,linked_work_order_id,has_linked_work_order').eq('organization_id', context.organizationId),
      context.supabase.from('maintenance_work_orders').select('id,work_order_number,canonical_asset_id,title,status,priority,root_cause,created_at').eq('organization_id', context.organizationId),
      context.supabase.from('work_order_material_requirements').select('id,work_order_id,canonical_asset_id,canonical_product_id,quantity_required,quantity_available,quantity_shortage,status,required_date').eq('organization_id', context.organizationId),
      context.supabase.from('work_order_supply_needs').select('id,work_order_id,canonical_asset_id,status,priority,required_date,procurement_request_id').eq('organization_id', context.organizationId),
      context.supabase.from('procurement_intake_flow').select('id,request_number,status,work_order_id,canonical_asset_id,asset_code,asset_name,source_supply_need_id,promoted_request_id,line_count,total_units').eq('organization_id', context.organizationId),
      context.supabase.from('procurement_operational_orders').select('id,order_number,work_order_id,canonical_asset_id,status,expected_delivery_date,actual_delivery_date,issued_at').eq('organization_id', context.organizationId),
      context.supabase.from('procurement_operational_receipts').select('id,receipt_number,order_id,received_at').eq('organization_id', context.organizationId),
    ]);

    const errors = [reviewsRes.error, workOrdersRes.error, requirementsRes.error, needsRes.error, flowRes.error, ordersRes.error, receiptsRes.error].filter(Boolean);
    if (errors.length) throw errors[0];

    const reviews = reviewsRes.data || [];
    const workOrders = workOrdersRes.data || [];
    const requirements = requirementsRes.data || [];
    const needs = needsRes.data || [];
    const flows = flowRes.data || [];
    const orders = ordersRes.data || [];
    const receipts = receiptsRes.data || [];

    const woById = new Map(workOrders.map((row) => [row.id, row]));
    const reqByWo = new Map<string, typeof requirements>();
    for (const row of requirements) reqByWo.set(row.work_order_id, [...(reqByWo.get(row.work_order_id) || []), row]);
    const needByWo = new Map(needs.map((row) => [row.work_order_id, row]));
    const flowByWo = new Map(flows.filter((row) => row.work_order_id).map((row) => [row.work_order_id as string, row]));
    const ordersByWo = new Map<string, typeof orders>();
    for (const row of orders) if (row.work_order_id) ordersByWo.set(row.work_order_id, [...(ordersByWo.get(row.work_order_id) || []), row]);
    const receiptOrderIds = new Set(receipts.map((row) => row.order_id));

    const chains = reviews
      .filter((review) => norm(review.review_status) === 'pending' || !review.has_linked_work_order || review.linked_work_order_id)
      .map((review) => {
        const wo = review.linked_work_order_id ? woById.get(review.linked_work_order_id) : undefined;
        const materialRows = wo ? (reqByWo.get(wo.id) || []) : [];
        const supplyNeed = wo ? needByWo.get(wo.id) : undefined;
        const flow = wo ? flowByWo.get(wo.id) : undefined;
        const purchaseOrders = wo ? (ordersByWo.get(wo.id) || []) : [];
        const receivedOrders = purchaseOrders.filter((order) => receiptOrderIds.has(order.id));
        const shortage = materialRows.reduce((sum, row) => sum + Number(row.quantity_shortage || 0), 0);

        let breakAt = 'resolved';
        let action = 'Sin acción adicional acreditada.';
        if (!wo) { breakAt = 'work_order'; action = 'Crear o vincular una OT para la observación operacional.'; }
        else if (CLOSED.has(norm(wo.status))) { breakAt = 'resolved'; action = 'La OT asociada está cerrada; revisar sólo si la condición operacional persiste.'; }
        else if (materialRows.length === 0) { breakAt = 'materials'; action = 'Registrar si la OT requiere repuestos antes de atribuir un bloqueo a Inventario o Compras.'; }
        else if (shortage > 0 && !supplyNeed) { breakAt = 'supply_need'; action = 'Existe faltante material; generar necesidad de abastecimiento.'; }
        else if (shortage > 0 && supplyNeed && !flow) { breakAt = 'procurement_request'; action = 'Promover la necesidad de abastecimiento a Compras.'; }
        else if (shortage > 0 && flow && purchaseOrders.length === 0) { breakAt = 'purchase_order'; action = 'La solicitud está en Compras y aún no tiene OC operacional.'; }
        else if (purchaseOrders.length > 0 && receivedOrders.length < purchaseOrders.length) { breakAt = 'receipt'; action = 'Existe OC emitida; falta recepción completa acreditada.'; }

        return {
          id: review.review_id || review.source_report_id,
          assetId: review.canonical_asset_id,
          assetCode: review.asset_code,
          assetName: review.asset_name,
          operationDate: review.operation_date,
          equipmentStatus: review.equipment_status_raw,
          observation: review.machine_observations || review.review_reason,
          workOrder: wo ? { id: wo.id, number: wo.work_order_number, title: wo.title, status: wo.status, priority: wo.priority, rootCause: wo.root_cause } : null,
          materials: { count: materialRows.length, shortage },
          supplyNeed: supplyNeed ? { id: supplyNeed.id, status: supplyNeed.status, procurementRequestId: supplyNeed.procurement_request_id } : null,
          procurement: flow ? { id: flow.id, requestNumber: flow.request_number, status: flow.status } : null,
          purchaseOrders: purchaseOrders.map((order) => ({ id: order.id, number: order.order_number, status: order.status, expectedDeliveryDate: order.expected_delivery_date, actualDeliveryDate: order.actual_delivery_date, received: receiptOrderIds.has(order.id) })),
          breakAt,
          action,
          evidenceLevel: wo ? (materialRows.length ? 'linked' : 'partial') : 'operational_only',
        };
      });

    const summary = {
      operationalObservations: reviews.length,
      linkedToWorkOrder: chains.filter((row) => row.workOrder).length,
      withMaterialEvidence: chains.filter((row) => row.materials.count > 0).length,
      withSupplyNeed: chains.filter((row) => row.supplyNeed).length,
      inProcurement: chains.filter((row) => row.procurement).length,
      withPurchaseOrder: chains.filter((row) => row.purchaseOrders.length > 0).length,
      fullyReceived: chains.filter((row) => row.purchaseOrders.length > 0 && row.purchaseOrders.every((order) => order.received)).length,
    };

    return NextResponse.json({ summary, chains, policy: 'La cadena sólo avanza cuando existe un vínculo canónico explícito. La ausencia de requerimiento material nunca se interpreta como falta de stock.', generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('[intelligence/root-cause]', error);
    return NextResponse.json({ error: 'No fue posible construir la cadena transversal de evidencia' }, { status: 500 });
  }
}
