import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { listPendingApprovalsForUser } from '@/lib/api/documents';
import { getLegalComplianceOverview } from '@/lib/api/contracts';

type AlertSeverity = 'critica' | 'alta' | 'media' | 'baja' | 'info';
type AlertType =
  | 'documento'
  | 'mantenimiento'
  | 'inventario'
  | 'sostenibilidad'
  | 'contrato';

type AlertItem = {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  type: AlertType;
  timestamp: string;
  read: boolean;
  actionRequired: boolean;
  actionUrl: string;
};

function safeDate(value: string | null) {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function daysOverdue(value: string | null) {
  if (!value) return 0;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 0;
  return Math.max(
    0,
    Math.ceil((Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24))
  );
}

function severityFromPriority(priority: string | null): AlertSeverity {
  const normalized = String(priority || '').toLowerCase();
  if (normalized.includes('crit')) return 'critica';
  if (normalized.includes('high') || normalized.includes('alta')) return 'alta';
  if (normalized.includes('medium') || normalized.includes('media')) return 'media';
  if (normalized.includes('low') || normalized.includes('baja')) return 'baja';
  return 'info';
}

function severityFromDays(days: number, base: AlertSeverity = 'media'): AlertSeverity {
  if (days > 14) return 'critica';
  if (days > 7) return 'alta';
  if (days > 3) return base === 'baja' ? 'media' : base;
  return base;
}

async function safeQuery<T>(fn: () => Promise<T>, fallback: T) {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const [pendingApprovals, legalCompliance, workOrders, lowStockRows, overdueNCs, overdueCAs] =
      await Promise.all([
        safeQuery(
          () => listPendingApprovalsForUser(context.organizationId, context.userId),
          [] as any[]
        ),
        safeQuery(
          () => getLegalComplianceOverview(context.organizationId),
          {
            contracts_pending_review: [],
            expiring_contracts: [],
            expiring_documents: [],
          } as any
        ),
        safeQuery(
          async () => {
            const { data, error } = await context.supabase
              .from('maintenance_work_orders')
              .select('id, work_order_number, title, description, priority, status, created_at, scheduled_date, asset:maintenance_assets(asset_name)')
              .eq('organization_id', context.organizationId)
              .in('status', ['open', 'in_progress'])
              .order('created_at', { ascending: false })
              .limit(20);

            if (error) throw error;
            return data || [];
          },
          [] as any[]
        ),
        safeQuery(
          async () => {
            const { data, error } = await context.supabase
              .from('warehouse_stock')
              .select('id, part_code, part_name, quantity_on_hand, reorder_level, bin:warehouse_bins(bin_code, bin_location)')
              .eq('organization_id', context.organizationId)
              .order('quantity_on_hand', { ascending: true });

            if (error) throw error;
            return (data || []).filter(
              (item: any) =>
                item.reorder_level !== null &&
                item.reorder_level !== undefined &&
                Number(item.quantity_on_hand || 0) <= Number(item.reorder_level || 0)
            );
          },
          [] as any[]
        ),
        safeQuery(
          async () => {
            const { data, error } = await context.supabase
              .from('sostenibilidad_nonconformances')
              .select('id, nc_number, title, severity, target_closure_date, status')
              .eq('organization_id', context.organizationId)
              .lt('target_closure_date', new Date().toLocaleDateString('en-CA'))
              .neq('status', 'cerrada')
              .limit(20);

            if (error) throw error;
            return data || [];
          },
          [] as any[]
        ),
        safeQuery(
          async () => {
            const { data, error } = await context.supabase
              .from('sostenibilidad_corrective_actions')
              .select(
                'id, ca_number, action_description, scheduled_completion_date, status, nonconformance:sostenibilidad_nonconformances!inner(title, severity, organization_id)'
              )
              .lt('scheduled_completion_date', new Date().toLocaleDateString('en-CA'))
              .neq('status', 'verificada')
              .limit(20);

            if (error) throw error;
            return (data || []).filter((item: any) => {
              const nc = Array.isArray(item.nonconformance)
                ? item.nonconformance[0]
                : item.nonconformance;
              return nc.organization_id === context.organizationId;
            });
          },
          [] as any[]
        ),
      ]);

    const alerts: AlertItem[] = [];

    for (const approval of pendingApprovals) {
      alerts.push({
        id: `approval-${approval.id}`,
        title: `Aprobacion pendiente - ${approval.document.title}`,
        description: `Te corresponde revisar ${approval.levelName.toLowerCase()} del documento ${approval.document.documentNumber || approval.document.title}.`,
        severity: 'media',
        type: 'documento',
        timestamp: safeDate(approval.document.createdAt),
        read: false,
        actionRequired: true,
        actionUrl: '/dashboard/documentos',
      });
    }

    for (const contract of legalCompliance.contracts_pending_review || []) {
      alerts.push({
        id: `contract-review-${contract.id}`,
        title: `Contrato en revision - ${contract.title}`,
        description: 'Contrato pendiente de revision legal o compliance.',
        severity: 'alta',
        type: 'contrato',
        timestamp: new Date().toISOString(),
        read: false,
        actionRequired: true,
        actionUrl: '/dashboard/legal',
      });
    }

    for (const contract of legalCompliance.expiring_contracts || []) {
      const days = Number(contract.days_until_expiry || 0);
      alerts.push({
        id: `contract-expiring-${contract.id}`,
        title: `Contrato por vencer - ${contract.title}`,
        description: `Vence en ${days} dia${days === 1 ? '' : 's'}. Requiere seguimiento contractual.`,
        severity: days <= 7 ? 'critica' : 'alta',
        type: 'contrato',
        timestamp: safeDate(contract.end_date),
        read: false,
        actionRequired: true,
        actionUrl: '/dashboard/legal',
      });
    }

    for (const document of legalCompliance.expiring_documents || []) {
      const days = Math.max(0, Math.ceil((new Date(document.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      alerts.push({
        id: `document-expiring-${document.id}`,
        title: `Documento por vencer - ${document.title}`,
        description: `Documento regulatorio con vencimiento en ${days} dia${days === 1 ? '' : 's'}.`,
        severity: days <= 7 ? 'alta' : 'media',
        type: 'documento',
        timestamp: safeDate(document.expiry_date),
        read: false,
        actionRequired: true,
        actionUrl: '/dashboard/legal',
      });
    }

    for (const workOrder of workOrders) {
      const severity = severityFromPriority(workOrder.priority);
      if (!['critica', 'alta', 'media'].includes(severity)) continue;

      alerts.push({
        id: `wo-${workOrder.id}`,
        title: `${severity === 'critica' ? 'Orden critica' : 'Orden prioritaria'} - ${workOrder.title}`,
        description:
          workOrder.description ||
          `OT ${workOrder.work_order_number || ''} asociada a ${workOrder.asset?.asset_name || 'equipo operativo'}.`,
        severity,
        type: 'mantenimiento',
        timestamp: safeDate(workOrder.created_at || workOrder.scheduled_date),
        read: false,
        actionRequired: severity !== 'media' || workOrder.status === 'open',
        actionUrl: '/dashboard/work-orders',
      });
    }

    for (const stock of lowStockRows) {
      const current = Number(stock.quantity_on_hand || 0);
      const reorder = Number(stock.reorder_level || 0);
      alerts.push({
        id: `stock-${stock.id}`,
        title: `${current === 0 ? 'Stock agotado' : 'Stock bajo'} - ${stock.part_name || stock.part_code}`,
        description: `${stock.part_code || 'Item'} en ${stock.bin?.bin_code || stock.bin?.bin_location || 'bodega'} con ${current} unidad(es). Nivel de reorden: ${reorder}.`,
        severity: current === 0 ? 'critica' : 'alta',
        type: 'inventario',
        timestamp: new Date().toISOString(),
        read: false,
        actionRequired: true,
        actionUrl: '/dashboard/bodega',
      });
    }

    for (const nc of overdueNCs) {
      const overdueDays = daysOverdue(nc.target_closure_date);
      alerts.push({
        id: `nc-${nc.id}`,
        title: `No conformidad vencida - ${nc.nc_number || nc.title}`,
        description: `${nc.title}. Lleva ${overdueDays} dia${overdueDays === 1 ? '' : 's'} vencida.`,
        severity: severityFromDays(overdueDays, severityFromPriority(nc.severity)),
        type: 'sostenibilidad',
        timestamp: safeDate(nc.target_closure_date),
        read: false,
        actionRequired: true,
        actionUrl: '/dashboard/sostenibilidad',
      });
    }

    for (const ca of overdueCAs) {
      const overdueDays = daysOverdue(ca.scheduled_completion_date);
      const nc = Array.isArray(ca.nonconformance) ? ca.nonconformance[0] : ca.nonconformance;
      alerts.push({
        id: `ca-${ca.id}`,
        title: `Accion correctiva vencida - ${ca.ca_number || ca.action_description}`,
        description: `${ca.action_description}. Relacionada a ${nc.title || 'no conformidad'} y vencida hace ${overdueDays} dia${overdueDays === 1 ? '' : 's'}.`,
        severity: severityFromDays(overdueDays, severityFromPriority(nc.severity)),
        type: 'sostenibilidad',
        timestamp: safeDate(ca.scheduled_completion_date),
        read: false,
        actionRequired: true,
        actionUrl: '/dashboard/sostenibilidad',
      });
    }

    const severityRank: Record<AlertSeverity, number> = {
      critica: 5,
      alta: 4,
      media: 3,
      baja: 2,
      info: 1,
    };

    alerts.sort((left, right) => {
      const severityDiff = severityRank[right.severity] - severityRank[left.severity];
      if (severityDiff !== 0) return severityDiff;
      return new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime();
    });

    return NextResponse.json({
      alerts,
      stats: {
        total: alerts.length,
        unread: alerts.filter((alert) => !alert.read).length,
        critical: alerts.filter((alert) => alert.severity === 'critica').length,
        actionRequired: alerts.filter((alert) => alert.actionRequired).length,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch alerts';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
