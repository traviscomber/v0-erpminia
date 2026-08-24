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

function n(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function pct(value: number | null, digits = 1) {
  return value == null ? '—' : `${value.toLocaleString('es-CL', { maximumFractionDigits: digits })}%`;
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

  const [warehouseResult, hseResult, maintenanceResult, adminResult, drillingResult] = await Promise.all([
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
  ]);

  const firstError = [warehouseResult, hseResult, maintenanceResult, adminResult, drillingResult]
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

  const lowStock = warehouse.get('low_stock_items') ?? null;
  const overdueRisks = hse.get('risk_review_overdue') ?? null;
  const inspectionCompletion = hse.get('inspection_completion_rate') ?? null;
  const injuries = hse.get('incident_injuries') ?? null;
  const costCenterCoverage = admin.get('cost_center_coverage') ?? null;
  const drillingCapture = drilling.get('meter_capture_pct') ?? null;
  const criticalWorkOrders = maintenance.filter((row) => ['critical', 'critica', 'crítica'].includes(String(row.priority || '').toLowerCase())).length;
  const missingAsset = maintenance.filter((row) => row.flow_status === 'missing_asset').length;
  const waitingProcurement = maintenance.filter((row) => row.flow_status === 'waiting_procurement').length;
  const waitingParts = maintenance.filter((row) => row.flow_status === 'waiting_parts').length;

  const areaPriorities = [
    lowStock != null && lowStock > 0
      ? { level: 'alert' as const, code: 'area_warehouse_low_stock', title: 'Bodega · revisar stock mínimo', detail: `${lowStock.toLocaleString('es-CL')} ítem(es) con mínimo positivo están en o bajo su umbral.` }
      : null,
    criticalWorkOrders > 0
      ? { level: 'alert' as const, code: 'area_maintenance_critical', title: 'Mantención · OT críticas abiertas', detail: `${criticalWorkOrders} OT crítica(s) permanecen abiertas.` }
      : missingAsset > 0
        ? { level: 'watch' as const, code: 'area_maintenance_traceability', title: 'Mantención · falta trazabilidad de activo', detail: `${missingAsset} OT activa(s) no tienen equipo asociado.` }
        : waitingProcurement + waitingParts > 0
          ? { level: 'watch' as const, code: 'area_maintenance_blocked', title: 'Mantención · trabajos bloqueados', detail: `${waitingProcurement} esperando compra · ${waitingParts} esperando repuestos.` }
          : null,
    (overdueRisks != null && overdueRisks > 0) || (injuries != null && injuries > 0) || (inspectionCompletion != null && inspectionCompletion < 100)
      ? { level: 'watch' as const, code: 'area_hse_followup', title: 'HSE · requiere seguimiento', detail: `${overdueRisks ?? 0} revisión(es) de riesgo vencida(s) · inspecciones ${pct(inspectionCompletion)} · ${injuries ?? 0} lesión(es) registradas.` }
      : null,
    drillingCapture != null && drillingCapture < 100
      ? { level: 'watch' as const, code: 'area_drilling_capture', title: 'Sondaje · cobertura incompleta', detail: `Cobertura de metros perforados: ${pct(drillingCapture, 2)}.` }
      : null,
    costCenterCoverage != null && costCenterCoverage < 100
      ? { level: costCenterCoverage < 90 ? 'watch' as const : 'info' as const, code: 'area_admin_cost_centers', title: 'Administración · cobertura de centros de costo', detail: `Cobertura observada: ${pct(costCenterCoverage, 2)}.` }
      : null,
  ].filter(Boolean) as AreaPriority[];

  return NextResponse.json({ ...production, areaPriorities: areaPriorities.slice(0, 5) });
}
