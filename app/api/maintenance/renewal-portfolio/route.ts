export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type QueryError = { message: string } | null;
type RangeResult<T> = PromiseLike<{ data: T[] | null; error: QueryError }>;
type InvestmentNeed = {
  id: string;
  canonical_asset_id: string;
  cost_center_id: string;
  target_amount: number | string;
  target_date: string | null;
  reason: string;
  status: string;
  approved_at: string | null;
};
type Initiative = {
  id: string;
  investment_need_id: string;
  canonical_asset_id: string;
  status: string;
  execution_note: string | null;
  started_at: string | null;
  completed_at: string | null;
};
type ExecutionLink = {
  id: string;
  initiative_id: string;
  purchase_order_id: string | null;
  contract_id: string | null;
  work_order_id: string | null;
};
type ClosureDecision = {
  id: string;
  initiative_id: string;
  previous_asset_id: string;
  replacement_asset_id: string | null;
  decision_type: string;
  status: string;
  commissioning_date: string | null;
  reason: string;
  approved_at: string | null;
};
type ValidationSnapshot = { comparableSources?: string[]; gaps?: string[] };
type Validation = {
  id: string;
  commissioning_decision_id: string;
  result: string;
  status: string;
  reason: string;
  evidence_reference: string | null;
  evidence_snapshot: ValidationSnapshot | null;
  proposed_at: string;
  approved_at: string | null;
};
type Asset = {
  id: string;
  asset_code: string;
  name: string;
  asset_type: string | null;
  cost_center_code: string | null;
  is_active: boolean;
};
type CostCenter = { id: string; code: string; name: string };
type PurchaseOrder = { id: string; po_number: string; total_amount: number | string | null; status: string | null };
type Contract = { id: string; contract_number: string; contract_value: number | string | null; paid_amount: number | string | null; status: string | null };
type WorkOrder = { id: string; work_order_number: string; external_cost: number | string | null; status: string | null };
type WorkOrderCost = { work_order_id: string; total_cost: number | string | null };

type ResultState = 'validated' | 'requires_follow_up' | 'pending_evidence' | 'not_validated';

const num = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

async function fetchAll<T>(queryFactory: (from: number, to: number) => RangeResult<T>) {
  const rows: T[] = [];
  const chunk = 1000;
  for (let from = 0; ; from += chunk) {
    const { data, error } = await queryFactory(from, from + chunk - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data || []));
    if (!data || data.length < chunk) break;
  }
  return rows;
}

function classifyResult(validation: Validation | null): ResultState {
  if (!validation) return 'not_validated';
  if (validation.status !== 'approved') return 'pending_evidence';
  if (validation.result === 'satisfactory') return 'validated';
  if (validation.result === 'requires_follow_up') return 'requires_follow_up';
  return 'pending_evidence';
}

function stageLabel(initiative: Initiative | null, closure: ClosureDecision | null, validation: Validation | null) {
  if (!initiative) return 'investment_approved';
  if (initiative.status === 'planned') return 'execution_planned';
  if (initiative.status === 'in_progress') return 'execution_in_progress';
  if (initiative.status !== 'completed') return `execution_${initiative.status || 'unknown'}`;
  if (!closure) return 'awaiting_closure';
  if (closure.status !== 'approved') return 'closure_proposed';
  if (!validation) return 'awaiting_validation';
  if (validation.status !== 'approved') return 'validation_proposed';
  return `validation_${validation.result}`;
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const canonical = context.supabase.schema('canonical');

  try {
    const [needs, initiatives, links, closures, validations, assetsResult, costCenters, purchaseOrders, contracts, workOrders, workOrderCosts] = await Promise.all([
      fetchAll<InvestmentNeed>((from, to) => context.supabase.from('asset_renewal_investment_needs').select('id,canonical_asset_id,cost_center_id,target_amount,target_date,reason,status,approved_at').eq('organization_id', context.organizationId).eq('status', 'approved').order('approved_at', { ascending: false }).range(from, to)),
      fetchAll<Initiative>((from, to) => context.supabase.from('asset_renewal_execution_initiatives').select('id,investment_need_id,canonical_asset_id,status,execution_note,started_at,completed_at').eq('organization_id', context.organizationId).neq('status', 'cancelled').order('updated_at', { ascending: false }).range(from, to)),
      fetchAll<ExecutionLink>((from, to) => context.supabase.from('asset_renewal_execution_links').select('id,initiative_id,purchase_order_id,contract_id,work_order_id').eq('organization_id', context.organizationId).range(from, to)),
      fetchAll<ClosureDecision>((from, to) => context.supabase.from('asset_renewal_commissioning_decisions').select('id,initiative_id,previous_asset_id,replacement_asset_id,decision_type,status,commissioning_date,reason,approved_at').eq('organization_id', context.organizationId).in('status', ['proposed', 'approved']).order('updated_at', { ascending: false }).range(from, to)),
      fetchAll<Validation>((from, to) => context.supabase.from('asset_renewal_post_commissioning_validations').select('id,commissioning_decision_id,result,status,reason,evidence_reference,evidence_snapshot,proposed_at,approved_at').eq('organization_id', context.organizationId).in('status', ['proposed', 'approved']).order('updated_at', { ascending: false }).range(from, to)),
      canonical.from('assets').select('id,asset_code,name,asset_type,cost_center_code,is_active').eq('organization_id', context.organizationId).order('asset_code'),
      fetchAll<CostCenter>((from, to) => context.supabase.from('cost_centers').select('id,code,name').eq('organization_id', context.organizationId).range(from, to)),
      fetchAll<PurchaseOrder>((from, to) => context.supabase.from('purchase_orders').select('id,po_number,total_amount,status').eq('organization_id', context.organizationId).range(from, to)),
      fetchAll<Contract>((from, to) => context.supabase.from('contracts').select('id,contract_number,contract_value,paid_amount,status').eq('organization_id', context.organizationId).range(from, to)),
      fetchAll<WorkOrder>((from, to) => context.supabase.from('maintenance_work_orders').select('id,work_order_number,external_cost,status').eq('organization_id', context.organizationId).range(from, to)),
      fetchAll<WorkOrderCost>((from, to) => context.supabase.from('work_order_cost_summary').select('work_order_id,total_cost').eq('organization_id', context.organizationId).range(from, to)),
    ]);
    if (assetsResult.error) throw new Error(assetsResult.error.message);

    const assets = (assetsResult.data || []) as Asset[];
    const assetById = new Map(assets.map((row) => [row.id, row]));
    const centerById = new Map(costCenters.map((row) => [row.id, row]));
    const initiativeByNeed = new Map<string, Initiative>();
    for (const row of initiatives) if (!initiativeByNeed.has(row.investment_need_id)) initiativeByNeed.set(row.investment_need_id, row);
    const closureByInitiative = new Map<string, ClosureDecision>();
    for (const row of closures) if (!closureByInitiative.has(row.initiative_id)) closureByInitiative.set(row.initiative_id, row);
    const validationByClosure = new Map<string, Validation>();
    for (const row of validations) if (!validationByClosure.has(row.commissioning_decision_id)) validationByClosure.set(row.commissioning_decision_id, row);
    const poById = new Map(purchaseOrders.map((row) => [row.id, row]));
    const contractById = new Map(contracts.map((row) => [row.id, row]));
    const workOrderById = new Map(workOrders.map((row) => [row.id, row]));
    const workOrderCostById = new Map(workOrderCosts.map((row) => [row.work_order_id, num(row.total_cost)]));

    const items = needs.map((need) => {
      const initiative = initiativeByNeed.get(need.id) || null;
      const closure = initiative ? closureByInitiative.get(initiative.id) || null : null;
      const validation = closure ? validationByClosure.get(closure.id) || null : null;
      const resultState = classifyResult(validation);
      const initiativeLinks = initiative ? links.filter((row) => row.initiative_id === initiative.id) : [];
      const purchaseOrderIds = Array.from(new Set(initiativeLinks.map((row) => row.purchase_order_id).filter((value): value is string => Boolean(value))));
      const contractIds = Array.from(new Set(initiativeLinks.map((row) => row.contract_id).filter((value): value is string => Boolean(value))));
      const workOrderIds = Array.from(new Set(initiativeLinks.map((row) => row.work_order_id).filter((value): value is string => Boolean(value))));
      const linkedPurchaseOrders = purchaseOrderIds.map((id) => poById.get(id)).filter((row): row is PurchaseOrder => Boolean(row));
      const linkedContracts = contractIds.map((id) => contractById.get(id)).filter((row): row is Contract => Boolean(row));
      const linkedWorkOrders = workOrderIds.map((id) => workOrderById.get(id)).filter((row): row is WorkOrder => Boolean(row));
      const financial = {
        targetAmount: num(need.target_amount),
        purchaseOrderCommitment: linkedPurchaseOrders.reduce((sum, row) => sum + num(row.total_amount), 0),
        contractCommitment: linkedContracts.reduce((sum, row) => sum + num(row.contract_value), 0),
        contractPaid: linkedContracts.reduce((sum, row) => sum + num(row.paid_amount), 0),
        workOrderActualCost: linkedWorkOrders.reduce((sum, row) => sum + (workOrderCostById.has(row.id) ? (workOrderCostById.get(row.id) || 0) : num(row.external_cost)), 0),
      };
      const gaps: string[] = [];
      if (!initiative) gaps.push('Sin iniciativa de ejecución registrada');
      else if (initiative.status !== 'completed') gaps.push('Ejecución aún no completada');
      if (initiative?.status === 'completed' && !closure) gaps.push('Sin cierre de renovación propuesto');
      if (closure && closure.status !== 'approved') gaps.push('Cierre pendiente de aprobación');
      if (closure?.status === 'approved' && !closure.commissioning_date) gaps.push('Cierre aprobado sin fecha explícita de puesta en servicio');
      if (closure?.status === 'approved' && !validation) gaps.push('Aún sin validación post-puesta en servicio');
      if (validation?.status === 'proposed') gaps.push('Validación propuesta pendiente de aprobación');
      if (validation?.status === 'approved' && validation.result === 'insufficient_evidence') gaps.push('Validación aprobada con evidencia insuficiente');
      const snapshotGaps = Array.isArray(validation?.evidence_snapshot?.gaps) ? validation.evidence_snapshot!.gaps! : [];

      return {
        need,
        asset: assetById.get(need.canonical_asset_id) || null,
        replacementAsset: closure?.replacement_asset_id ? assetById.get(closure.replacement_asset_id) || null : null,
        costCenter: centerById.get(need.cost_center_id) || null,
        initiative,
        closure,
        validation,
        resultState,
        stage: stageLabel(initiative, closure, validation),
        financial,
        references: {
          purchaseOrders: linkedPurchaseOrders.map((row) => ({ id: row.id, number: row.po_number, status: row.status, amount: num(row.total_amount) })),
          contracts: linkedContracts.map((row) => ({ id: row.id, number: row.contract_number, status: row.status, value: num(row.contract_value), paid: num(row.paid_amount) })),
          workOrders: linkedWorkOrders.map((row) => ({ id: row.id, number: row.work_order_number, status: row.status, actualCost: workOrderCostById.has(row.id) ? (workOrderCostById.get(row.id) || 0) : num(row.external_cost) })),
        },
        comparableSources: Array.isArray(validation?.evidence_snapshot?.comparableSources) ? validation.evidence_snapshot!.comparableSources! : [],
        gaps: Array.from(new Set([...gaps, ...snapshotGaps])),
      };
    });

    const centerItems = new Map<string, typeof items>();
    for (const item of items) {
      const list = centerItems.get(item.need.cost_center_id) || [];
      list.push(item);
      centerItems.set(item.need.cost_center_id, list);
    }

    const centers = Array.from(centerItems.entries()).map(([centerId, rows]) => {
      const poIds = new Set<string>();
      const contractIds = new Set<string>();
      const workOrderIds = new Set<string>();
      for (const row of rows) {
        for (const reference of row.references.purchaseOrders) poIds.add(reference.id);
        for (const reference of row.references.contracts) contractIds.add(reference.id);
        for (const reference of row.references.workOrders) workOrderIds.add(reference.id);
      }
      return {
        costCenter: centerById.get(centerId) || null,
        counts: {
          renewals: rows.length,
          validated: rows.filter((row) => row.resultState === 'validated').length,
          requiresFollowUp: rows.filter((row) => row.resultState === 'requires_follow_up').length,
          pendingEvidence: rows.filter((row) => row.resultState === 'pending_evidence').length,
          notValidated: rows.filter((row) => row.resultState === 'not_validated').length,
        },
        financial: {
          targetAmount: rows.reduce((sum, row) => sum + row.financial.targetAmount, 0),
          purchaseOrderCommitment: Array.from(poIds).reduce((sum, id) => sum + num(poById.get(id)?.total_amount), 0),
          contractCommitment: Array.from(contractIds).reduce((sum, id) => sum + num(contractById.get(id)?.contract_value), 0),
          contractPaid: Array.from(contractIds).reduce((sum, id) => sum + num(contractById.get(id)?.paid_amount), 0),
          workOrderActualCost: Array.from(workOrderIds).reduce((sum, id) => sum + (workOrderCostById.has(id) ? (workOrderCostById.get(id) || 0) : num(workOrderById.get(id)?.external_cost)), 0),
        },
      };
    }).sort((a, b) => (a.costCenter?.code || '').localeCompare(b.costCenter?.code || ''));

    return NextResponse.json({
      counts: {
        renewals: items.length,
        validated: items.filter((row) => row.resultState === 'validated').length,
        requiresFollowUp: items.filter((row) => row.resultState === 'requires_follow_up').length,
        pendingEvidence: items.filter((row) => row.resultState === 'pending_evidence').length,
        notValidated: items.filter((row) => row.resultState === 'not_validated').length,
        withGaps: items.filter((row) => row.gaps.length > 0).length,
      },
      items,
      centers,
      generatedAt: new Date().toISOString(),
      financialRule: 'Los montos por OC, contratos, pagos contractuales y costos de OT son fuentes distintas y no deben sumarse entre sí como una única ejecución financiera.',
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo cargar la gobernanza de cartera de renovación.' }, { status: 500 });
  }
}
