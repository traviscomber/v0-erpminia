export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthContext } from '@/lib/api/auth-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { GET as getProductionOverview } from '@/app/api/produccion/canonical-overview/route';

type AreaPriority = {
  level: 'info' | 'watch' | 'alert';
  code: string;
  title: string;
  detail: string;
};

type DataQualitySignal = {
  level: 'info' | 'watch';
  code: string;
  title: string;
  detail: string;
};

type AreaBlocker = {
  area: string;
  title: string;
  detail: string;
};

type OperatingChain = {
  code: string;
  from: string;
  to: string;
  status: 'waiting' | 'blocked';
  title: string;
  detail: string;
  evidenceCount: number;
};

function n(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function pct(value: number | null, digits = 1) {
  return value == null ? '—' : `${value.toLocaleString('es-CL', { maximumFractionDigits: digits })}%`;
}

function count(value: number | null) {
  return value == null ? '—' : value.toLocaleString('es-CL');
}

function isClosed(status: unknown) {
  return ['cerrada', 'closed', 'completada', 'completed'].includes(String(status || '').toLowerCase());
}

export async function GET(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  if (!auth?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('full_name, role, status, organization_id')
    .eq('id', auth.user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const isPedro = profile?.full_name === 'Pedro Pablo Zegers' && profile?.role === 'gerente_operaciones' && profile?.status === 'active';
  if (!isPedro || !profile.organization_id) {
    return NextResponse.json({ error: 'Vista ejecutiva no disponible para este usuario' }, { status: 403 });
  }

  const productionResponse = await getProductionOverview(request);
  if (!productionResponse.ok) return productionResponse;
  const production = await productionResponse.json();

  const [warehouseResult, hseResult, maintenanceResult, adminResult, drillingResult, warehouseMissingMinimumResult, hseNcResult, productionFlowResult] = await Promise.all([
    supabase
      .from('inventory_geology_role_kpi_snapshot_v1')
      .select('kpi_key,measured_value')
      .eq('organization_id', profile.organization_id)
      .eq('cargo_name', 'JEFE BODEGA'),
    supabase
      .from('hse_role_kpi_snapshot_v1')
      .select('kpi_key,measured_value')
      .eq('organization_id', profile.organization_id)
      .eq('cargo_name', 'JEFE SOSTENIBILIDAD'),
    supabase
      .from('maintenance_operational_work_order_flow_v1')
      .select('flow_status,priority')
      .eq('organization_id', profile.organization_id)
      .neq('flow_status', 'completed')
      .limit(300),
    supabase
      .from('admin_finance_role_kpi_snapshot_v1')
      .select('kpi_key,measured_value')
      .eq('organization_id', profile.organization_id)
      .eq('cargo_name', 'JEFE ADM.'),
    supabase
      .from('drilling_role_kpi_snapshot_v1')
      .select('kpi_key,measured_value')
      .eq('organization_id', profile.organization_id)
      .eq('cargo_name', 'JEFE SONDAJE'),
    supabase
      .from('canonical_inventory_current')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', profile.organization_id)
      .eq('is_active', true)
      .lte('min_stock', 0),
    supabase
      .from('sostenibilidad_nonconformances')
      .select('id,status,severity')
      .eq('organization_id', profile.organization_id),
    supabase
      .from('production_flow_daily_fidelity_v1')
      .select('review_shipment_rows,valid_shipment_rows,shipment_rows')
      .eq('organization_id', profile.organization_id),
  ]);

  const firstError = [warehouseResult, hseResult, maintenanceResult, adminResult, drillingResult, warehouseMissingMinimumResult, hseNcResult, productionFlowResult]
    .find((result) => result.error)?.error;
  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });

  const mapRows = (rows: Array<{ kpi_key: string; measured_value: unknown }> | null) => {
    const map = new Map<string, number | null>();
    for (const row of rows || []) {
      const value = n(row.measured_value);
      const current = map.get(row.kpi_key);
      if (current === undefined || (value != null && current == null)) map.set(row.kpi_key, value);
    }
    return map;
  };

  const warehouse = mapRows(warehouseResult.data);
  const hse = mapRows(hseResult.data);
  const admin = mapRows(adminResult.data);
  const drilling = mapRows(drillingResult.data);
  const maintenance = maintenanceResult.data || [];
  const openNc = (hseNcResult.data || []).filter((row) => !isClosed(row.status));
  const openNcIds = openNc.map((row) => row.id);

  let openCorrectiveActions: Array<{ id: string; nc_id: string; status: string | null; responsible_person_name: string | null; scheduled_completion_date: string | null }> = [];
  if (openNcIds.length) {
    const { data, error: actionsError } = await supabase
      .from('sostenibilidad_corrective_actions')
      .select('id,nc_id,status,responsible_person_name,scheduled_completion_date')
      .in('nc_id', openNcIds);
    if (actionsError) return NextResponse.json({ error: actionsError.message }, { status: 500 });
    openCorrectiveActions = (data || []).filter((row) => !isClosed(row.status));
  }

  const lowStock = warehouse.get('low_stock_items') ?? null;
  const overdueRisks = hse.get('risk_review_overdue') ?? null;
  const inspectionCompletion = hse.get('inspection_completion_rate') ?? null;
  const injuries = hse.get('incident_injuries') ?? null;
  const costCenterCoverage = admin.get('cost_center_coverage') ?? null;
  const drillingCapture = drilling.get('meter_capture_pct') ?? null;
  const productionHold = n(production.quality?.hold);
  const criticalWorkOrders = maintenance.filter((row) => ['critical', 'critica', 'crítica'].includes(String(row.priority || '').toLowerCase())).length;
  const missingAsset = maintenance.filter((row) => row.flow_status === 'missing_asset').length;
  const waitingProcurement = maintenance.filter((row) => row.flow_status === 'waiting_procurement').length;
  const waitingParts = maintenance.filter((row) => row.flow_status === 'waiting_parts').length;
  const warehouseMissingMinimum = warehouseMissingMinimumResult.count ?? 0;
  const ncWithoutOpenAction = openNc.filter((nc) => !openCorrectiveActions.some((action) => action.nc_id === nc.id)).length;
  const actionsWithoutOwner = openCorrectiveActions.filter((action) => !String(action.responsible_person_name || '').trim()).length;
  const actionsWithoutDate = openCorrectiveActions.filter((action) => !action.scheduled_completion_date).length;
  const productionReviewRows = (productionFlowResult.data || []).reduce((sum, row) => sum + (n(row.review_shipment_rows) ?? 0), 0);
  const productionShipmentRows = (productionFlowResult.data || []).reduce((sum, row) => sum + (n(row.shipment_rows) ?? 0), 0);

  const areaPriorities = [
    lowStock != null && lowStock > 0
      ? { level: 'alert' as const, code: 'area_warehouse_low_stock', title: 'Bodega · revisar stock mínimo', detail: `${lowStock.toLocaleString('es-CL')} ítem(es) con mínimo positivo están en o bajo su umbral.` }
      : null,
    criticalWorkOrders > 0
      ? { level: 'alert' as const, code: 'area_maintenance_critical', title: 'Mantención · OT críticas abiertas', detail: `${criticalWorkOrders} OT crítica(s) permanecen abiertas.` }
      : waitingProcurement + waitingParts > 0
        ? { level: 'watch' as const, code: 'area_maintenance_blocked', title: 'Mantención · trabajos bloqueados', detail: `${waitingProcurement} esperando compra · ${waitingParts} esperando repuestos.` }
        : null,
    (overdueRisks != null && overdueRisks > 0) || (injuries != null && injuries > 0) || (inspectionCompletion != null && inspectionCompletion < 100)
      ? { level: 'watch' as const, code: 'area_hse_followup', title: 'HSE · requiere seguimiento', detail: `${count(overdueRisks)} revisión(es) de riesgo vencida(s) · inspecciones ${pct(inspectionCompletion)} · ${count(injuries)} lesión(es) registradas.` }
      : null,
  ].filter(Boolean) as AreaPriority[];

  const blockers = [
    waitingProcurement > 0
      ? { area: 'Compras', title: 'Mantención esperando compra', detail: `${waitingProcurement} OT dependen de una gestión de compra antes de continuar.` }
      : null,
    waitingParts > 0
      ? { area: 'Bodega', title: 'Mantención esperando repuestos', detail: `${waitingParts} OT dependen de disponibilidad o entrega de repuestos.` }
      : null,
  ].filter(Boolean) as AreaBlocker[];

  const operatingChains = [
    waitingProcurement > 0
      ? {
          code: 'maintenance_to_procurement',
          from: 'Mantención',
          to: 'Compras',
          status: 'blocked' as const,
          title: 'OT detenidas por gestión de compra',
          detail: `${waitingProcurement} OT no pueden continuar hasta resolver la gestión de compra registrada en el flujo canónico.`,
          evidenceCount: waitingProcurement,
        }
      : null,
    waitingParts > 0
      ? {
          code: 'maintenance_to_warehouse',
          from: 'Mantención',
          to: 'Bodega',
          status: 'waiting' as const,
          title: 'OT esperando disponibilidad de repuesto',
          detail: `${waitingParts} OT dependen de disponibilidad o entrega de repuestos registrada en el flujo canónico.`,
          evidenceCount: waitingParts,
        }
      : null,
    productionReviewRows > 0
      ? {
          code: 'production_to_validation',
          from: 'Producción',
          to: 'Validación',
          status: 'waiting' as const,
          title: 'Despachos pendientes de validación',
          detail: `${productionReviewRows.toLocaleString('es-CL')} de ${productionShipmentRows.toLocaleString('es-CL')} registro(s) de despacho permanecen en revisión antes de considerarse evidencia validada.`,
          evidenceCount: productionReviewRows,
        }
      : null,
    ncWithoutOpenAction > 0
      ? {
          code: 'hse_nc_to_corrective_action',
          from: 'HSE',
          to: 'Acción correctiva',
          status: 'blocked' as const,
          title: 'NC abiertas sin acción correctiva activa',
          detail: `${ncWithoutOpenAction} no conformidad(es) abierta(s) aún no tienen una acción correctiva abierta asociada en la evidencia canónica.`,
          evidenceCount: ncWithoutOpenAction,
        }
      : null,
    actionsWithoutOwner + actionsWithoutDate > 0
      ? {
          code: 'hse_action_to_responsible',
          from: 'Acción HSE',
          to: 'Responsable',
          status: 'waiting' as const,
          title: 'Acciones HSE incompletas para seguimiento',
          detail: `${actionsWithoutOwner} sin responsable · ${actionsWithoutDate} sin fecha comprometida.`,
          evidenceCount: Math.max(actionsWithoutOwner, actionsWithoutDate),
        }
      : null,
  ].filter(Boolean) as OperatingChain[];

  const dataQuality = [
    warehouseMissingMinimum > 0
      ? { level: 'watch' as const, code: 'quality_warehouse_minimum', title: 'Bodega · faltan mínimos definidos', detail: `${warehouseMissingMinimum.toLocaleString('es-CL')} ítem(es) activos no tienen un mínimo positivo. No generan alerta de bajo stock hasta contar con ese dato.` }
      : null,
    missingAsset > 0
      ? { level: 'watch' as const, code: 'quality_maintenance_asset', title: 'Mantención · OT sin activo trazable', detail: `${missingAsset} OT activa(s) no tienen activo canónico resoluble.` }
      : null,
    drillingCapture != null && drillingCapture < 100
      ? { level: 'watch' as const, code: 'quality_drilling_capture', title: 'Sondaje · captura incompleta', detail: `Cobertura de metros perforados: ${pct(drillingCapture, 2)}. El faltante no se interpreta como cero.` }
      : null,
    costCenterCoverage != null && costCenterCoverage < 100
      ? { level: 'watch' as const, code: 'quality_admin_cost_centers', title: 'Administración · centros de costo incompletos', detail: `Cobertura observada: ${pct(costCenterCoverage, 2)}. Los movimientos no clasificados permanecen como brecha.` }
      : null,
    productionHold != null && productionHold > 0
      ? { level: 'watch' as const, code: 'quality_production_hold', title: 'Producción · evidencia en HOLD', detail: `${productionHold.toLocaleString('es-CL')} chequeo(s) permanecen pendientes de validación.` }
      : null,
  ].filter(Boolean) as DataQualitySignal[];

  return NextResponse.json({
    ...production,
    areaPriorities: areaPriorities.slice(0, 5),
    blockers,
    operatingChains: operatingChains.slice(0, 6),
    dataQuality: dataQuality.slice(0, 5),
  });
}
