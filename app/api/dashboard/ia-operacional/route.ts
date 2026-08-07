export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { getDashboardSnapshot } from '@/lib/api/dashboard-snapshot';

type WorkOrderRow = {
  id: string;
  work_order_number?: string | null;
  title?: string | null;
  status?: string | null;
  priority?: string | null;
  created_at?: string | null;
  scheduled_date?: string | null;
  completion_date?: string | null;
};

type StockRow = {
  id: string;
  part_name?: string | null;
  part_code?: string | null;
  quantity_on_hand?: number | string | null;
  reorder_level?: number | string | null;
};

type DocumentRow = {
  id: string;
  title?: string | null;
  expiry_date?: string | null;
  status?: string | null;
};

type ContractRow = {
  id: string;
  title?: string | null;
  contractor_name?: string | null;
  status?: string | null;
  days_until_expiry?: number | string | null;
  pending_amount?: number | string | null;
  review_due_date?: string | null;
  end_date?: string | null;
};

type PreventiveScheduleRow = {
  id: string;
  asset_id?: string | null;
  task_name?: string | null;
  next_scheduled_date?: string | null;
  priority?: string | null;
  enabled?: boolean | null;
  generated_work_order_id?: string | null;
};

type AssetRow = {
  id: string;
  asset_name?: string | null;
  asset_code?: string | null;
};

type Decision = {
  id: string;
  category: 'maintenance' | 'preventive' | 'inventory' | 'documents' | 'finance';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  responsibleArea: string;
  dueDate: string | null;
  amount: number | null;
  href: string;
  sourceId: string;
};

function normalize(value?: string | null) {
  return String(value || '').trim().toLowerCase();
}

function toNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function dateOnly(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function isBeforeToday(value?: string | null) {
  const normalized = dateOnly(value);
  if (!normalized) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${normalized}T00:00:00`);
  return target.getTime() < today.getTime();
}

function daysFromToday(value?: string | null) {
  const normalized = dateOnly(value);
  if (!normalized) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${normalized}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function inWindow(value: string | null | undefined, startMs: number, endMs: number) {
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) && timestamp >= startMs && timestamp < endMs;
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const [snapshot, preventiveResult, assetsResult] = await Promise.all([
      getDashboardSnapshot({ organizationId: context.organizationId, supabase: context.supabase }),
      context.supabase
        .from('preventive_maintenance_schedules')
        .select('id, asset_id, task_name, next_scheduled_date, priority, enabled, generated_work_order_id')
        .eq('organization_id', context.organizationId)
        .eq('enabled', true)
        .order('next_scheduled_date', { ascending: true, nullsFirst: false })
        .limit(250),
      context.supabase
        .from('maintenance_assets')
        .select('id, asset_name, asset_code')
        .eq('organization_id', context.organizationId)
        .limit(1000),
    ]);

    const sourceError = preventiveResult.error || assetsResult.error;
    if (sourceError) throw sourceError;

    const workOrders = (snapshot.workOrders || []) as WorkOrderRow[];
    const lowStockItems = (snapshot.lowStockItems || []) as StockRow[];
    const expiringDocuments = (snapshot.expiringDocuments || []) as DocumentRow[];
    const overdueFinancial = (snapshot.overdueFinancial || []) as ContractRow[];
    const expiringContracts = (snapshot.expiringContracts || []) as ContractRow[];
    const preventiveSchedules = (preventiveResult.data || []) as PreventiveScheduleRow[];
    const assets = (assetsResult.data || []) as AssetRow[];
    const assetsById = new Map(assets.map((asset) => [asset.id, asset]));

    const activeWorkOrders = workOrders.filter((order) => ['open', 'in_progress'].includes(normalize(order.status)));
    const overdueWorkOrders = activeWorkOrders.filter((order) => isBeforeToday(order.scheduled_date));
    const overdueIds = new Set(overdueWorkOrders.map((order) => order.id));
    const criticalWorkOrders = activeWorkOrders.filter(
      (order) => !overdueIds.has(order.id) && ['critical', 'high'].includes(normalize(order.priority)),
    );

    const decisions: Decision[] = [];

    overdueWorkOrders.forEach((order) => {
      const critical = ['critical', 'high'].includes(normalize(order.priority));
      decisions.push({
        id: `wo-overdue-${order.id}`,
        category: 'maintenance',
        severity: critical ? 'critical' : 'warning',
        title: order.work_order_number ? `OT ${order.work_order_number} vencida` : 'Orden de trabajo vencida',
        description: order.title || 'La fecha programada ya fue superada y la orden sigue abierta.',
        responsibleArea: 'Mantenimiento',
        dueDate: dateOnly(order.scheduled_date),
        amount: null,
        href: `/dashboard/mantenimiento/ordenes-trabajo/${order.id}`,
        sourceId: order.id,
      });
    });

    criticalWorkOrders.forEach((order) => {
      decisions.push({
        id: `wo-critical-${order.id}`,
        category: 'maintenance',
        severity: 'critical',
        title: order.work_order_number ? `OT ${order.work_order_number} de alta prioridad` : 'OT de alta prioridad',
        description: order.title || 'Orden abierta con prioridad alta o crítica.',
        responsibleArea: 'Mantenimiento',
        dueDate: dateOnly(order.scheduled_date),
        amount: null,
        href: `/dashboard/mantenimiento/ordenes-trabajo/${order.id}`,
        sourceId: order.id,
      });
    });

    preventiveSchedules.forEach((schedule) => {
      if (schedule.generated_work_order_id) return;
      const days = daysFromToday(schedule.next_scheduled_date);
      if (days === null || days > 30) return;
      const asset = schedule.asset_id ? assetsById.get(schedule.asset_id) : null;
      const assetName = asset?.asset_name || asset?.asset_code || 'equipo';
      decisions.push({
        id: `preventive-${schedule.id}`,
        category: 'preventive',
        severity: days < 0 ? 'critical' : days <= 7 ? 'warning' : 'info',
        title: days < 0 ? 'Preventivo vencido sin OT' : 'Preventivo próximo sin OT',
        description: `${schedule.task_name || 'Tarea preventiva'} · ${assetName}`,
        responsibleArea: 'Mantenimiento',
        dueDate: dateOnly(schedule.next_scheduled_date),
        amount: null,
        href: '/dashboard/mantenimiento/planificacion',
        sourceId: schedule.id,
      });
    });

    lowStockItems.forEach((item) => {
      const quantity = toNumber(item.quantity_on_hand);
      const reorder = toNumber(item.reorder_level);
      decisions.push({
        id: `stock-${item.id}`,
        category: 'inventory',
        severity: quantity <= 0 ? 'critical' : 'warning',
        title: quantity <= 0 ? 'Repuesto sin stock' : 'Repuesto bajo nivel de reorden',
        description: `${item.part_name || item.part_code || 'Ítem de inventario'} · Disponible ${quantity} / Reorden ${reorder}`,
        responsibleArea: 'Bodega / Compras',
        dueDate: null,
        amount: null,
        href: '/dashboard/bodega',
        sourceId: item.id,
      });
    });

    expiringDocuments.forEach((document) => {
      const days = daysFromToday(document.expiry_date);
      decisions.push({
        id: `document-${document.id}`,
        category: 'documents',
        severity: days !== null && days < 0 ? 'critical' : days !== null && days <= 7 ? 'warning' : 'info',
        title: days !== null && days < 0 ? 'Documento vencido' : 'Documento próximo a vencer',
        description: document.title || 'Documento con fecha de vencimiento registrada.',
        responsibleArea: 'Gestión documental',
        dueDate: dateOnly(document.expiry_date),
        amount: null,
        href: '/dashboard/documentos-gestion',
        sourceId: document.id,
      });
    });

    overdueFinancial.forEach((contract) => {
      const pending = toNumber(contract.pending_amount);
      decisions.push({
        id: `finance-${contract.id}`,
        category: 'finance',
        severity: pending > 0 ? 'warning' : 'info',
        title: 'Compromiso financiero vencido',
        description: contract.contractor_name || contract.title || 'Contrato con saldo pendiente y fecha vencida.',
        responsibleArea: 'Finanzas / Compras',
        dueDate: dateOnly(contract.review_due_date || contract.end_date),
        amount: pending,
        href: '/dashboard/finanzas',
        sourceId: contract.id,
      });
    });

    expiringContracts.forEach((contract) => {
      if (overdueFinancial.some((item) => item.id === contract.id)) return;
      decisions.push({
        id: `contract-${contract.id}`,
        category: 'finance',
        severity: toNumber(contract.days_until_expiry) <= 7 ? 'warning' : 'info',
        title: 'Contrato próximo a vencer',
        description: contract.contractor_name || contract.title || 'Contrato dentro de la ventana de 30 días.',
        responsibleArea: 'Administración / Finanzas',
        dueDate: dateOnly(contract.end_date),
        amount: toNumber(contract.pending_amount) || null,
        href: '/dashboard/documentos-gestion/contratos',
        sourceId: contract.id,
      });
    });

    const severityRank = { critical: 0, warning: 1, info: 2 } as const;
    decisions.sort((a, b) => {
      const severityDelta = severityRank[a.severity] - severityRank[b.severity];
      if (severityDelta !== 0) return severityDelta;
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return a.title.localeCompare(b.title);
    });

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 86400000;
    const fourteenDaysAgo = now - 14 * 86400000;
    const openedLast7 = workOrders.filter((order) => inWindow(order.created_at, sevenDaysAgo, now)).length;
    const openedPrevious7 = workOrders.filter((order) => inWindow(order.created_at, fourteenDaysAgo, sevenDaysAgo)).length;
    const completedLast7 = workOrders.filter((order) => inWindow(order.completion_date, sevenDaysAgo, now)).length;
    const completedPrevious7 = workOrders.filter((order) => inWindow(order.completion_date, fourteenDaysAgo, sevenDaysAgo)).length;

    return NextResponse.json({
      summary: {
        totalDecisions: decisions.length,
        critical: decisions.filter((item) => item.severity === 'critical').length,
        warning: decisions.filter((item) => item.severity === 'warning').length,
        overdueWorkOrders: overdueWorkOrders.length,
        preventiveDue: decisions.filter((item) => item.category === 'preventive').length,
        lowStock: lowStockItems.length,
        documentsAtRisk: expiringDocuments.length,
        financialPendingAmount: overdueFinancial.reduce((sum, item) => sum + toNumber(item.pending_amount), 0),
      },
      decisions,
      weeklyActivity: {
        openedWorkOrders: { current: openedLast7, previous: openedPrevious7 },
        completedWorkOrders: { current: completedLast7, previous: completedPrevious7 },
      },
      generatedAt: new Date().toISOString(),
      source: 'canonical',
    });
  } catch (error) {
    console.error('[executive-decisions] Failed to build canonical decision feed:', error);
    return NextResponse.json({ error: 'No se pudo cargar el centro ejecutivo de decisiones' }, { status: 500 });
  }
}
