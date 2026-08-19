export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const [
    batches,
    movements,
    plantShifts,
    metallurgy,
    metallurgyAssayed,
    metallurgyPartial,
    metallurgyNoAssay,
    shipments,
    shipmentTonnage,
    allocations,
    allocationTonnage,
    reconciliation,
    latestMovement,
    latestPlant,
    latestShipment,
  ] = await Promise.all([
    context.supabase
      .from('production_import_batches')
      .select('id, source_type, source_file, period_start, period_end, status, normalization_rule_version, created_at')
      .eq('organization_id', context.organizationId)
      .order('period_start', { ascending: false }),
    context.supabase.from('production_material_movements').select('id', { count: 'exact', head: true }).eq('organization_id', context.organizationId),
    context.supabase.from('production_plant_shifts').select('id', { count: 'exact', head: true }).eq('organization_id', context.organizationId),
    context.supabase.from('production_metallurgy_deterministic_v2').select('plant_shift_id', { count: 'exact', head: true }).eq('organization_id', context.organizationId),
    context.supabase.from('production_metallurgy_deterministic_v2').select('plant_shift_id', { count: 'exact', head: true }).eq('organization_id', context.organizationId).eq('metallurgy_state', 'assayed'),
    context.supabase.from('production_metallurgy_deterministic_v2').select('plant_shift_id', { count: 'exact', head: true }).eq('organization_id', context.organizationId).eq('metallurgy_state', 'partial'),
    context.supabase.from('production_metallurgy_deterministic_v2').select('plant_shift_id', { count: 'exact', head: true }).eq('organization_id', context.organizationId).eq('metallurgy_state', 'no_assay'),
    context.supabase.from('production_concentrate_shipments').select('id', { count: 'exact', head: true }).eq('organization_id', context.organizationId),
    context.supabase.from('production_concentrate_shipments').select('normalized_metric_tons').eq('organization_id', context.organizationId),
    context.supabase.from('production_concentrate_shipment_allocations').select('id', { count: 'exact', head: true }).eq('organization_id', context.organizationId),
    context.supabase.from('production_concentrate_shipment_allocations').select('allocated_wet_metric_tons').eq('organization_id', context.organizationId),
    context.supabase.from('production_entity_reconciliation').select('id', { count: 'exact', head: true }).eq('organization_id', context.organizationId).in('status', ['pending', 'needs_review']),
    context.supabase.from('production_material_movements').select('movement_date').eq('organization_id', context.organizationId).order('movement_date', { ascending: false }).limit(1).maybeSingle(),
    context.supabase.from('production_plant_shifts').select('operation_date').eq('organization_id', context.organizationId).order('operation_date', { ascending: false }).limit(1).maybeSingle(),
    context.supabase.from('production_concentrate_shipments').select('shipment_date').eq('organization_id', context.organizationId).order('shipment_date', { ascending: false }).limit(1).maybeSingle(),
  ]);

  const errors = [
    batches.error,
    movements.error,
    plantShifts.error,
    metallurgy.error,
    metallurgyAssayed.error,
    metallurgyPartial.error,
    metallurgyNoAssay.error,
    shipments.error,
    shipmentTonnage.error,
    allocations.error,
    allocationTonnage.error,
    reconciliation.error,
    latestMovement.error,
    latestPlant.error,
    latestShipment.error,
  ].filter(Boolean);

  if (errors.length) {
    return NextResponse.json({ error: errors[0]?.message || 'No fue posible leer Producción canónica' }, { status: 500 });
  }

  const shipmentWetTons = (shipmentTonnage.data || []).reduce((sum, row) => sum + Number(row.normalized_metric_tons || 0), 0);
  const allocatedWetTons = (allocationTonnage.data || []).reduce((sum, row) => sum + Number(row.allocated_wet_metric_tons || 0), 0);
  const shipmentCount = shipments.count || 0;
  const allocationCount = allocations.count || 0;

  return NextResponse.json({
    batches: batches.data || [],
    counts: {
      materialMovements: movements.count || 0,
      plantShifts: plantShifts.count || 0,
      metallurgyResults: metallurgy.count || 0,
      metallurgyAssayed: metallurgyAssayed.count || 0,
      metallurgyPartial: metallurgyPartial.count || 0,
      metallurgyNoAssay: metallurgyNoAssay.count || 0,
      concentrateShipments: shipmentCount,
      concentrateAllocations: allocationCount,
      reconciliationPending: reconciliation.count || 0,
    },
    freshness: {
      latestMaterialMovementDate: latestMovement.data?.movement_date || null,
      latestPlantOperationDate: latestPlant.data?.operation_date || null,
      latestShipmentDate: latestShipment.data?.shipment_date || null,
    },
    dispatch: {
      status: shipmentCount > 0 ? 'available' : 'pending_reconciliation',
      wetMetricTons: shipmentWetTons,
      allocatedWetMetricTons: allocatedWetTons,
      allocationCoveragePct: shipmentWetTons > 0 ? (allocatedWetTons / shipmentWetTons) * 100 : 0,
      note: shipmentCount > 0
        ? `${shipmentCount.toLocaleString('es-CL')} despachos canónicos con ${allocationCount.toLocaleString('es-CL')} asignaciones de linaje.`
        : 'La estructura canónica está preparada, pero los despachos históricos aún no han sido conciliados y no se muestran valores simulados.',
    },
    legacy: {
      produccionKpiIsCanonical: false,
      note: 'produccion_kpi se mantiene temporalmente como fuente legacy hasta reconstruir los KPI desde movimientos y planta validados.',
    },
  });
}
