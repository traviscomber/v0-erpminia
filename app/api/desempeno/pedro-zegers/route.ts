export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

type Improvement = {
  id: string;
  kaizen_number: string | null;
  title: string;
  priority: string | null;
  pdca_stage: string;
  status: string;
  owner_name: string | null;
  target_date: string | null;
  actual_result: string | null;
  verification_method: string | null;
  estimated_saving: number | null;
  actual_saving: number | null;
  standardized_at: string | null;
  updated_at: string;
};

type Contract = {
  id: string;
  title: string;
  contract_number: string | null;
  status: string | null;
  contract_value: number | null;
  currency: string | null;
  end_date: string | null;
  review_due_date: string | null;
  responsible_person: string | null;
  responsible_area: string | null;
  project_name: string | null;
  updated_at: string;
};

function normalized(value: unknown) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function belongsToPedro(value: unknown) {
  const text = normalized(value);
  return text.includes('pedro') && text.includes('zegers');
}

function endOfDate(value: string | null) {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T23:59:59.999Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysUntil(value: string | null, now: Date) {
  const end = endOfDate(value);
  if (!end) return null;
  return Math.ceil((end.getTime() - now.getTime()) / 86_400_000);
}

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.CORE_DESEMPENO);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const [peopleResult, improvementsResult, contractsResult] = await Promise.all([
    context.supabase
      .from('people')
      .select('id,full_name,email,role_title,employment_status,source_type,source_reference,updated_at')
      .eq('organization_id', context.organizationId)
      .ilike('full_name', '%Pedro%Zegers%')
      .limit(10),
    context.supabase
      .from('lean_kaizen_items')
      .select('id,kaizen_number,title,priority,pdca_stage,status,owner_name,target_date,actual_result,verification_method,estimated_saving,actual_saving,standardized_at,updated_at')
      .eq('organization_id', context.organizationId)
      .neq('status', 'cancelled')
      .order('updated_at', { ascending: false }),
    context.supabase
      .from('contracts')
      .select('id,title,contract_number,status,contract_value,currency,end_date,review_due_date,responsible_person,responsible_area,project_name,updated_at')
      .eq('organization_id', context.organizationId)
      .order('updated_at', { ascending: false }),
  ]);

  const error = peopleResult.error || improvementsResult.error || contractsResult.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const people = (peopleResult.data || []).filter((person) => belongsToPedro(person.full_name));
  const person = people[0] || null;
  const improvements = ((improvementsResult.data || []) as Improvement[]).filter((item) => belongsToPedro(item.owner_name));
  const contracts = ((contractsResult.data || []) as Contract[]).filter((item) => belongsToPedro(item.responsible_person));
  const now = new Date();

  const activeImprovements = improvements.filter((item) => !['act', 'closed'].includes(item.pdca_stage));
  const verifiedImprovements = improvements.filter(
    (item) => ['act', 'closed'].includes(item.pdca_stage) && Boolean(item.actual_result) && Boolean(item.verification_method),
  );
  const overdueImprovements = activeImprovements.filter((item) => {
    const target = endOfDate(item.target_date);
    return target ? target.getTime() < now.getTime() : false;
  });
  const closedWithComparableDate = improvements.filter(
    (item) => item.pdca_stage === 'closed' && Boolean(item.target_date) && Boolean(item.standardized_at),
  );
  const closedOnTime = closedWithComparableDate.filter((item) => {
    const target = endOfDate(item.target_date);
    const closedAt = item.standardized_at ? new Date(item.standardized_at) : null;
    return target && closedAt && !Number.isNaN(closedAt.getTime()) && closedAt.getTime() <= target.getTime();
  });
  const onTimeClosurePct = closedWithComparableDate.length
    ? (closedOnTime.length / closedWithComparableDate.length) * 100
    : null;

  const projectsByName = new Map<string, {
    name: string;
    contracts: number;
    currencies: Set<string>;
    contractualAmountByCurrency: Record<string, number>;
    nearestEndDate: string | null;
    expiringContracts: number;
  }>();

  for (const contract of contracts) {
    const name = String(contract.project_name || '').trim();
    if (!name) continue;
    const key = normalized(name);
    const current = projectsByName.get(key) || {
      name,
      contracts: 0,
      currencies: new Set<string>(),
      contractualAmountByCurrency: {},
      nearestEndDate: null,
      expiringContracts: 0,
    };
    current.contracts += 1;
    const currency = String(contract.currency || '').trim().toUpperCase();
    if (currency) {
      current.currencies.add(currency);
      current.contractualAmountByCurrency[currency] =
        (current.contractualAmountByCurrency[currency] || 0) + Number(contract.contract_value || 0);
    }
    if (contract.end_date && (!current.nearestEndDate || contract.end_date < current.nearestEndDate)) {
      current.nearestEndDate = contract.end_date;
    }
    const remaining = daysUntil(contract.end_date, now);
    if (remaining !== null && remaining >= 0 && remaining <= 30) current.expiringContracts += 1;
    projectsByName.set(key, current);
  }

  const projects = Array.from(projectsByName.values()).map((project) => ({
    name: project.name,
    contracts: project.contracts,
    currencies: Array.from(project.currencies),
    contractualAmountByCurrency: project.contractualAmountByCurrency,
    nearestEndDate: project.nearestEndDate,
    expiringContracts: project.expiringContracts,
    evidenceState: 'contractual_only',
  }));

  const expiringContracts = contracts.filter((contract) => {
    const remaining = daysUntil(contract.end_date, now);
    return remaining !== null && remaining >= 0 && remaining <= 30;
  });
  const waitingVerification = improvements.filter((item) => item.pdca_stage === 'check');

  const decisions = [
    ...(overdueImprovements.length
      ? [{ tone: 'critical', label: 'Mejoras vencidas', value: overdueImprovements.length, detail: 'Reprogramar o cerrar con evidencia.' }]
      : []),
    ...(waitingVerification.length
      ? [{ tone: 'warning', label: 'Resultados por comprobar', value: waitingVerification.length, detail: 'Revisar evidencia antes de estandarizar.' }]
      : []),
    ...(expiringContracts.length
      ? [{ tone: 'warning', label: 'Contratos próximos a vencer', value: expiringContracts.length, detail: 'Vencen dentro de los próximos 30 días.' }]
      : []),
    ...(!person
      ? [{ tone: 'warning', label: 'Identidad no vinculada', value: null, detail: 'Pedro Zegers aún no aparece como persona canónica de RRHH.' }]
      : []),
  ].slice(0, 3);

  return NextResponse.json({
    subject: {
      requestedName: 'Pedro Zegers',
      person,
      mode: 'operational_baseline',
      personalEvaluation: false,
    },
    summary: {
      improvements: improvements.length,
      activeImprovements: activeImprovements.length,
      verifiedImprovements: verifiedImprovements.length,
      overdueImprovements: overdueImprovements.length,
      onTimeClosurePct,
      comparableClosures: closedWithComparableDate.length,
      linkedProjects: projects.length,
      assignedContracts: contracts.length,
    },
    decisions,
    projects,
    improvements,
    contracts,
    evidenceGaps: [
      {
        key: 'project_portfolio',
        label: 'Portafolio integral',
        detail: 'MOTIL aún no tiene una entidad canónica de proyecto con programa, hitos técnicos, presupuesto aprobado y avance físico.',
      },
      {
        key: 'approved_targets',
        label: 'Metas aprobadas',
        detail: 'No existen metas personales aprobadas; los indicadores permanecen como baseline operacional.',
      },
      {
        key: 'economic_benefit',
        label: 'Beneficio económico',
        detail: 'Las mejoras registran ahorro numérico sin una moneda canónica; no se agrega como KPI económico.',
      },
    ],
    provenance: {
      sources: ['people', 'lean_kaizen_items', 'contracts'],
      generatedAt: now.toISOString(),
      rule: 'Solo se incluyen registros de la organización cuyo responsable u owner contiene Pedro y Zegers.',
    },
  });
}
