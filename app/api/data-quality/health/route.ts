export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type HealthStatus = 'healthy' | 'watch' | 'critical' | 'unknown';

function daysOld(value?: string | null) {
  if (!value) return null;
  const ms = Date.now() - new Date(`${value}T00:00:00Z`).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

function freshnessStatus(days: number | null): HealthStatus {
  if (days === null) return 'unknown';
  if (days > 14) return 'critical';
  if (days > 7) return 'watch';
  return 'healthy';
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const org = context.organizationId;
    const [
      productionChecks,
      transportLatest,
      metallurgyLatest,
      drillingLatest,
      drillingQueue,
      inventoryOverview,
      inventorySnapshot,
      workOrders,
      poQuality,
      procurementExceptions,
      exceptionCenter,
    ] = await Promise.all([
      context.supabase.from('production_canonical_package_quality_v1').select('status').eq('organization_id', org),
      context.supabase.from('production_material_movements').select('movement_date').eq('organization_id', org).order('movement_date', { ascending: false }).limit(1),
      context.supabase.from('production_metallurgy_deterministic_v2').select('operation_date').eq('organization_id', org).order('operation_date', { ascending: false }).limit(1),
      context.supabase.from('production_drilling_source_reports').select('operation_date').eq('organization_id', org).order('operation_date', { ascending: false }).limit(1),
      context.supabase.from('production_drill_hole_location_review_queue_v5').select('drill_hole_id', { count: 'exact', head: true }).eq('organization_id', org),
      context.supabase.from('inventory_intelligence_overview_v1').select('*').eq('organization_id', org).maybeSingle(),
      context.supabase.from('canonical_inventory_current').select('snapshot_date').eq('organization_id', org).order('snapshot_date', { ascending: false }).limit(1),
      context.supabase.from('maintenance_work_orders').select('status, canonical_asset_id').eq('organization_id', org),
      context.supabase.from('purchase_order_quality').select('quality_status').eq('organization_id', org),
      context.supabase.from('procurement_match_exceptions').select('status').eq('organization_id', org),
      context.supabase.from('operational_exception_center_summary_v1').select('*').eq('organization_id', org).maybeSingle(),
    ]);

    const failures = [productionChecks, transportLatest, metallurgyLatest, drillingLatest, drillingQueue, inventoryOverview, inventorySnapshot, workOrders, poQuality, procurementExceptions, exceptionCenter]
      .map((result: any) => result.error)
      .filter(Boolean);
    if (failures.length) throw failures[0];

    const transportDate = transportLatest.data?.[0]?.movement_date || null;
    const metallurgyDate = metallurgyLatest.data?.[0]?.operation_date || null;
    const drillingDate = drillingLatest.data?.[0]?.operation_date || null;
    const inventoryDate = inventorySnapshot.data?.[0]?.snapshot_date || null;

    const prodChecks = productionChecks.data || [];
    const productionFailed = prodChecks.filter((row: any) => !['PASS', 'pass'].includes(String(row.status))).length;
    const productionFreshness = [transportDate, metallurgyDate, drillingDate].map(daysOld);
    const productionWorstAge = Math.max(...productionFreshness.filter((value): value is number => value !== null), 0);
    const productionStatus: HealthStatus = productionFailed > 0 ? 'critical' : freshnessStatus(productionWorstAge);

    const inventory = inventoryOverview.data as any;
    const negativeStock = Number(inventory?.negative_stock_products || 0);
    const inventoryAge = daysOld(inventoryDate);
    const inventoryStatus: HealthStatus = negativeStock > 0 ? 'critical' : freshnessStatus(inventoryAge);

    const closedStatuses = new Set(['completed', 'closed', 'cancelled', 'canceled']);
    const allWorkOrders = workOrders.data || [];
    const openWorkOrders = allWorkOrders.filter((row: any) => !closedStatuses.has(String(row.status || '').toLowerCase()));
    const openMissingAsset = openWorkOrders.filter((row: any) => !row.canonical_asset_id).length;
    const historicalMissingAsset = allWorkOrders.filter((row: any) => !row.canonical_asset_id).length;
    const maintenanceStatus: HealthStatus = openMissingAsset > 0 ? 'critical' : 'healthy';

    const poRows = poQuality.data || [];
    const poWarnings = poRows.filter((row: any) => String(row.quality_status).toLowerCase() !== 'valid').length;
    const openProcurementExceptions = (procurementExceptions.data || []).filter((row: any) => !['resolved', 'closed', 'ignored'].includes(String(row.status || '').toLowerCase())).length;
    const procurementStatus: HealthStatus = openProcurementExceptions > 0 ? 'critical' : poWarnings > 0 ? 'watch' : 'healthy';

    const domains = [
      {
        key: 'production',
        label: 'Producción',
        status: productionStatus,
        headline: productionFailed > 0 ? `${productionFailed} check(s) canónicos fuera de PASS` : `${prodChecks.length}/${prodChecks.length} checks canónicos PASS`,
        metrics: [
          { label: 'Transporte · último dato', value: transportDate, ageDays: daysOld(transportDate) },
          { label: 'Planta · último dato', value: metallurgyDate, ageDays: daysOld(metallurgyDate) },
          { label: 'Sondaje · último dato', value: drillingDate, ageDays: daysOld(drillingDate) },
          { label: 'Ubicaciones Sondaje pendientes', value: drillingQueue.count || 0 },
        ],
        action: productionFailed > 0 ? 'Revisar checks canónicos antes de usar indicadores.' : productionWorstAge > 7 ? 'Actualizar las fuentes operacionales atrasadas.' : 'Sin acción de calidad prioritaria.',
        href: '/dashboard/produccion/inteligencia',
      },
      {
        key: 'maintenance',
        label: 'Mantención',
        status: maintenanceStatus,
        headline: openMissingAsset > 0 ? `${openMissingAsset} OT activa(s) sin activo canónico` : 'OT activas con identidad de equipo consistente',
        metrics: [
          { label: 'OT abiertas', value: openWorkOrders.length },
          { label: 'OT activas sin equipo', value: openMissingAsset },
          { label: 'Deuda histórica sin equipo', value: historicalMissingAsset },
          { label: 'Excepciones operacionales Mantención', value: Number((exceptionCenter.data as any)?.maintenance_items || 0) },
        ],
        action: openMissingAsset > 0 ? 'Resolver identidad del equipo en las OT activas.' : 'Mantener conciliación de activos en nuevas OT.',
        href: '/dashboard/mantenimiento/inteligencia',
      },
      {
        key: 'inventory',
        label: 'Inventario',
        status: inventoryStatus,
        headline: negativeStock > 0 ? `${negativeStock} producto(s) con stock negativo` : 'Sin stock negativo detectado',
        metrics: [
          { label: 'Snapshot más reciente', value: inventoryDate, ageDays: inventoryAge },
          { label: 'Productos con stock', value: Number(inventory?.products_with_stock || 0) },
          { label: 'Sin stock', value: Number(inventory?.out_of_stock_products || 0) },
          { label: 'Bajo punto de reposición', value: Number(inventory?.reorder_products || 0) },
        ],
        action: negativeStock > 0 ? 'Conciliar movimientos y saldos negativos antes de decisiones de abastecimiento.' : inventoryAge !== null && inventoryAge > 7 ? 'Actualizar snapshot de inventario.' : 'Sin acción de calidad prioritaria.',
        href: '/dashboard/bodega',
      },
      {
        key: 'procurement',
        label: 'Compras',
        status: procurementStatus,
        headline: openProcurementExceptions > 0 ? `${openProcurementExceptions} excepción(es) de matching abiertas` : `${poWarnings} OC con warning de calidad`,
        metrics: [
          { label: 'OC evaluadas', value: poRows.length },
          { label: 'OC válidas', value: poRows.length - poWarnings },
          { label: 'OC con warning', value: poWarnings },
          { label: 'Excepciones de matching abiertas', value: openProcurementExceptions },
        ],
        action: openProcurementExceptions > 0 ? 'Resolver excepciones de matching antes del cierre de compra.' : poWarnings > 0 ? 'Revisar las OC con warning; no implican bloqueo automático.' : 'Sin acción de calidad prioritaria.',
        href: '/dashboard/compras',
      },
    ];

    const rank: Record<HealthStatus, number> = { critical: 3, watch: 2, unknown: 1, healthy: 0 };
    const overall = domains.reduce<HealthStatus>((worst, domain) => rank[domain.status as HealthStatus] > rank[worst] ? domain.status as HealthStatus : worst, 'healthy');

    return NextResponse.json({ overall, domains, generatedAt: new Date().toISOString(), policy: { freshnessWatchDays: 7, freshnessCriticalDays: 14 } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo calcular la salud de datos';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
