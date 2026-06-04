import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { getDashboardSnapshot } from '@/lib/api/dashboard-snapshot';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const type = request.nextUrl.searchParams.get('type') || 'maintenance';
    const range = request.nextUrl.searchParams.get('range') || 'month';
    const snapshot = await getDashboardSnapshot({
      organizationId: context.organizationId,
      supabase: context.supabase,
    });

    const criticalAlerts = [
      snapshot.summary.pendingDocuments > 0
        ? `${snapshot.summary.pendingDocuments} documento(s) pendientes de aprobacion.`
        : null,
      snapshot.summary.overdueWorkOrders > 0
        ? `${snapshot.summary.overdueWorkOrders} orden(es) de trabajo vencidas o atrasadas.`
        : null,
      snapshot.summary.lowStockItems > 0
        ? `${snapshot.summary.lowStockItems} item(s) de bodega estan bajo stock minimo.`
        : null,
      snapshot.summary.expiringContracts > 0
        ? `${snapshot.summary.expiringContracts} contrato(s) vencen dentro de 30 dias.`
        : null,
    ].filter(Boolean);

    return NextResponse.json({
      type,
      range,
      summary: snapshot.summary,
      documents: {
        compliant: snapshot.documentStats.approved,
        expiring: snapshot.expiringDocuments.length,
        total: snapshot.documentStats.total,
      },
      maintenance: {
        preventive: snapshot.summary.preventiveOrders,
        corrective: snapshot.summary.correctiveOrders,
        overdue: snapshot.summary.overdueWorkOrders,
      },
      inventory: {
        items: snapshot.summary.totalInventoryItems,
        lowStock: snapshot.summary.lowStockItems,
        totalValue: snapshot.summary.inventoryValue,
      },
      chartData: [
        {
          name: 'Documentos',
          operativos: snapshot.documentStats.approved,
          pendientes: snapshot.documentStats.pending,
          criticos: snapshot.expiringDocuments.length,
        },
        {
          name: 'Mantenimiento',
          operativos: snapshot.summary.preventiveOrders,
          pendientes: snapshot.summary.correctiveOrders,
          criticos: snapshot.summary.overdueWorkOrders,
        },
        {
          name: 'Bodega',
          operativos: snapshot.summary.totalInventoryItems,
          pendientes: snapshot.summary.lowStockItems,
          criticos: Math.min(snapshot.summary.lowStockItems, 10),
        },
      ],
      modulesHealth: snapshot.moduleHealth,
      performanceTrends: snapshot.trendByMonth,
      criticalAlerts,
      details: {
        documents: snapshot.expiringDocuments.slice(0, 5),
        workOrders: snapshot.workOrders.slice(0, 5),
        stock: snapshot.lowStockItems.slice(0, 5),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch executive reports';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
