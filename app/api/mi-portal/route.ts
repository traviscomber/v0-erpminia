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

type PortalBlocker = {
  code: string;
  title: string;
  detail: string;
  dependsOn: string;
  count: number;
};

type PortalDataQuality = {
  code: string;
  title: string;
  detail: string;
  level: 'info' | 'watch';
};

type OrganizationContext = Extract<Awaited<ReturnType<typeof getOrganizationContext>>, { ok: true }>;

async function getMaintenanceBlockers(context: OrganizationContext): Promise<PortalBlocker[]> {
  const { data, error } = await context.supabase
    .from('maintenance_operational_work_order_flow_v1')
    .select('flow_status')
    .eq('organization_id', context.organizationId)
    .in('flow_status', ['waiting_procurement', 'waiting_parts'])
    .limit(500);

  if (error) return [];

  const rows = data || [];
  const procurement = rows.filter((row) => row.flow_status === 'waiting_procurement').length;
  const parts = rows.filter((row) => row.flow_status === 'waiting_parts').length;

  return [
    procurement > 0
      ? {
          code: 'waiting_procurement',
          title: 'OT esperando compra',
          detail: `${procurement.toLocaleString('es-CL')} OT dependen de una gestión de compra antes de continuar.`,
          dependsOn: 'Compras',
          count: procurement,
        }
      : null,
    parts > 0
      ? {
          code: 'waiting_parts',
          title: 'OT esperando repuestos',
          detail: `${parts.toLocaleString('es-CL')} OT dependen de disponibilidad o entrega de repuestos.`,
          dependsOn: 'Bodega',
          count: parts,
        }
      : null,
  ].filter(Boolean) as PortalBlocker[];
}

async function getSnapshotQuality(
  context: OrganizationContext,
  sourceView: string,
  cargoName: string,
  kpiKey: string,
  title: string,
  detail: (value: number) => string,
): Promise<PortalDataQuality[]> {
  const { data, error } = await context.supabase
    .from(sourceView)
    .select('measured_value')
    .eq('organization_id', context.organizationId)
    .eq('cargo_name', cargoName)
    .eq('kpi_key', kpiKey)
    .maybeSingle();
  if (error || data?.measured_value == null) return [];
  const value = Number(data.measured_value);
  if (!Number.isFinite(value) || value >= 100) return [];
  return [{ code: kpiKey, title, detail: detail(value), level: 'watch' }];
}

async function getDataQuality(context: OrganizationContext, portalKey: string): Promise<PortalDataQuality[]> {
  if (portalKey === 'warehouse') {
    const { count, error } = await context.supabase
      .from('canonical_inventory_current')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', context.organizationId)
      .eq('is_active', true)
      .lte('min_stock', 0);
    if (error || !count) return [];
    return [{
      code: 'inventory_without_positive_minimum',
      title: 'Ítems sin mínimo positivo',
      detail: `${count.toLocaleString('es-CL')} ítem(es) activos no tienen un mínimo positivo definido. No generan alerta de bajo stock hasta contar con ese dato.`,
      level: 'watch',
    }];
  }

  if (portalKey === 'administration') {
    return getSnapshotQuality(
      context,
      'admin_finance_role_kpi_snapshot_v1',
      'JEFE ADM.',
      'cost_center_coverage',
      'Cobertura de centro de costo incompleta',
      (value) => `Cobertura canónica observada: ${value.toLocaleString('es-CL', { maximumFractionDigits: 1 })}%. Los movimientos sin centro de costo deben mantenerse como brecha, no asumirse como clasificados.`,
    );
  }

  if (portalKey === 'geology') {
    return getSnapshotQuality(
      context,
      'inventory_geology_role_kpi_snapshot_v1',
      'JEFE GEÓLOGIA',
      'sector_activity_coverage',
      'Cobertura de actividad geológica incompleta',
      (value) => `Cobertura observada: ${value.toLocaleString('es-CL', { maximumFractionDigits: 1 })}%. La parte no cubierta permanece sin inferencia automática.`,
    );
  }

  if (portalKey === 'drilling') {
    return getSnapshotQuality(
      context,
      'drilling_role_kpi_snapshot_v1',
      'JEFE SONDAJE',
      'meter_capture_pct',
      'Captura de metros incompleta',
      (value) => `Cobertura observada: ${value.toLocaleString('es-CL', { maximumFractionDigits: 1 })}%. Los metros no capturados no se interpretan como cero.`,
    );
  }

  if (portalKey === 'sustainability') {
    const { data: ncRows, error: ncError } = await context.supabase
      .from('sostenibilidad_nonconformances')
      .select('id,status')
      .eq('organization_id', context.organizationId);
    if (ncError) return [];
    const openNcIds = (ncRows || [])
      .filter((row) => !['cerrada', 'closed', 'completada', 'completed'].includes(String(row.status || '').toLowerCase()))
      .map((row) => row.id);
    if (!openNcIds.length) return [];

    const { data: actions, error: actionError } = await context.supabase
      .from('sostenibilidad_corrective_actions')
      .select('id,status,responsible_person_name,scheduled_completion_date')
      .in('nc_id', openNcIds);
    if (actionError) return [];

    const openActions = (actions || []).filter((row) => !['cerrada', 'closed', 'completada', 'completed'].includes(String(row.status || '').toLowerCase()));
    const withoutOwner = openActions.filter((row) => !String(row.responsible_person_name || '').trim()).length;
    const withoutDate = openActions.filter((row) => !row.scheduled_completion_date).length;

    return [
      withoutOwner > 0 ? {
        code: 'hse_actions_without_owner',
        title: 'Acciones HSE sin responsable',
        detail: `${withoutOwner.toLocaleString('es-CL')} acción(es) correctiva(s) abierta(s) no tienen responsable registrado.`,
        level: 'watch' as const,
      } : null,
      withoutDate > 0 ? {
        code: 'hse_actions_without_date',
        title: 'Acciones HSE sin fecha comprometida',
        detail: `${withoutDate.toLocaleString('es-CL')} acción(es) correctiva(s) abierta(s) no tienen fecha de término registrada.`,
        level: 'watch' as const,
      } : null,
    ].filter(Boolean) as PortalDataQuality[];
  }

  if (portalKey === 'hr') {
    const [overviewResult, peopleResult, assignmentsResult] = await Promise.all([
      context.supabase
        .schema('intelligence')
        .from('people_overview')
        .select('people_with_ot_without_competencies')
        .eq('organization_id', context.organizationId)
        .maybeSingle(),
      context.supabase
        .from('people')
        .select('source_type', { count: 'exact' })
        .eq('organization_id', context.organizationId),
      context.supabase
        .from('people_employment_assignments')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', context.organizationId),
    ]);

    if (overviewResult.error || peopleResult.error || assignmentsResult.error) return [];
    const people = peopleResult.data || [];
    const peopleCount = peopleResult.count || 0;
    const evidencePeople = people.filter((row) => String(row.source_type || '').toLowerCase() === 'work_order_evidence').length;
    const assignmentCount = assignmentsResult.count || 0;
    const missingCompetencies = Number(overviewResult.data?.people_with_ot_without_competencies);
    const quality: PortalDataQuality[] = [];

    if (peopleCount === 0 || assignmentCount === 0 || evidencePeople === peopleCount) {
      quality.push({
        code: 'hr_master_coverage',
        title: 'Nómina maestra RRHH no consolidada',
        detail: peopleCount > 0
          ? `${peopleCount.toLocaleString('es-CL')} persona(s) están evidenciadas, pero la fuente actual no permite tratarlas como dotación completa; asignaciones laborales registradas: ${assignmentCount.toLocaleString('es-CL')}.`
          : 'No existe una nómina maestra consolidada en la evidencia actual. Los vacíos no se interpretan como dotación cero.',
        level: 'watch',
      });
    }

    if (Number.isFinite(missingCompetencies) && missingCompetencies > 0) {
      quality.push({
        code: 'people_with_ot_without_competencies',
        title: 'OT sin evidencia de competencias asociada',
        detail: `${missingCompetencies.toLocaleString('es-CL')} persona(s) con OT no tienen evidencia de competencias asociada en la fuente actual.`,
        level: 'watch',
      });
    }

    return quality.slice(0, 4);
  }

  if (['maintenance', 'maintenance_equipment', 'maintenance_fleet'].includes(portalKey)) {
    const { data, error } = await context.supabase
      .from('maintenance_operational_work_order_flow_v1')
      .select('flow_status')
      .eq('organization_id', context.organizationId)
      .eq('flow_status', 'missing_asset')
      .limit(500);
    if (error || !data?.length) return [];
    return [{
      code: 'maintenance_missing_asset',
      title: 'OT sin activo trazable',
      detail: `${data.length.toLocaleString('es-CL')} OT activa(s) no tienen un activo canónico resoluble. Se muestran como brecha de calidad, no como bloqueo entre áreas.`,
      level: 'watch',
    }];
  }

  return [];
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

  const portalKey = String(data.portal?.key || '');
  const maintenancePortalKeys = new Set(['maintenance', 'maintenance_equipment', 'maintenance_fleet']);
  const [blockers, dataQuality] = await Promise.all([
    maintenancePortalKeys.has(portalKey) ? getMaintenanceBlockers(context) : Promise.resolve([]),
    getDataQuality(context, portalKey),
  ]);

  if (portalKey === 'production') return NextResponse.json({ ...data, blockers, dataQuality });

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

  const config = historyConfig[portalKey];
  if (!config) return NextResponse.json({ ...data, blockers, dataQuality });

  const change = await getRoleKpiChange({
    supabase: context.supabase,
    organizationId: context.organizationId,
    sourceView: config.sourceView,
    cargoName: config.cargoName,
    kpiKeys: config.kpiKeys,
  });

  return NextResponse.json({ ...data, change, blockers, dataQuality });
}