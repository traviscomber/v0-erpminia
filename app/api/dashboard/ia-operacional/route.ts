import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { getDashboardSnapshot } from '@/lib/api/dashboard-snapshot';

function buildInsightItems(snapshot: Awaited<ReturnType<typeof getDashboardSnapshot>>) {
  const items: any[] = [];

  for (const workOrder of snapshot.workOrders.filter((item: any) => ['critical', 'high'].includes(String(item.priority || '').toLowerCase())).slice(0, 4)) {
    items.push({
      id: `wo-${workOrder.id}`,
      type: 'mantencion',
      title: workOrder.title || workOrder.work_order_number,
      description: `OT ${workOrder.work_order_number || ''} en estado ${workOrder.status || 'abierto'} con prioridad ${workOrder.priority || 'media'}.`,
      severity: ['critical'].includes(String(workOrder.priority || '').toLowerCase()) ? 'critical' : 'warning',
      action: '/dashboard/work-orders',
      timestamp: workOrder.created_at,
      affected_resource: workOrder.asset_id,
    });
  }

  for (const document of snapshot.expiringDocuments.slice(0, 4)) {
    items.push({
      id: `doc-${document.id}`,
      type: 'vencimiento',
      title: document.title,
      description: `Documento con vencimiento programado para ${document.expiry_date || 'fecha no disponible'}.`,
      severity: 'warning',
      action: '/dashboard/documentos',
      timestamp: document.created_at,
    });
  }

  for (const item of snapshot.lowStockItems.slice(0, 4)) {
    items.push({
      id: `stock-${item.id}`,
      type: 'stock',
      title: item.part_name || item.part_code || 'Item critico',
      description: `Stock actual ${item.quantity_on_hand || 0} / reorden ${item.reorder_level || 0}.`,
      severity: Number(item.quantity_on_hand || 0) === 0 ? 'critical' : 'warning',
      action: '/dashboard/bodega',
      timestamp: item.created_at,
    });
  }

  for (const contract of snapshot.overdueFinancial.slice(0, 4)) {
    items.push({
      id: `finance-${contract.id}`,
      type: 'oc',
      title: contract.title,
      description: `Compromiso financiero vencido con saldo pendiente de ${contract.pending_amount || 0}.`,
      severity: 'info',
      action: '/dashboard/finanzas',
      timestamp: contract.created_at,
    });
  }

  return items;
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const snapshot = await getDashboardSnapshot({
      organizationId: context.organizationId,
      supabase: context.supabase,
    });

    const items = buildInsightItems(snapshot);

    return NextResponse.json({
      insights: snapshot.insights,
      details: {
        critical_equipment: items.filter((item) => item.type === 'mantencion'),
        expiring_documents: items.filter((item) => item.type === 'vencimiento'),
        critical_stock: items.filter((item) => item.type === 'stock'),
        pending_maintenance: items.filter((item) => item.type === 'mantencion'),
        overdue_orders: items.filter((item) => item.type === 'oc'),
        all: items,
      },
      recommendations: snapshot.recommendations,
      summary: {
        active_insights: items.length,
        efficiency: snapshot.insights.efficiency,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch IA insights';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
