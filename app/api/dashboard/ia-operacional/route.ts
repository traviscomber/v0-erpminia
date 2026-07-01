export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { getDashboardSnapshot } from '@/lib/api/dashboard-snapshot';

type AssetRow = {
  id?: string | number;
  name?: string | null;
  status?: string | null;
  criticality?: string | null;
  created_at?: string | null;
};

type ExpiringDocumentRow = {
  id?: string | number;
  title?: string | null;
  days_until_expiry?: number | null;
};

type StockItemRow = {
  id?: string | number;
  part_name?: string | null;
  part_code?: string | null;
  quantity_on_hand?: number | string | null;
};

type WorkOrderRow = {
  id?: string | number;
  title?: string | null;
  status?: string | null;
  scheduled_date?: string | null;
  created_at?: string | null;
};

type ContractRow = {
  id?: string | number;
  contractor_name?: string | null;
  title?: string | null;
  days_until_expiry?: number | string | null;
};

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const snapshot = await getDashboardSnapshot({ organizationId: context.organizationId, supabase: context.supabase });

    const criticalEquipment = (snapshot.assets as AssetRow[])
      .filter((asset) => {
        const status = String(asset.status || '').toLowerCase();
        const criticality = String(asset.criticality || '').toLowerCase();
        return ['critical', 'maintenance'].includes(status) || criticality === 'critical';
      })
      .slice(0, 5)
      .map((asset) => ({
        id: asset.id,
        name: asset.name,
        risk: String(asset.criticality || 'warning').toLowerCase() === 'critical' ? 'critical' : 'warning',
        status: String(asset.status || asset.criticality || 'warning').toUpperCase(),
        issue:
          String(asset.status || '').toLowerCase() === 'maintenance'
            ? 'Activo en mantenimiento preventivo o correctivo'
            : 'Activo marcado como crítico para seguimiento prioritario',
        action:
          String(asset.status || '').toLowerCase() === 'maintenance'
            ? 'Revisar programación de mantención'
            : 'Validar condición operacional y repuestos',
        timestamp: asset.created_at || new Date().toISOString(),
      }));

    const expiringDocuments = (snapshot.expiringDocuments as ExpiringDocumentRow[]).slice(0, 5).map((doc) => ({
      id: doc.id,
      title: doc.title,
      expiresIn: doc.days_until_expiry ?? 0,
    }));

    const criticalStock = (snapshot.lowStockItems as StockItemRow[]).slice(0, 5).map((item) => ({
      id: item.id,
      item: item.part_name || item.part_code,
      level: Number(item.quantity_on_hand || 0) === 0 ? 'critical' : 'warning',
      qty: Number(item.quantity_on_hand || 0),
    }));

    const pendingMaintenance = (snapshot.workOrders as WorkOrderRow[])
      .filter((order) => ['open', 'in_progress'].includes(String(order.status || '').toLowerCase()))
      .slice(0, 5)
      .map((order) => ({
        id: order.id,
        task: order.title,
        dueDate: order.scheduled_date || order.created_at || null,
      }));

    const overdueOrders = (snapshot.contracts as ContractRow[])
      .filter((contract) => Number(contract.days_until_expiry || 0) >= 0 && Number(contract.days_until_expiry || 0) <= 7)
      .slice(0, 5)
      .map((contract) => ({
        id: contract.id,
        supplier: contract.contractor_name || contract.title || 'Proveedor',
        days: Number(contract.days_until_expiry || 0),
      }));

    return NextResponse.json({
      insights: {
        equipment_risks: criticalEquipment.length,
        expiring_documents: expiringDocuments.length,
        critical_stock: criticalStock.length,
        pending_maintenance: pendingMaintenance.length,
        overdue_orders: overdueOrders.length,
        operational_efficiency: snapshot.insights.efficiency,
      },
      details: {
        critical_equipment: criticalEquipment,
        expiring_documents: expiringDocuments,
        critical_stock: criticalStock,
        pending_maintenance: pendingMaintenance,
        overdue_orders: overdueOrders,
      },
      lastAnalysis: new Date().toISOString(),
      nextUpdate: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error('[v0] Error in IA operacional API:', error);
    return NextResponse.json(
      { error: 'Error al cargar perspectivas IA' },
      { status: 500 }
    );
  }
}
