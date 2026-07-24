export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type AlertLevel = 'critical' | 'warning' | 'info';

type MaintenanceAlert = {
  id: string;
  level: AlertLevel;
  type: string;
  title: string;
  message: string;
  value: number;
  threshold: number;
  assetId?: string;
  assetCode?: string;
  assetName?: string;
  zone?: string;
  workOrderNumber?: string;
  createdAt: string;
};

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const now = new Date().toISOString();
    const alerts: MaintenanceAlert[] = [];

    // 1. Availability alert — pull from cost_centers + maintenance_assets
    const [{ data: costCenters }, { data: maintenanceAssets }] = await Promise.all([
      context.supabase
        .from('cost_centers')
        .select('id, code, name, status')
        .eq('organization_id', context.organizationId),
      context.supabase
        .from('maintenance_assets')
        .select('id, status, work_orders:maintenance_work_orders(id, status)')
        .eq('organization_id', context.organizationId),
    ]);

    const assetLookup = new Map<string, { status: string | null; work_orders: Array<{ id: string; status: string }> | null }>();
    for (const a of (maintenanceAssets || [])) {
      assetLookup.set(a.id, { status: a.status, work_orders: a.work_orders });
    }

    const allAssets = (costCenters || []).map((cc) => {
      const enriched = assetLookup.get(cc.id);
      const effectiveStatus = enriched?.status ?? cc.status ?? 'activo';
      const openWOs = (enriched?.work_orders || []).filter((wo) =>
        ['in_progress', 'assigned', 'open'].includes(wo.status ?? '')
      );
      return { id: cc.id, code: cc.code, name: cc.name, status: effectiveStatus, openWOs };
    });

    const total = allAssets.length;
    const inMaintenance = allAssets.filter((a) => a.openWOs.length > 0 || a.status === 'maintenance').length;
    const critical = allAssets.filter((a) => a.status === 'critical').length;
    const availabilityPct = total > 0 ? Math.round(((total - inMaintenance - critical) / total) * 100) : 100;

    if (availabilityPct < 60) {
      alerts.push({
        id: 'avail-critical',
        level: 'critical',
        type: 'availability',
        title: 'Disponibilidad critica de flota',
        message: `Solo el ${availabilityPct}% de la flota operativa. Se requiere accion inmediata.`,
        value: availabilityPct,
        threshold: 60,
        createdAt: now,
      });
    } else if (availabilityPct < 70) {
      alerts.push({
        id: 'avail-warning',
        level: 'warning',
        type: 'availability',
        title: 'Disponibilidad bajo el umbral',
        message: `La disponibilidad de flota es ${availabilityPct}% (umbral: 70%). Revisar equipos en mantencion.`,
        value: availabilityPct,
        threshold: 70,
        createdAt: now,
      });
    }

    // Individual asset alerts for critical or overdue maintenance
    for (const asset of allAssets.filter((a) => a.status === 'critical').slice(0, 5)) {
      alerts.push({
        id: `asset-critical-${asset.id}`,
        level: 'critical',
        type: 'asset_status',
        title: `Equipo en estado critico`,
        message: `${asset.name ?? asset.code ?? asset.id} requiere atencion urgente.`,
        value: 0,
        threshold: 0,
        assetId: asset.id,
        assetCode: asset.code ?? undefined,
        assetName: asset.name ?? undefined,
        createdAt: now,
      });
    }

    // 2. Overdue work orders (past scheduled_date and still pending/open)
    const { data: overdueWOs } = await context.supabase
      .from('maintenance_work_orders')
      .select('id, work_order_number, title, scheduled_date, priority, cost_center_id')
      .eq('organization_id', context.organizationId)
      .in('status', ['pending', 'open', 'assigned'])
      .lt('scheduled_date', now)
      .not('scheduled_date', 'is', null)
      .order('scheduled_date', { ascending: true })
      .limit(10);

    for (const wo of (overdueWOs || []).slice(0, 5)) {
      const daysOverdue = Math.floor(
        (Date.now() - new Date(wo.scheduled_date!).getTime()) / (1000 * 60 * 60 * 24)
      );
      alerts.push({
        id: `wo-overdue-${wo.id}`,
        level: wo.priority === 'critical' || wo.priority === 'high' ? 'critical' : 'warning',
        type: 'overdue_work_order',
        title: `OT vencida hace ${daysOverdue} dia${daysOverdue !== 1 ? 's' : ''}`,
        message: wo.title ?? wo.work_order_number ?? 'Orden sin titulo',
        value: daysOverdue,
        threshold: 0,
        workOrderNumber: wo.work_order_number,
        createdAt: now,
      });
    }

    // 3. Tire stock below reorder level
    const { data: lowStock } = await context.supabase
      .from('warehouse_stock')
      .select('id, part_code, part_name, quantity_on_hand, reorder_level')
      .eq('organization_id', context.organizationId)
      .or('part_code.ilike.NEU-%,part_name.ilike.Neumático%,part_name.ilike.Llanta%')
      .gt('reorder_level', 0);

    for (const item of (lowStock || []).filter((s) => Number(s.quantity_on_hand) <= Number(s.reorder_level)).slice(0, 5)) {
      alerts.push({
        id: `stock-low-${item.id}`,
        level: Number(item.quantity_on_hand) === 0 ? 'critical' : 'warning',
        type: 'low_stock',
        title: Number(item.quantity_on_hand) === 0 ? 'Sin stock' : 'Stock bajo minimo',
        message: `${item.part_name}: ${item.quantity_on_hand} unidades (minimo: ${item.reorder_level})`,
        value: Number(item.quantity_on_hand),
        threshold: Number(item.reorder_level),
        createdAt: now,
      });
    }

    // Sort: critical first, then warning, then info
    alerts.sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 };
      return (order[a.level] ?? 3) - (order[b.level] ?? 3);
    });

    return NextResponse.json({
      alerts,
      summary: {
        total: alerts.length,
        critical: alerts.filter((a) => a.level === 'critical').length,
        warning: alerts.filter((a) => a.level === 'warning').length,
        availabilityPct,
        hasAvailabilityAlert: availabilityPct < 70,
      },
      timestamp: now,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al cargar alertas';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
