export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

function normalizedStatus(value: unknown) {
  const status = String(value || '').trim().toLowerCase();
  if (['operational', 'active', 'operativo', 'activo', 'available'].includes(status)) return 'operational';
  if (['maintenance', 'mantenimiento', 'en_mantenimiento'].includes(status)) return 'maintenance';
  if (['inactive', 'inactivo', 'down', 'fault', 'critical', 'critico'].includes(status)) return 'unavailable';
  return 'unknown';
}

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_OPERACIONES);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const [assetsResult, ordersResult, runtimeResult, reliabilityResult, preventiveResult] = await Promise.all([
      context.supabase
        .from('canonical_assets_current')
        .select('id,asset_code,name,asset_type,category,location,operational_status,criticality')
        .eq('organization_id', context.organizationId)
        .eq('is_active', true)
        .order('asset_code', { ascending: true }),
      context.supabase
        .from('maintenance_work_orders')
        .select('id,canonical_asset_id,work_order_number,title,status,priority')
        .eq('organization_id', context.organizationId)
        .not('canonical_asset_id', 'is', null)
        .not('status', 'in', '(completed,cancelled)'),
      context.supabase
        .from('asset_runtime_summary_v1')
        .select('canonical_asset_id,reading_count,latest_meter_hours,observed_operating_hours,usable_for_rate_metrics')
        .eq('organization_id', context.organizationId),
      context.supabase
        .from('maintenance_reliability_by_asset_v1')
        .select('canonical_asset_id,audited_closures,total_downtime_hours')
        .eq('organization_id', context.organizationId),
      context.supabase
        .from('preventive_maintenance_hour_status_v1')
        .select('canonical_asset_id,alert_due')
        .eq('organization_id', context.organizationId)
        .eq('enabled', true),
    ]);

    const error = assetsResult.error || ordersResult.error || runtimeResult.error || reliabilityResult.error || preventiveResult.error;
    if (error) throw error;

    const ordersByAsset = new Map<string, any[]>();
    for (const row of ordersResult.data || []) {
      const key = String(row.canonical_asset_id || '');
      if (!key) continue;
      ordersByAsset.set(key, [...(ordersByAsset.get(key) || []), row]);
    }
    const runtimeByAsset = new Map((runtimeResult.data || []).map((row: any) => [String(row.canonical_asset_id), row]));
    const reliabilityByAsset = new Map((reliabilityResult.data || []).map((row: any) => [String(row.canonical_asset_id), row]));
    const overdueByAsset = new Map<string, number>();
    for (const row of preventiveResult.data || []) {
      if (!row.alert_due || !row.canonical_asset_id) continue;
      const key = String(row.canonical_asset_id);
      overdueByAsset.set(key, (overdueByAsset.get(key) || 0) + 1);
    }

    const assets = (assetsResult.data || []).map((asset: any) => {
      const id = String(asset.id);
      const openOrders = ordersByAsset.get(id) || [];
      const runtime = runtimeByAsset.get(id);
      const reliability = reliabilityByAsset.get(id);
      const overduePreventives = overdueByAsset.get(id) || 0;
      const status = normalizedStatus(asset.operational_status);
      const criticalOpenOrders = openOrders.filter((row: any) => ['critical', 'high'].includes(String(row.priority || '').toLowerCase())).length;
      const attentionRank = overduePreventives > 0 ? 1 : criticalOpenOrders > 0 ? 2 : openOrders.length > 0 ? 3 : status === 'maintenance' || status === 'unavailable' ? 4 : 9;
      const nextAction = overduePreventives > 0
        ? 'Planificar preventivo vencido'
        : criticalOpenOrders > 0
          ? 'Atender OT prioritaria'
          : openOrders.length > 0
            ? 'Continuar OT abierta'
            : status === 'maintenance' || status === 'unavailable'
              ? 'Revisar estado operacional'
              : 'Sin acción prioritaria';

      return {
        id,
        assetCode: asset.asset_code,
        assetName: asset.name,
        assetType: asset.asset_type || asset.category,
        location: asset.location,
        criticality: asset.criticality,
        observedStatus: status,
        rawStatus: asset.operational_status,
        openWorkOrders: openOrders.length,
        criticalOpenOrders,
        overduePreventives,
        runtimeReadingCount: Number(runtime?.reading_count || 0),
        latestMeterHours: runtime?.latest_meter_hours ?? null,
        observedOperatingHours: runtime?.observed_operating_hours ?? null,
        runtimeUsableForRateMetrics: Boolean(runtime?.usable_for_rate_metrics),
        auditedClosures: Number(reliability?.audited_closures || 0),
        auditedDowntimeHours: reliability?.total_downtime_hours ?? null,
        availabilityPercentage: null,
        availabilityEvidence: 'insufficient_operating_window',
        attentionRank,
        nextAction,
      };
    }).sort((a: any, b: any) => a.attentionRank - b.attentionRank || b.criticalOpenOrders - a.criticalOpenOrders || b.openWorkOrders - a.openWorkOrders || String(a.assetCode || '').localeCompare(String(b.assetCode || '')));

    const statusCounts = assets.reduce((acc: Record<string, number>, asset: any) => {
      acc[asset.observedStatus] = (acc[asset.observedStatus] || 0) + 1;
      return acc;
    }, {});
    const assetsWithRuntimeReadings = assets.filter((asset: any) => asset.runtimeReadingCount > 0 && asset.latestMeterHours != null).length;
    const assetsWithDowntimeEvidence = assets.filter((asset: any) => asset.auditedClosures > 0 && asset.auditedDowntimeHours != null).length;

    return NextResponse.json({
      summary: {
        totalAssets: assets.length,
        canonicalOperational: statusCounts.operational || 0,
        canonicalMaintenance: statusCounts.maintenance || 0,
        canonicalUnavailable: statusCounts.unavailable || 0,
        canonicalStatusUnknown: statusCounts.unknown || 0,
        assetsWithOpenWorkOrders: assets.filter((asset: any) => asset.openWorkOrders > 0).length,
        assetsWithOverduePreventive: assets.filter((asset: any) => asset.overduePreventives > 0).length,
        assetsWithRuntimeReadings,
        assetsWithDowntimeEvidence,
        availabilityPercentage: null,
        availabilityCalculableAssets: 0,
        evidenceStatus: 'insufficient_operating_window',
      },
      assets,
      evidence: {
        canonicalAssetSource: 'public.canonical_assets_current',
        availabilityRule: 'No se calcula porcentaje sin una ventana operativa comparable que distinga horas programadas, operación y detención.',
        runtimeEvidence: 'asset_runtime_summary_v1',
        downtimeEvidence: 'maintenance_reliability_by_asset_v1',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al obtener evidencia de disponibilidad' }, { status: 500 });
  }
}
