export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const org = context.organizationId;
    const [orders, pipeline, overview] = await Promise.all([
      context.supabase
        .from('procurement_operational_orders')
        .select('id,status,issued_at,expected_delivery_date,actual_delivery_date,supplier_id,work_order_id')
        .eq('organization_id', org),
      context.supabase
        .from('operational_procurement_pipeline')
        .select('intake_request_id,lead_time_days,expected_delivery_date,quantity_ordered,quantity_received,pipeline_status')
        .eq('organization_id', org),
      context.supabase
        .from('procurement_overview')
        .select('*')
        .eq('organization_id', org)
        .maybeSingle(),
    ]);

    const error = orders.error || pipeline.error || overview.error;
    if (error) throw error;

    const today = new Date().toISOString().slice(0, 10);
    const operationalOrders = orders.data || [];
    const pipelineRows = pipeline.data || [];
    const delivered = operationalOrders.filter((row: any) => row.issued_at && row.actual_delivery_date);
    const overdueOpen = operationalOrders.filter((row: any) => row.expected_delivery_date && !row.actual_delivery_date && row.expected_delivery_date < today);
    const leadTimeRows = pipelineRows.filter((row: any) => row.lead_time_days !== null && row.lead_time_days !== undefined);
    const observedLeadTimes = delivered.map((row: any) => {
      const issued = new Date(row.issued_at).getTime();
      const deliveredAt = new Date(`${row.actual_delivery_date}T12:00:00Z`).getTime();
      return Number.isFinite(issued) && Number.isFinite(deliveredAt) ? Math.max(0, Math.round((deliveredAt - issued) / 86400000)) : null;
    }).filter((value): value is number => value !== null);
    const avgObservedLeadTime = observedLeadTimes.length ? observedLeadTimes.reduce((a,b)=>a+b,0) / observedLeadTimes.length : null;
    const readiness = observedLeadTimes.length >= 5 ? 'ready' : 'insufficient_operational_history';
    const historic = overview.data as any;

    return NextResponse.json({
      readiness,
      operational: {
        orders: operationalOrders.length,
        deliveredWithDates: delivered.length,
        overdueOpen: overdueOpen.length,
        pipelineRows: pipelineRows.length,
        withQuotedLeadTime: leadTimeRows.length,
        avgObservedLeadTimeDays: avgObservedLeadTime,
      },
      historicalContext: {
        purchaseOrders: Number(historic?.purchase_orders || 0),
        suppliersUsed: Number(historic?.suppliers_used || 0),
        firstPurchaseDate: historic?.first_purchase_date || null,
        lastPurchaseDate: historic?.last_purchase_date || null,
        warningOrders: Number(historic?.warning_orders || 0),
      },
      policy: readiness === 'ready'
        ? 'El riesgo de entrega puede usar lead time observado de órdenes operacionales entregadas; las OC históricas sin fecha real de entrega se mantienen sólo como contexto.'
        : 'No se proyecta fecha de llegada con OC históricas que carecen de ciclo operacional observado. Se requieren al menos 5 órdenes operacionales con emisión y entrega real.',
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[procurement/forecast]', error);
    return NextResponse.json({ error: 'No fue posible evaluar forecast de Compras' }, { status: 500 });
  }
}
