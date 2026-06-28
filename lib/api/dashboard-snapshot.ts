import { DocumentService } from '@/lib/services/document.service';
import { listContractsForOrganization } from '@/lib/api/contracts';

type QueryResult<T> = {
  data: T | null;
  error: unknown;
};

type QueryBuilderLike = {
  select: (select: string) => QueryBuilderLike;
  eq: (column: string, value: string | number | boolean) => QueryBuilderLike;
  not: (column: string, operator: string, value: null) => QueryBuilderLike;
  lte: (column: string, value: string) => QueryBuilderLike;
  order: (column: string, options: { ascending: boolean }) => QueryBuilderLike;
  limit: (value: number) => QueryBuilderLike;
};

type SupabaseClientLike = {
  from: (table: string) => QueryBuilderLike;
};

type DocumentExpiryRow = {
  id: string;
  title?: string | null;
  expiry_date?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type WorkOrderRow = {
  id: string;
  work_order_number?: string | null;
  title?: string | null;
  work_type?: string | null;
  status?: string | null;
  priority?: string | null;
  created_at?: string | null;
  scheduled_date?: string | null;
  completion_date?: string | null;
  asset_id?: string | null;
};

type StockRow = {
  id: string;
  part_name?: string | null;
  part_code?: string | null;
  quantity_on_hand?: number | string | null;
  reorder_level?: number | string | null;
  unit_cost?: number | string | null;
  created_at?: string | null;
};

type CostCenterRow = {
  id: string;
  name?: string | null;
  code?: string | null;
  budget_annual?: number | string | null;
  budget_used?: number | string | null;
};

type ContractRow = {
  id: string;
  status?: string | null;
  days_until_expiry?: number | null;
  pending_amount?: number | string | null;
  review_due_date?: string | null;
  end_date?: string | null;
  start_date?: string | null;
  created_at?: string | null;
  contract_value?: number | string | null;
};

type EquipmentRow = {
  id: string;
  name?: string | null;
  status?: string | null;
  created_at?: string | null;
  criticality?: string | null;
};

type MaintenanceAssetRow = {
  id: string;
  asset_name?: string | null;
  status?: string | null;
  created_at?: string | null;
  criticality?: string | null;
};

type IncidentRow = {
  id: string;
  incident_type?: string | null;
  severity?: string | null;
  status?: string | null;
  date_reported?: string | null;
  description?: string | null;
};

type AssetCard = {
  id: string;
  name?: string | null;
  status?: string | null;
  created_at?: string | null;
  criticality?: string | null;
};

type WorkOrderCard = WorkOrderRow;
type StockCard = StockRow;
type ContractCard = ContractRow;
type IncidentCard = IncidentRow;

type DashboardSnapshotInput = {
  organizationId: string;
  supabase: SupabaseClientLike;
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeStatus(value?: string | null) {
  return String(value || '').trim().toLowerCase();
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthKey(dateValue?: string | null) {
  const date = new Date(dateValue || Date.now());
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 7);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(dateValue?: string | null) {
  const date = new Date(dateValue || Date.now());
  return date.toLocaleDateString('es-CL', { month: 'short' }).replace('.', '');
}

async function safeQuery<T>(fn: () => Promise<QueryResult<T>>, fallback: T): Promise<T> {
  try {
    const result = await fn();
    if (result.error) return fallback;
    return (result.data ?? fallback) as T;
  } catch {
    return fallback;
  }
}

function buildMonthSeries(keys: string[]) {
  return keys.map((key) => ({ key, label: monthLabel(`${key}-01`) }));
}

export async function getDashboardSnapshot({ organizationId, supabase }: DashboardSnapshotInput) {
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const sixMonthKeys = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return monthKey(date.toISOString());
  });
  const fourWeekKeys = Array.from({ length: 4 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (21 - index * 7));
    return date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });
  });

  const [documentStats, expiringDocuments, workOrders, stock, costCenters, contracts, productionEquipment, maintenanceAssets, incidents] = await Promise.all([
    DocumentService.getDashboardStats(organizationId),
    safeQuery(
      async () =>
        supabase
          .from('documents')
          .select('id, title, expiry_date, status, created_at')
          .eq('organization_id', organizationId)
          .not('expiry_date', 'is', null)
          .lte('expiry_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
          .order('expiry_date', { ascending: true })
          .limit(25),
      [] as DocumentExpiryRow[]
    ),
    safeQuery(
      async () =>
        supabase
          .from('maintenance_work_orders')
          .select('id, work_order_number, title, work_type, status, priority, created_at, scheduled_date, completion_date, asset_id')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(500),
      [] as WorkOrderRow[]
    ),
    safeQuery(
      async () =>
        supabase
          .from('warehouse_stock')
          .select('id, part_name, part_code, quantity_on_hand, reorder_level, unit_cost, created_at')
          .eq('organization_id', organizationId)
          .order('part_name', { ascending: true })
          .limit(1000),
      [] as StockRow[]
    ),
    safeQuery(
      async () =>
        supabase
          .from('cost_centers')
          .select('id, name, code, budget_annual, budget_used')
          .eq('organization_id', organizationId)
          .order('name', { ascending: true }),
      [] as CostCenterRow[]
    ),
    listContractsForOrganization(organizationId)
      .then((result) => result.contracts as ContractRow[])
      .catch(() => [] as ContractRow[]),
    safeQuery(
      async () => supabase.from('equipment').select('id, name, status, created_at').order('name', { ascending: true }),
      [] as EquipmentRow[]
    ),
    safeQuery(
      async () =>
        supabase
          .from('maintenance_assets')
          .select('id, asset_name, status, created_at, criticality')
          .eq('organization_id', organizationId)
          .order('asset_name', { ascending: true }),
      [] as MaintenanceAssetRow[]
    ),
    safeQuery(
      async () =>
        supabase
          .from('incidents')
          .select('id, incident_type, severity, status, date_reported, description')
          .order('date_reported', { ascending: false })
          .limit(50),
      [] as IncidentRow[]
    ),
  ]);

  const assets: AssetCard[] = productionEquipment.length > 0
    ? productionEquipment.map((item) => ({
        id: item.id,
        name: item.name,
        status: item.status,
        created_at: item.created_at,
      }))
    : maintenanceAssets.map((item) => ({
        id: item.id,
        name: item.asset_name,
        status: item.status,
        created_at: item.created_at,
        criticality: item.criticality,
      }));

  const lowStockItems = stock.filter((item) => toNumber(item.quantity_on_hand) <= toNumber(item.reorder_level));

  const openWorkOrders = workOrders.filter((item) => ['open', 'in_progress'].includes(normalizeStatus(item.status)));
  const preventiveOrders = workOrders.filter((item) => normalizeStatus(item.work_type) === 'preventive');
  const correctiveOrders = workOrders.filter((item) => normalizeStatus(item.work_type) === 'corrective');
  const criticalWorkOrders = openWorkOrders.filter((item) => ['critical', 'high'].includes(normalizeStatus(item.priority)));
  const overdueWorkOrders = openWorkOrders.filter((item) => {
    if (!item.scheduled_date) return false;
    return new Date(item.scheduled_date).getTime() < Date.now();
  });

  const pendingContracts = contracts.filter((item) => normalizeStatus(item.status).includes('revisi'));
  const expiringContracts = contracts.filter((item) =>
    typeof item.days_until_expiry === 'number' && item.days_until_expiry >= 0 && item.days_until_expiry <= 30
  );
  const overdueFinancial = contracts.filter((item) => {
    const pendingAmount = toNumber(item.pending_amount);
    const dueDate = item.review_due_date || item.end_date;
    if (!dueDate || pendingAmount <= 0) return false;
    return new Date(dueDate).getTime() < Date.now();
  });

  const operationalEquipment = assets.filter((item) => {
    const status = normalizeStatus(item.status);
    return ['operational', 'operativo', 'active', 'activo', 'running'].includes(status);
  }).length;

  const assetCount = Math.max(assets.length, 1);
  const corrective30d = correctiveOrders.filter((item) => {
    const created = new Date(item.created_at || item.scheduled_date || Date.now());
    return created.getTime() >= Date.now() - 30 * 24 * 60 * 60 * 1000;
  }).length;
  const mtbfHours = corrective30d > 0 ? Math.round((assetCount * 720) / corrective30d) : assetCount * 720;

  const latestIncidentDate = incidents[0]?.date_reported;
  const latestNCDate = expiringDocuments[0]?.created_at;
  const daysNoIncidents = latestIncidentDate
    ? Math.max(0, Math.floor((Date.now() - new Date(latestIncidentDate).getTime()) / (1000 * 60 * 60 * 24)))
    : latestNCDate
    ? Math.max(0, Math.floor((Date.now() - new Date(latestNCDate).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const validDocumentsPct = documentStats.total > 0
    ? Math.round((documentStats.approved / documentStats.total) * 100)
    : 100;
  const onTimePurchaseOrdersPct = contracts.length > 0
    ? Math.round(((contracts.length - overdueFinancial.length) / contracts.length) * 100)
    : 100;
  const operationalCostsMonthly = contracts
    .filter((item) => {
      const baseDate = new Date(item.start_date || item.created_at || Date.now());
      return baseDate >= currentMonthStart;
    })
    .reduce((sum: number, item) => sum + toNumber(item.contract_value), 0);

  const documentsHealth = documentStats.total > 0
    ? clamp(Math.round((documentStats.approved / documentStats.total) * 100) - expiringDocuments.length * 2)
    : 100;
  const maintenanceHealth = clamp(100 - overdueWorkOrders.length * 8 - criticalWorkOrders.length * 5);
  const inventoryHealth = stock.length > 0
    ? clamp(100 - Math.round((lowStockItems.length / stock.length) * 100 * 1.6))
    : 100;

  const moduleHealth = [
    { name: 'Documentos', value: documentsHealth, color: 'var(--color-chart-1)' },
    { name: 'Mantenimiento', value: maintenanceHealth, color: 'var(--color-chart-2)' },
    { name: 'Bodega', value: inventoryHealth, color: 'var(--color-chart-3)' },
  ];

  const trendByMonth = buildMonthSeries(sixMonthKeys).map(({ key, label }) => {
    const docMonth = expiringDocuments.filter((item) => monthKey(item.created_at) === key).length;
    const woMonth = workOrders.filter((item) => monthKey(item.created_at) === key).length;
    const contractMonth = contracts.filter((item) => monthKey(item.created_at) === key).length;

    const docScore = documentStats.total > 0 ? clamp(validDocumentsPct - docMonth) : 100;
    const maintenanceScore = clamp(100 - woMonth * 3);
    const inventoryScore = clamp(inventoryHealth - Math.max(0, lowStockItems.length - 1));

    return {
      mes: label,
      documentos: docScore,
      mantenimiento: maintenanceScore,
      inventario: inventoryScore,
      contracts: contractMonth,
    };
  });

  const trendData = fourWeekKeys.map((label, index) => ({
    date: label,
    equipos: clamp(operationalEquipment - (3 - index), 0, operationalEquipment + 2),
    mtbf: clamp(mtbfHours - (3 - index) * 20, 0, mtbfHours + 80),
    stock: clamp(lowStockItems.length + (index % 2 === 0 ? 1 : 0), 0, lowStockItems.length + 3),
  }));

  const alertsDistribution = [
    { name: 'Documentos', value: expiringDocuments.length, color: '#0ea5e9' },
    { name: 'Mantencion', value: criticalWorkOrders.length, color: '#f97316' },
    { name: 'Bodega', value: lowStockItems.length, color: '#ef4444' },
    { name: 'Contratos', value: overdueFinancial.length, color: '#10b981' },
  ].filter((item) => item.value > 0);

  const insights = {
    equipment_risks: criticalWorkOrders.length,
    expiring_documents: expiringDocuments.length,
    pending_maintenance: openWorkOrders.length,
    critical_stock_items: lowStockItems.length,
    overdue_orders: overdueFinancial.length,
    efficiency: clamp(
      Math.round(
        100 -
          criticalWorkOrders.length * 4 -
          lowStockItems.length * 3 -
          expiringDocuments.length * 2 -
          overdueFinancial.length * 2
      )
    ),
  };

  const recommendations = [
    criticalWorkOrders.length > 0
      ? {
          id: 'maintenance-critical',
          severity: 'critical',
          title: 'Priorizar mantencion critica',
          description: `${criticalWorkOrders.length} OT con prioridad alta o critica requieren seguimiento inmediato.`,
        }
      : null,
    lowStockItems.length > 0
      ? {
          id: 'stock-reorder',
          severity: 'warning',
          title: 'Acelerar reorden de repuestos',
          description: `${lowStockItems.length} item(s) ya estan bajo nivel de reorden.`,
        }
      : null,
    expiringDocuments.length > 0
      ? {
          id: 'docs-expiring',
          severity: 'warning',
          title: 'Regularizar documentos por vencer',
          description: `${expiringDocuments.length} documento(s) requieren gestion dentro de 30 dias.`,
        }
      : null,
    overdueFinancial.length > 0
      ? {
          id: 'finance-overdue',
          severity: 'info',
          title: 'Revisar compromisos financieros vencidos',
          description: `${overdueFinancial.length} compromiso(s) tienen monto pendiente y fecha vencida.`,
        }
      : null,
  ].filter(Boolean);

  return {
    documentStats,
    expiringDocuments,
    workOrders,
    stock,
    lowStockItems,
    costCenters,
    contracts,
    pendingContracts,
    expiringContracts,
    overdueFinancial,
    assets,
    operationalEquipment,
    mtbfHours,
    daysNoIncidents,
    validDocumentsPct,
    onTimePurchaseOrdersPct,
    operationalCostsMonthly,
    moduleHealth,
    trendByMonth,
    trendData,
    alertsDistribution,
    insights,
    recommendations,
    summary: {
      totalDocuments: documentStats.total,
      approvedDocuments: documentStats.approved,
      pendingDocuments: documentStats.pending,
      expiredDocuments: documentStats.expired,
      preventiveOrders: preventiveOrders.length,
      correctiveOrders: correctiveOrders.length,
      overdueWorkOrders: overdueWorkOrders.length,
      totalInventoryItems: stock.length,
      lowStockItems: lowStockItems.length,
      inventoryValue: stock.reduce((sum: number, item) => sum + toNumber(item.quantity_on_hand) * toNumber(item.unit_cost), 0),
      contractsPendingReview: pendingContracts.length,
      expiringContracts: expiringContracts.length,
      activeAlerts:
        expiringDocuments.length + criticalWorkOrders.length + lowStockItems.length + overdueFinancial.length,
    },
  };
}
