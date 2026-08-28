import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

type CanonicalAssetRow = {
  id: string;
  asset_code: string;
  name: string;
  asset_type: string | null;
  category: string | null;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  license_plate: string | null;
  cost_center_code: string | null;
  location: string | null;
  operational_status: string | null;
  criticality: string | null;
  acquisition_date: string | null;
  is_active: boolean;
  validation_status: string | null;
  validation_notes: string[] | null;
  source_file: string | null;
  source_sheet: string | null;
  source_row: number | null;
  updated_at: string | null;
};

const increment = (map: Map<string, number>, id: string, value = 1) => map.set(id, (map.get(id) || 0) + value);

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_OPERACIONES);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const [assetsResult, closeResult, preventiveResult, runtimeResult, reliabilityResult, runtimeReliabilityResult] = await Promise.all([
      context.supabase
        .from('canonical_assets_current')
        .select('id,asset_code,name,asset_type,category,manufacturer,model,serial_number,license_plate,cost_center_code,location,operational_status,criticality,acquisition_date,is_active,validation_status,validation_notes,source_file,source_sheet,source_row,updated_at')
        .eq('organization_id', context.organizationId)
        .eq('is_active', true)
        .order('name', { ascending: true }),
      context.supabase
        .from('work_order_close_readiness_v2')
        .select('canonical_asset_id,work_order_id,open_procurement_orders,pending_parts,unmet_material_requirements,pending_external_services,open_labor_entries,external_cost_conflict,standard_plan_steps_pending,ready_to_close,next_action')
        .eq('organization_id', context.organizationId)
        .not('canonical_asset_id', 'is', null),
      context.supabase
        .from('preventive_maintenance_hour_status_v1')
        .select('canonical_asset_id,task_name,remaining_hours,alert_due,hour_status')
        .eq('organization_id', context.organizationId)
        .eq('enabled', true)
        .not('canonical_asset_id', 'is', null),
      context.supabase
        .from('asset_runtime_summary_v1')
        .select('canonical_asset_id,reading_count,latest_meter_hours,last_reading_at')
        .eq('organization_id', context.organizationId),
      context.supabase
        .from('maintenance_reliability_by_asset_v1')
        .select('canonical_asset_id,audited_closures,recurring_cause_count')
        .eq('organization_id', context.organizationId),
      context.supabase
        .from('maintenance_runtime_reliability_by_asset_v1')
        .select('canonical_asset_id,valid_mtbf_intervals,mtbf_operating_hours')
        .eq('organization_id', context.organizationId),
    ]);

    const firstError = assetsResult.error || closeResult.error || preventiveResult.error || runtimeResult.error || reliabilityResult.error || runtimeReliabilityResult.error;
    if (firstError) throw firstError;

    const openByAsset = new Map<string, number>();
    const blockersByAsset = new Map<string, number>();
    const pendingStepsByAsset = new Map<string, number>();
    const readyByAsset = new Map<string, number>();
    const closeRowsByAsset = new Map<string, any[]>();
    for (const row of closeResult.data || []) {
      const id = String(row.canonical_asset_id || '');
      if (!id) continue;
      increment(openByAsset, id);
      const blocked = Number(row.open_procurement_orders || 0) > 0 || Number(row.pending_parts || 0) > 0 || Number(row.unmet_material_requirements || 0) > 0 || Number(row.pending_external_services || 0) > 0 || Number(row.open_labor_entries || 0) > 0 || Boolean(row.external_cost_conflict);
      if (blocked) increment(blockersByAsset, id);
      increment(pendingStepsByAsset, id, Number(row.standard_plan_steps_pending || 0));
      if (row.ready_to_close) increment(readyByAsset, id);
      closeRowsByAsset.set(id, [...(closeRowsByAsset.get(id) || []), row]);
    }

    const preventiveByAsset = new Map<string, any[]>();
    for (const row of preventiveResult.data || []) {
      const id = String(row.canonical_asset_id || '');
      if (!id) continue;
      preventiveByAsset.set(id, [...(preventiveByAsset.get(id) || []), row]);
    }
    for (const [id, rows] of preventiveByAsset) {
      rows.sort((a, b) => {
        if (Boolean(a.alert_due) !== Boolean(b.alert_due)) return a.alert_due ? -1 : 1;
        const ar = a.remaining_hours == null ? Number.POSITIVE_INFINITY : Number(a.remaining_hours);
        const br = b.remaining_hours == null ? Number.POSITIVE_INFINITY : Number(b.remaining_hours);
        return ar - br;
      });
      preventiveByAsset.set(id, rows);
    }

    const runtimeByAsset = new Map((runtimeResult.data || []).map((row: any) => [String(row.canonical_asset_id), row]));
    const reliabilityByAsset = new Map((reliabilityResult.data || []).map((row: any) => [String(row.canonical_asset_id), row]));
    const runtimeReliabilityByAsset = new Map((runtimeReliabilityResult.data || []).map((row: any) => [String(row.canonical_asset_id), row]));

    const assets = ((assetsResult.data || []) as CanonicalAssetRow[]).map((asset) => {
      const id = asset.id;
      const preventives = preventiveByAsset.get(id) || [];
      const overduePreventives = preventives.filter((row) => Boolean(row.alert_due)).length;
      const nextPreventive = preventives[0] || null;
      const runtime = runtimeByAsset.get(id) as any;
      const reliability = reliabilityByAsset.get(id) as any;
      const runtimeReliability = runtimeReliabilityByAsset.get(id) as any;
      const openWorkOrders = openByAsset.get(id) || 0;
      const operationalBlockers = blockersByAsset.get(id) || 0;
      const pendingPlanSteps = pendingStepsByAsset.get(id) || 0;
      const readyToClose = readyByAsset.get(id) || 0;

      let nextAction = 'Ver Ficha 360';
      let nextActionHref = `/dashboard/mantenimiento/equipos/${encodeURIComponent(id)}/ficha`;
      if (overduePreventives > 0) {
        nextAction = 'Planificar preventivo';
        nextActionHref = '/dashboard/mantenimiento/preventivo-horas';
      } else if (operationalBlockers > 0) {
        nextAction = 'Resolver bloqueo';
        const row = (closeRowsByAsset.get(id) || []).find((item) => Number(item.open_procurement_orders || 0) > 0 || Number(item.pending_parts || 0) > 0 || Number(item.unmet_material_requirements || 0) > 0 || Number(item.pending_external_services || 0) > 0 || Number(item.open_labor_entries || 0) > 0 || Boolean(item.external_cost_conflict));
        nextActionHref = row ? `/dashboard/mantenimiento/ordenes-trabajo/cierre?workOrderId=${encodeURIComponent(row.work_order_id)}` : '/dashboard/mantenimiento/ordenes-trabajo/cierre';
      } else if (pendingPlanSteps > 0) {
        nextAction = 'Ejecutar procedimiento';
        const row = (closeRowsByAsset.get(id) || []).find((item) => Number(item.standard_plan_steps_pending || 0) > 0);
        nextActionHref = row ? `/dashboard/mantenimiento/ordenes-trabajo/cierre?workOrderId=${encodeURIComponent(row.work_order_id)}` : '/dashboard/mantenimiento/ordenes-trabajo/cierre';
      } else if (readyToClose > 0) {
        nextAction = 'Cerrar OT';
        const row = (closeRowsByAsset.get(id) || []).find((item) => Boolean(item.ready_to_close));
        nextActionHref = row ? `/dashboard/mantenimiento/ordenes-trabajo/cierre?workOrderId=${encodeURIComponent(row.work_order_id)}` : '/dashboard/mantenimiento/ordenes-trabajo/cierre';
      } else if (openWorkOrders > 0) {
        nextAction = 'Completar evidencia';
        const row = (closeRowsByAsset.get(id) || [])[0];
        nextActionHref = row ? `/dashboard/mantenimiento/ordenes-trabajo/cierre?workOrderId=${encodeURIComponent(row.work_order_id)}` : '/dashboard/mantenimiento/ordenes-trabajo/cierre';
      }

      return {
        id,
        asset_id: id,
        source: 'canonical_asset' as const,
        code: asset.asset_code,
        name: asset.name,
        model: asset.model,
        serial_number: asset.serial_number,
        type: asset.asset_type || asset.category || 'Activo',
        status: asset.operational_status || (asset.is_active ? 'Activo' : 'Inactivo'),
        criticality: asset.criticality,
        purchase_date: asset.acquisition_date,
        last_maintenance: null,
        next_maintenance: null,
        specs: {
          manufacturer: asset.manufacturer,
          category: asset.category,
          license_plate: asset.license_plate,
          cost_center_code: asset.cost_center_code,
          location: asset.location,
          validation_status: asset.validation_status,
          validation_notes: asset.validation_notes,
          source_file: asset.source_file,
          source_sheet: asset.source_sheet,
          source_row: asset.source_row,
          updated_at: asset.updated_at,
        },
        operational: {
          openWorkOrders,
          operationalBlockers,
          pendingPlanSteps,
          readyToClose,
          overduePreventives,
          nextPreventiveTask: nextPreventive?.task_name || null,
          nextPreventiveRemainingHours: nextPreventive?.remaining_hours == null ? null : Number(nextPreventive.remaining_hours),
          latestMeterHours: runtime?.latest_meter_hours == null ? null : Number(runtime.latest_meter_hours),
          runtimeReadingCount: Number(runtime?.reading_count || 0),
          auditedClosures: Number(reliability?.audited_closures || 0),
          recurringCauseCount: Number(reliability?.recurring_cause_count || 0),
          validMtbfIntervals: Number(runtimeReliability?.valid_mtbf_intervals || 0),
          mtbfOperatingHours: runtimeReliability?.mtbf_operating_hours == null ? null : Number(runtimeReliability.mtbf_operating_hours),
          nextAction,
          nextActionHref,
        },
      };
    });

    return NextResponse.json({
      equipment: assets,
      total: assets.length,
      summary: {
        activeAssets: assets.length,
        assetsWithOpenWorkOrders: assets.filter((asset) => asset.operational.openWorkOrders > 0).length,
        assetsWithOverduePreventives: assets.filter((asset) => asset.operational.overduePreventives > 0).length,
        assetsWithRuntime: assets.filter((asset) => asset.operational.runtimeReadingCount > 0).length,
        assetsWithAuditedReliability: assets.filter((asset) => asset.operational.auditedClosures > 0).length,
      },
      source: 'public.canonical_assets_current + maintenance operational views',
      canonical: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar los activos';
    console.error('[maintenance/equipment]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
