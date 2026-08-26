export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

type FreshnessStatus = 'fresh' | 'watch' | 'stale' | 'missing';

function daysSince(value: string | null | undefined) {
  if (!value) return null;
  const source = new Date(`${value}T12:00:00Z`).getTime();
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12);
  return Math.max(0, Math.floor((today - source) / 86400000));
}

function classify(ageDays: number | null, freshDays: number, watchDays: number): FreshnessStatus {
  if (ageDays === null) return 'missing';
  if (ageDays <= freshDays) return 'fresh';
  if (ageDays <= watchDays) return 'watch';
  return 'stale';
}

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.PROD_OPERACIONES);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const [transport, plant, drilling, reviewQueue] = await Promise.all([
    context.supabase
      .from('production_material_movements')
      .select('movement_date')
      .eq('organization_id', context.organizationId)
      .eq('normalization_status', 'approved')
      .order('movement_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    context.supabase
      .from('production_metallurgy_deterministic_v2')
      .select('operation_date')
      .eq('organization_id', context.organizationId)
      .order('operation_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    context.supabase
      .from('production_drilling_operational_summary_v1')
      .select('max_date,report_rows,drilled_meters,holes,rigs,operators')
      .eq('organization_id', context.organizationId)
      .maybeSingle(),
    context.supabase
      .from('drilling_maintenance_review_queue_v1')
      .select('source_report_id,canonical_asset_id,asset_code,asset_name,operation_date,review_reason,equipment_status_raw,machine_observations,review_status,has_linked_work_order,linked_work_order_id')
      .eq('organization_id', context.organizationId)
      .eq('review_status', 'pending')
      .order('operation_date', { ascending: false }),
  ]);

  const error = transport.error || plant.error || drilling.error || reviewQueue.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const assetIds = [...new Set((reviewQueue.data || []).map((row) => row.canonical_asset_id).filter(Boolean))] as string[];
  const [workOrders, availability] = assetIds.length
    ? await Promise.all([
        context.supabase
          .from('maintenance_operational_work_order_flow_v1')
          .select('work_order_id,work_order_number,canonical_asset_id,status,priority,flow_status,scheduled_date,start_date')
          .eq('organization_id', context.organizationId)
          .in('canonical_asset_id', assetIds),
        context.supabase
          .from('asset_availability_daily_v1')
          .select('canonical_asset_id,asset_code,asset_name,operating_date,availability_pct,unplanned_downtime_minutes,validation_status')
          .eq('organization_id', context.organizationId)
          .in('canonical_asset_id', assetIds)
          .order('operating_date', { ascending: false }),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];

  if (workOrders.error || availability.error) {
    return NextResponse.json({ error: workOrders.error?.message || availability.error?.message }, { status: 500 });
  }

  const closedStatuses = new Set(['completed', 'closed', 'cancelled', 'canceled']);
  const activeOrdersByAsset = new Map<string, any[]>();
  for (const order of workOrders.data || []) {
    if (!order.canonical_asset_id || closedStatuses.has(String(order.status || '').toLowerCase())) continue;
    const rows = activeOrdersByAsset.get(order.canonical_asset_id) || [];
    rows.push(order);
    activeOrdersByAsset.set(order.canonical_asset_id, rows);
  }

  const latestAvailabilityByAsset = new Map<string, any>();
  for (const row of availability.data || []) {
    if (!row.canonical_asset_id || latestAvailabilityByAsset.has(row.canonical_asset_id)) continue;
    latestAvailabilityByAsset.set(row.canonical_asset_id, row);
  }

  const transportDate = transport.data?.movement_date || null;
  const plantDate = plant.data?.operation_date || null;
  const drillingDate = drilling.data?.max_date || null;

  const transportAge = daysSince(transportDate);
  const plantAge = daysSince(plantDate);
  const drillingAge = daysSince(drillingDate);

  const maintenanceSignals = (reviewQueue.data || []).map((row) => {
    const activeOrders = row.canonical_asset_id ? activeOrdersByAsset.get(row.canonical_asset_id) || [] : [];
    const latestAvailability = row.canonical_asset_id ? latestAvailabilityByAsset.get(row.canonical_asset_id) || null : null;
    const rawStatus = String(row.equipment_status_raw || '').toLocaleLowerCase('es-CL');
    const severity = rawStatus.includes('fuera de servicio') ? 'critical' : 'warning';
    return {
      sourceReportId: row.source_report_id,
      canonicalAssetId: row.canonical_asset_id,
      assetCode: row.asset_code,
      assetName: row.asset_name,
      operationDate: row.operation_date,
      reviewReason: row.review_reason,
      equipmentStatusRaw: row.equipment_status_raw,
      machineObservations: row.machine_observations,
      severity,
      hasLinkedWorkOrder: Boolean(row.has_linked_work_order || row.linked_work_order_id || activeOrders.length),
      activeWorkOrders: activeOrders.map((order) => ({
        id: order.work_order_id,
        number: order.work_order_number,
        status: order.status,
        priority: order.priority,
        flowStatus: order.flow_status,
      })),
      availability: latestAvailability
        ? {
            date: latestAvailability.operating_date,
            pct: latestAvailability.availability_pct,
            unplannedDowntimeMinutes: latestAvailability.unplanned_downtime_minutes,
            validationStatus: latestAvailability.validation_status,
          }
        : null,
      action: activeOrders.length || row.has_linked_work_order || row.linked_work_order_id
        ? 'Revisar la OT activa y confirmar impacto operacional antes del próximo turno.'
        : severity === 'critical'
          ? 'Crear o vincular una OT de Mantención; el equipo está reportado fuera de servicio.'
          : 'Revisar la observación y decidir si requiere OT antes de que evolucione a indisponibilidad.',
    };
  });

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    freshness: {
      transport: { through: transportDate, ageDays: transportAge, status: classify(transportAge, 2, 5) },
      plant: { through: plantDate, ageDays: plantAge, status: classify(plantAge, 2, 5) },
      drilling: { through: drillingDate, ageDays: drillingAge, status: classify(drillingAge, 3, 7) },
    },
    sourcePolicy: {
      fresh: 'Fuente utilizable como lectura operacional actual.',
      watch: 'Fuente utilizable con cautela; mostrar fecha de corte y evitar inferencias de hoy.',
      stale: 'No usar para concluir estado operacional actual sin una actualización de fuente.',
    },
    drillingMaintenance: {
      linkedHoles: 400,
      pendingReviews: maintenanceSignals.length,
      withoutWorkOrder: maintenanceSignals.filter((item) => !item.hasLinkedWorkOrder).length,
      criticalWithoutWorkOrder: maintenanceSignals.filter((item) => item.severity === 'critical' && !item.hasLinkedWorkOrder).length,
      signals: maintenanceSignals,
      policy: 'La relación usa canonical_asset_id proveniente del linaje Sondaje↔Activo; no se infiere causalidad por coincidencia de nombre.',
    },
  });
}
