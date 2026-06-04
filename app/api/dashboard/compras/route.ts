import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { listContractsForOrganization } from '@/lib/api/contracts';

type ProcurementStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'received'
  | 'closed'
  | 'cancelled';

function normalizeText(value?: string | null) {
  return String(value || '').trim().toLowerCase();
}

function mapProcurementStatus(contract: any): ProcurementStatus {
  const status = normalizeText(contract.status);
  const compliance = normalizeText(contract.compliance_status);
  const contractValue = Number(contract.contract_value || 0);
  const paidAmount = Number(contract.paid_amount || 0);

  if (status.includes('borrador')) return 'draft';
  if (compliance.includes('incumpl')) return 'cancelled';
  if (status.includes('revisi') || compliance.includes('pendiente')) return 'pending';
  if (paidAmount > 0 && paidAmount < contractValue) return 'received';
  if (paidAmount >= contractValue && contractValue > 0) return 'closed';
  if (status.includes('vencido')) return 'closed';
  if (status.includes('vigente') || status.includes('vencer')) return 'approved';
  return 'pending';
}

function buildSupplierList(orders: any[]) {
  const supplierMap = new Map<string, { vendor: string; orders: number; amount: number }>();

  for (const order of orders) {
    const key = order.vendor || 'Sin proveedor';
    const existing = supplierMap.get(key) || { vendor: key, orders: 0, amount: 0 };
    existing.orders += 1;
    existing.amount += Number(order.amount || 0);
    supplierMap.set(key, existing);
  }

  return Array.from(supplierMap.values()).sort((left, right) => right.amount - left.amount);
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const searchParams = request.nextUrl.searchParams;
    const statusFilter = normalizeText(searchParams.get('status'));
    const search = searchParams.get('search');

    const { contracts } = await listContractsForOrganization(context.organizationId, search);

    const orders = contracts
      .map((contract) => {
        const status = mapProcurementStatus(contract);

        return {
          id: contract.contract_number || contract.id,
          contractId: contract.id,
          vendor: contract.contractor_name || contract.responsible_person || 'Sin proveedor',
          amount: Number(contract.contract_value || 0),
          status,
          statusLabel:
            status === 'draft'
              ? 'Borrador'
              : status === 'pending'
              ? 'Pendiente'
              : status === 'approved'
              ? 'Aprobada'
              : status === 'received'
              ? 'Recibida'
              : status === 'closed'
              ? 'Cerrada'
              : 'Cancelada',
          date: contract.start_date || contract.created_at,
          items: 1,
          title: contract.title,
          contractType: contract.contract_type,
          paidAmount: Number(contract.paid_amount || 0),
          pendingAmount: Math.max(
            Number(contract.contract_value || 0) - Number(contract.paid_amount || 0),
            0
          ),
        };
      })
      .filter((order) => (statusFilter && statusFilter !== 'all' ? order.status === statusFilter : true))
      .sort(
        (left, right) =>
          new Date(right.date || Date.now()).getTime() - new Date(left.date || Date.now()).getTime()
      );

    const pendingOrders = orders.filter(
      (order) => order.status === 'pending' || order.pendingAmount > 0
    ).length;

    return NextResponse.json({
      orders,
      totalValue: orders.reduce((sum, order) => sum + Number(order.amount || 0), 0),
      pendingOrders,
      suppliers: buildSupplierList(orders),
      stats: {
        total: orders.length,
        approved: orders.filter((order) => order.status === 'approved').length,
        received: orders.filter((order) => order.status === 'received').length,
        closed: orders.filter((order) => order.status === 'closed').length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch procurement data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
