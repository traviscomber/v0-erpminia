export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { getRoleKpiChange } from '@/lib/executive/role-kpi-change';
import { GET as getGenericArea } from '@/app/api/mi-area/route';
import { GET as getWarehouse } from '@/app/api/mi-area/bodega/route';
import { GET as getAdministration } from '@/app/api/mi-area/administracion/route';
import { GET as getGeology } from '@/app/api/mi-area/geologia/route';
import { GET as getDrilling } from '@/app/api/mi-area/sondaje/route';
import { GET as getMaintenanceDepartment } from '@/app/api/mi-area/mantencion-departamento/route';
import { GET as getMaintenanceTechnical } from '@/app/api/mi-area/mantencion-tecnica/route';
import { GET as getHr } from '@/app/api/mi-area/rrhh/route';

function normalize(value?: string | null) {
  return String(value || '').trim().toUpperCase();
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const { data: profile, error: profileError } = await context.supabase
    .from('profiles')
    .select('cargo_id')
    .eq('id', context.userId)
    .maybeSingle();
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  const { data: cargo, error: cargoError } = profile?.cargo_id
    ? await context.supabase.from('cargos').select('name').eq('id', profile.cargo_id).maybeSingle()
    : { data: null, error: null };
  if (cargoError) return NextResponse.json({ error: cargoError.message }, { status: 500 });

  const cargoName = String(cargo?.name || '').trim();
  const normalized = normalize(cargoName);

  let response: Response;
  if (normalized === 'JEFE BODEGA') response = await getWarehouse(request);
  else if (normalized === 'JEFE ADM.') response = await getAdministration(request);
  else if (normalized === 'JEFE GEÓLOGIA') response = await getGeology(request);
  else if (normalized === 'JEFE SONDAJE') response = await getDrilling(request);
  else if (normalized === 'JEFE RRHH') response = await getHr(request);
  else if (normalized === 'JEFE DEPARTAMENTO DE MANTENCIÓN') response = await getMaintenanceDepartment(request);
  else if (normalized === 'JEFE DE EQUIPOS MINEROS' || normalized === 'JEFE DE CAMIONETAS') response = await getMaintenanceTechnical(request);
  else response = await getGenericArea(request);

  if (!response.ok) return response;
  const data = await response.json();

  if (data.portal?.key === 'production') return NextResponse.json(data);

  const historyConfig: Record<string, { sourceView: string; cargoName: string; kpiKeys?: string[] }> = {
    warehouse: {
      sourceView: 'inventory_geology_role_kpi_snapshot_v1', cargoName: 'JEFE BODEGA',
      kpiKeys: ['inventory_active_items', 'low_stock_items', 'warehouse_stale_counts', 'inventory_validation_coverage'],
    },
    administration: {
      sourceView: 'admin_finance_role_kpi_snapshot_v1', cargoName: 'JEFE ADM.',
      kpiKeys: ['committed_cost_clp', 'recognized_cost_clp', 'cost_center_coverage', 'purchase_orders'],
    },
    geology: {
      sourceView: 'inventory_geology_role_kpi_snapshot_v1', cargoName: 'JEFE GEÓLOGIA',
      kpiKeys: ['active_sectors', 'active_mine_sources', 'sector_activity_coverage'],
    },
    drilling: {
      sourceView: 'drilling_role_kpi_snapshot_v1', cargoName: 'JEFE SONDAJE',
      kpiKeys: ['drilled_meters', 'drilling_holes', 'meter_capture_pct', 'rigs_reporting'],
    },
    sustainability: {
      sourceView: 'hse_role_kpi_snapshot_v1', cargoName: 'JEFE SOSTENIBILIDAD',
      kpiKeys: ['incident_injuries', 'incident_open_rate', 'inspection_completion_rate', 'risk_review_overdue'],
    },
    maintenance: {
      sourceView: 'maintenance_role_kpi_snapshot_v1', cargoName,
      kpiKeys: ['open_backlog', 'wo_closure_rate', 'preventive_closure_rate', 'mttr_hours'],
    },
    maintenance_equipment: {
      sourceView: 'maintenance_role_kpi_snapshot_v1', cargoName,
      kpiKeys: ['open_backlog', 'wo_closure_rate', 'mttr_hours'],
    },
    maintenance_fleet: {
      sourceView: 'maintenance_role_kpi_snapshot_v1', cargoName,
      kpiKeys: ['open_backlog', 'wo_closure_rate', 'mttr_hours'],
    },
    hr: {
      sourceView: 'intelligence.people_overview', cargoName: 'JEFE RRHH',
      kpiKeys: ['active_people', 'credentials_expiring_30d', 'expired_credentials', 'people_with_ot_without_competencies'],
    },
  };

  const config = historyConfig[data.portal?.key];
  if (!config) return NextResponse.json(data);

  const change = await getRoleKpiChange({
    supabase: context.supabase,
    organizationId: context.organizationId,
    sourceView: config.sourceView,
    cargoName: config.cargoName,
    kpiKeys: config.kpiKeys,
  });

  return NextResponse.json({ ...data, change });
}
