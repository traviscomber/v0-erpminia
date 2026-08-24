export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

type KpiRow = {
  organization_id: string;
  cargo_id: string;
  cargo_name: string;
  kpi_key: string;
  label: string;
  unit: string;
  measured_value: number | null;
  target_value?: number | null;
  direction: string;
  evaluation_state: string;
  measured_at: string;
  evidence?: Record<string, unknown> | null;
  domain?: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  status: string | null;
  cargo_id: string | null;
  organization_id: string | null;
  cargos?: { name?: string | null } | { name?: string | null }[] | null;
};

type KaizenRow = {
  id: string;
  kaizen_number: string | null;
  title: string;
  category: string | null;
  priority: string | null;
  pdca_stage: string | null;
  status: string | null;
  owner_id: string | null;
  owner_name: string | null;
  target_date: string | null;
  expected_result: string | null;
  actual_result: string | null;
  estimated_saving: number | null;
  actual_saving: number | null;
  verified_at: string | null;
  standardized_at: string | null;
  created_at: string;
  updated_at: string;
};

function withDomain(rows: KpiRow[], domain: string) {
  return rows.map((row) => ({ ...row, domain: row.domain || domain }));
}

function normalize(value: string | null | undefined) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

const baselineCargoAliases: Record<string, string> = {
  'GERENTE OPERACIONES': 'GERENTE',
};

function profileCargoName(profile: ProfileRow | null) {
  if (!profile?.cargos) return '';
  if (Array.isArray(profile.cargos)) return profile.cargos[0]?.name || '';
  return profile.cargos.name || '';
}

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.CORE_DESEMPENO);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const cargo = request.nextUrl.searchParams.get('cargo');
  const profileId = request.nextUrl.searchParams.get('profileId');

  const [production, maintenance, hse, inventoryGeology, adminFinance, contractsDocuments, drilling, executive, profiles] = await Promise.all([
    context.supabase.from('role_operational_kpi_snapshot_v1').select('*').eq('organization_id', context.organizationId),
    context.supabase.from('maintenance_role_kpi_snapshot_v1').select('*').eq('organization_id', context.organizationId),
    context.supabase.from('hse_role_kpi_snapshot_v1').select('*').eq('organization_id', context.organizationId),
    context.supabase.from('inventory_geology_role_kpi_snapshot_v1').select('*').eq('organization_id', context.organizationId),
    context.supabase.from('admin_finance_role_kpi_snapshot_v1').select('*').eq('organization_id', context.organizationId),
    context.supabase.from('contract_document_role_kpi_snapshot_v1').select('*').eq('organization_id', context.organizationId),
    context.supabase.from('drilling_role_kpi_snapshot_v1').select('*').eq('organization_id', context.organizationId),
    context.supabase.from('executive_operational_scorecard_v1').select('*').eq('organization_id', context.organizationId),
    context.supabase.from('profiles').select('id,full_name,email,role,status,cargo_id,organization_id,cargos(name)').eq('organization_id', context.organizationId).eq('status', 'active'),
  ]);

  const error = production.error || maintenance.error || hse.error || inventoryGeology.error || adminFinance.error || contractsDocuments.error || drilling.error || executive.error || profiles.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const productionRows = (production.data || []) as KpiRow[];
  const maintenanceRows = withDomain((maintenance.data || []) as KpiRow[], 'maintenance');
  const hseRows = withDomain((hse.data || []) as KpiRow[], 'hse');
  const drillingRows = withDomain((drilling.data || []) as KpiRow[], 'drilling');
  const inventoryGeologyRows = ((inventoryGeology.data || []) as KpiRow[]).map((row) => ({ ...row, domain: row.cargo_name === 'JEFE BODEGA' ? 'inventory' : 'geology' }));
  const adminFinanceRows = ((adminFinance.data || []) as KpiRow[]).map((row) => ({ ...row, domain: row.kpi_key.startsWith('purchase_') ? 'procurement' : 'finance' }));
  const contractDocumentRows = ((contractsDocuments.data || []) as KpiRow[]).map((row) => ({ ...row, domain: row.kpi_key === 'expired_documents' ? 'documents' : 'contracts' }));

  const rows: KpiRow[] = [...productionRows, ...maintenanceRows, ...hseRows, ...inventoryGeologyRows, ...adminFinanceRows, ...contractDocumentRows, ...drillingRows];
  const executiveRows = (executive.data || []) as KpiRow[];
  const activeProfiles = ((profiles.data || []) as ProfileRow[]).map((profile) => ({
    id: profile.id,
    full_name: profile.full_name,
    role: profile.role,
    cargo_id: profile.cargo_id,
    cargo_name: profileCargoName(profile),
  }));

  const selectedProfile = profileId ? ((profiles.data || []) as ProfileRow[]).find((profile) => profile.id === profileId) || null : null;
  const selectedProfileCargo = profileCargoName(selectedProfile);
  const baselineCargo = selectedProfileCargo ? (baselineCargoAliases[normalize(selectedProfileCargo)] || selectedProfileCargo) : '';
  const effectiveCargo = selectedProfile ? baselineCargo : cargo || '';

  const filtered = effectiveCargo ? rows.filter((row) => normalize(row.cargo_name) === normalize(effectiveCargo)) : rows;
  const filteredExecutive = effectiveCargo
    ? executiveRows.filter((row) => normalize(row.cargo_name) === normalize(effectiveCargo))
    : executiveRows;

  let initiatives: KaizenRow[] = [];
  if (selectedProfile) {
    const selectedName = normalize(selectedProfile.full_name);
    const kaizen = await context.supabase
      .from('lean_kaizen_items')
      .select('id,kaizen_number,title,category,priority,pdca_stage,status,owner_id,owner_name,target_date,expected_result,actual_result,estimated_saving,actual_saving,verified_at,standardized_at,created_at,updated_at')
      .eq('organization_id', context.organizationId)
      .order('updated_at', { ascending: false });

    if (kaizen.error) return NextResponse.json({ error: kaizen.error.message }, { status: 500 });
    initiatives = ((kaizen.data || []) as KaizenRow[]).filter((item) => item.owner_id === selectedProfile.id || normalize(item.owner_name) === selectedName);
  }

  const profileRows = [...filteredExecutive, ...filtered];
  const comparablePeriods = Array.from(new Set(profileRows
    .map((row) => row.measured_at?.slice(0, 7))
    .filter(Boolean)))
    .sort();

  const cargos = Array.from(new Set(rows.map((row) => row.cargo_name))).sort((a, b) => a.localeCompare(b, 'es'));

  return NextResponse.json({
    organizationId: context.organizationId,
    cargos,
    profiles: activeProfiles,
    rows: filtered,
    executive: filteredExecutive,
    person: selectedProfile ? {
      id: selectedProfile.id,
      fullName: selectedProfile.full_name,
      role: selectedProfile.role,
      cargoName: selectedProfileCargo,
      baselineCargo,
      baselineInherited: normalize(selectedProfileCargo) !== normalize(baselineCargo),
      initiatives,
      comparablePeriods,
      comparableClosures: comparablePeriods.length,
      evaluationEligible: comparablePeriods.length >= 3,
    } : null,
    evidenceGaps: [
      { domain: 'rrhh', status: 'insufficient_data', detail: 'Competencias, credenciales y evaluaciones de desempeño aún no tienen evidencia operacional suficiente.' },
      { domain: 'document_approvals', status: 'insufficient_data', detail: 'No existen flujos de aprobación documentales registrados; no se calcula un porcentaje artificial de aprobación.' },
    ],
    meta: {
      mode: selectedProfile ? 'person_operational_baseline' : 'operational_baseline',
      personalEvaluation: false,
      targetsDefined: profileRows.some((row) => row.target_value !== null && row.target_value !== undefined),
      note: selectedProfile
        ? 'Vista individual construida desde identidad canónica y baseline del cargo. Los indicadores heredados del cargo no constituyen atribución ni evaluación personal.'
        : 'Los valores son baselines operacionales derivados de fuentes del sistema. No constituyen una evaluación personal mientras no existan metas aprobadas y atribución individual suficiente.',
    },
  });
}
