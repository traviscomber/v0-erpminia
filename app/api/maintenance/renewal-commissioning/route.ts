export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type QueryError = { message: string } | null;
type RangeResult<T> = PromiseLike<{ data: T[] | null; error: QueryError }>;
type Initiative = { id: string; canonical_asset_id: string; investment_need_id: string; status: string; completed_at: string | null; execution_note: string | null };
type ExecutionLink = { id: string; initiative_id: string; purchase_order_id: string | null; contract_id: string | null; work_order_id: string | null; link_type: string };
type Asset = { id: string; asset_code: string; name: string; asset_type: string | null; is_active: boolean };
type PurchaseOrder = { id: string; po_number: string; status: string | null };
type Contract = { id: string; contract_number: string; status: string | null; document_url: string | null; file_url: string | null };
type WorkOrder = { id: string; work_order_number: string; status: string | null };
type ProcurementDocument = { id: string; contract_id: string | null; document_type: string | null; document_number: string | null; status: string | null; document_url: string | null; file_path: string | null };
type ClosureDecision = { id: string; initiative_id: string; previous_asset_id: string; replacement_asset_id: string | null; decision_type: string; status: string; commissioning_date: string | null; reason: string; evidence_reference: string | null; proposed_at: string; approved_at: string | null };

const text = (value: unknown) => String(value ?? '').trim();
const completedWorkOrder = (status: string | null) => ['completed', 'closed', 'cerrada', 'cerrado', 'completada', 'completado'].includes(text(status).toLowerCase());
const receivedPurchaseOrder = (status: string | null) => ['received', 'closed', 'completed', 'recibida', 'recibido', 'cerrada', 'cerrado'].includes(text(status).toLowerCase());

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

function buildGaps(initiative: Initiative, links: ExecutionLink[], purchaseOrders: PurchaseOrder[], contracts: Contract[], workOrders: WorkOrder[], documents: ProcurementDocument[]) {
  const gaps: string[] = [];
  if (initiative.status !== 'completed' || !initiative.completed_at) gaps.push('La iniciativa de ejecución no está completada');
  if (links.length === 0) gaps.push('Sin evidencia de ejecución vinculada');

  const poById = new Map(purchaseOrders.map((row) => [row.id, row]));
  const contractById = new Map(contracts.map((row) => [row.id, row]));
  const woById = new Map(workOrders.map((row) => [row.id, row]));
  const docsByContract = new Map<string, ProcurementDocument[]>();
  for (const document of documents) {
    if (!document.contract_id) continue;
    const current = docsByContract.get(document.contract_id) || [];
    current.push(document);
    docsByContract.set(document.contract_id, current);
  }

  const linkedPurchaseOrders = links.filter((row) => row.purchase_order_id).map((row) => poById.get(row.purchase_order_id!)).filter((row): row is PurchaseOrder => Boolean(row));
  const linkedContracts = links.filter((row) => row.contract_id).map((row) => contractById.get(row.contract_id!)).filter((row): row is Contract => Boolean(row));
  const linkedWorkOrders = links.filter((row) => row.work_order_id).map((row) => woById.get(row.work_order_id!)).filter((row): row is WorkOrder => Boolean(row));

  const openWorkOrders = linkedWorkOrders.filter((row) => !completedWorkOrder(row.status));
  if (openWorkOrders.length > 0) gaps.push(`${openWorkOrders.length} OT vinculada(s) aún no completada(s)`);
  const openPurchaseOrders = linkedPurchaseOrders.filter((row) => !receivedPurchaseOrder(row.status));
  if (openPurchaseOrders.length > 0) gaps.push(`${openPurchaseOrders.length} OC vinculada(s) sin recepción/cierre registrado`);

  let documentedContracts = 0;
  for (const contract of linkedContracts) {
    const hasFile = Boolean(contract.document_url || contract.file_url);
    const hasDocument = (docsByContract.get(contract.id) || []).some((document) => Boolean(document.document_url || document.file_path));
    if (hasFile || hasDocument) documentedContracts += 1;
  }
  if (linkedContracts.length > documentedContracts) gaps.push(`${linkedContracts.length - documentedContracts} contrato(s) vinculado(s) sin evidencia documental registrada`);

  return {
    gaps,
    evidence: {
      executionLinks: links.length,
      purchaseOrders: linkedPurchaseOrders.length,
      receivedPurchaseOrders: linkedPurchaseOrders.filter((row) => receivedPurchaseOrder(row.status)).length,
      contracts: linkedContracts.length,
      documentedContracts,
      workOrders: linkedWorkOrders.length,
      completedWorkOrders: linkedWorkOrders.filter((row) => completedWorkOrder(row.status)).length,
      documents: documents.length + linkedContracts.filter((row) => row.document_url || row.file_url).length,
    },
  };
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const canonical = context.supabase.schema('canonical');

  try {
    const [initiatives, links, assetsResult, purchaseOrders, contracts, workOrders, decisions] = await Promise.all([
      fetchAll<Initiative>((from, to) => context.supabase.from('asset_renewal_execution_initiatives').select('id,canonical_asset_id,investment_need_id,status,completed_at,execution_note').eq('organization_id', context.organizationId).neq('status', 'cancelled').range(from, to)),
      fetchAll<ExecutionLink>((from, to) => context.supabase.from('asset_renewal_execution_links').select('id,initiative_id,purchase_order_id,contract_id,work_order_id,link_type').eq('organization_id', context.organizationId).range(from, to)),
      canonical.from('assets').select('id,asset_code,name,asset_type,is_active').eq('organization_id', context.organizationId).order('asset_code'),
      fetchAll<PurchaseOrder>((from, to) => context.supabase.from('purchase_orders').select('id,po_number,status').eq('organization_id', context.organizationId).range(from, to)),
      fetchAll<Contract>((from, to) => context.supabase.from('contracts').select('id,contract_number,status,document_url,file_url').eq('organization_id', context.organizationId).range(from, to)),
      fetchAll<WorkOrder>((from, to) => context.supabase.from('maintenance_work_orders').select('id,work_order_number,status').eq('organization_id', context.organizationId).range(from, to)),
      fetchAll<ClosureDecision>((from, to) => context.supabase.from('asset_renewal_commissioning_decisions').select('id,initiative_id,previous_asset_id,replacement_asset_id,decision_type,status,commissioning_date,reason,evidence_reference,proposed_at,approved_at').eq('organization_id', context.organizationId).order('updated_at', { ascending: false }).range(from, to)),
    ]);
    if (assetsResult.error) throw new Error(assetsResult.error.message);

    const assets = (assetsResult.data || []) as Asset[];
    const assetById = new Map(assets.map((asset) => [asset.id, asset]));
    const activeDecisionByInitiative = new Map<string, ClosureDecision>();
    for (const decision of decisions) {
      if (!activeDecisionByInitiative.has(decision.initiative_id) && ['proposed', 'approved'].includes(decision.status)) activeDecisionByInitiative.set(decision.initiative_id, decision);
    }

    const contractIds = Array.from(new Set(links.map((row) => row.contract_id).filter((value): value is string => Boolean(value))));
    const documents = contractIds.length > 0
      ? await fetchAll<ProcurementDocument>((from, to) => context.supabase.from('procurement_documents').select('id,contract_id,document_type,document_number,status,document_url,file_path').in('contract_id', contractIds).range(from, to))
      : [];

    const items = initiatives.map((initiative) => {
      const initiativeLinks = links.filter((row) => row.initiative_id === initiative.id);
      const contractLinkIds = new Set(initiativeLinks.map((row) => row.contract_id).filter((value): value is string => Boolean(value)));
      const initiativeDocuments = documents.filter((document) => document.contract_id && contractLinkIds.has(document.contract_id));
      const readiness = buildGaps(initiative, initiativeLinks, purchaseOrders, contracts, workOrders, initiativeDocuments);
      const decision = activeDecisionByInitiative.get(initiative.id) || null;
      return {
        initiative,
        previousAsset: assetById.get(initiative.canonical_asset_id) || null,
        replacementAsset: decision?.replacement_asset_id ? assetById.get(decision.replacement_asset_id) || null : null,
        decision,
        evidence: readiness.evidence,
        gaps: readiness.gaps,
        readyToApprove: readiness.gaps.length === 0,
      };
    });

    return NextResponse.json({
      counts: {
        initiatives: items.length,
        completed: items.filter((row) => row.initiative.status === 'completed').length,
        ready: items.filter((row) => row.readyToApprove && !row.decision).length,
        proposed: items.filter((row) => row.decision?.status === 'proposed').length,
        approved: items.filter((row) => row.decision?.status === 'approved').length,
        withGaps: items.filter((row) => row.gaps.length > 0).length,
      },
      items,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo cargar el cierre de renovación.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const body = await request.json().catch(() => null);
  const initiativeId = text(body?.initiativeId);
  const decisionType = text(body?.decisionType);
  const reason = text(body?.reason);
  const evidenceReference = text(body?.evidenceReference) || null;
  const commissioningDate = text(body?.commissioningDate) || null;
  const replacementAssetCode = text(body?.replacementAssetCode);
  if (!initiativeId || !['commissioned', 'closed', 'replacement_effective'].includes(decisionType) || !reason) return NextResponse.json({ error: 'Completa iniciativa, tipo de cierre y fundamento.' }, { status: 400 });
  if (commissioningDate && Number.isNaN(new Date(`${commissioningDate}T00:00:00`).getTime())) return NextResponse.json({ error: 'Fecha de puesta en servicio inválida.' }, { status: 400 });

  const { data: initiative } = await context.supabase.from('asset_renewal_execution_initiatives').select('id,canonical_asset_id,status,completed_at').eq('organization_id', context.organizationId).eq('id', initiativeId).maybeSingle();
  if (!initiative) return NextResponse.json({ error: 'Iniciativa de ejecución no encontrada.' }, { status: 404 });
  if (initiative.status !== 'completed' || !initiative.completed_at) return NextResponse.json({ error: 'Solo una iniciativa completada puede pasar a cierre.' }, { status: 409 });

  const { data: existing } = await context.supabase.from('asset_renewal_commissioning_decisions').select('id,status').eq('organization_id', context.organizationId).eq('initiative_id', initiative.id).in('status', ['proposed', 'approved']).maybeSingle();
  if (existing) return NextResponse.json({ error: 'La iniciativa ya tiene una decisión de cierre activa.' }, { status: 409 });

  let replacementAssetId: string | null = null;
  if (decisionType === 'replacement_effective') {
    if (!replacementAssetCode) return NextResponse.json({ error: 'Indica el código exacto del activo de reemplazo ya registrado.' }, { status: 400 });
    const { data: replacement } = await context.supabase.schema('canonical').from('assets').select('id,is_active').eq('organization_id', context.organizationId).eq('asset_code', replacementAssetCode).maybeSingle();
    if (!replacement) return NextResponse.json({ error: 'Activo de reemplazo no encontrado en el modelo canónico.' }, { status: 404 });
    if (!replacement.is_active) return NextResponse.json({ error: 'El activo de reemplazo existe pero no está activo.' }, { status: 409 });
    if (replacement.id === initiative.canonical_asset_id) return NextResponse.json({ error: 'El activo de reemplazo debe ser distinto al activo anterior.' }, { status: 409 });
    replacementAssetId = replacement.id;
  } else if (replacementAssetCode) {
    return NextResponse.json({ error: 'Solo un reemplazo efectivo admite un activo de reemplazo.' }, { status: 400 });
  }

  const { data, error } = await context.supabase.from('asset_renewal_commissioning_decisions').insert({
    organization_id: context.organizationId,
    initiative_id: initiative.id,
    previous_asset_id: initiative.canonical_asset_id,
    replacement_asset_id: replacementAssetId,
    decision_type: decisionType,
    status: 'proposed',
    commissioning_date: commissioningDate,
    reason,
    evidence_reference: evidenceReference,
    proposed_by: context.userId,
  }).select('id').single();
  if (error) return NextResponse.json({ error: error.code === '23505' ? 'La iniciativa ya tiene una decisión de cierre activa.' : error.message }, { status: error.code === '23505' ? 409 : 500 });
  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const body = await request.json().catch(() => null);
  const id = text(body?.id);
  const status = text(body?.status);
  if (!id || !['approved', 'rejected', 'inactive'].includes(status)) return NextResponse.json({ error: 'Estado de cierre inválido.' }, { status: 400 });

  const { data: decision } = await context.supabase.from('asset_renewal_commissioning_decisions').select('id,initiative_id,replacement_asset_id,decision_type,status').eq('organization_id', context.organizationId).eq('id', id).maybeSingle();
  if (!decision) return NextResponse.json({ error: 'Decisión de cierre no encontrada.' }, { status: 404 });
  if (status === 'approved') {
    const { data: initiative } = await context.supabase.from('asset_renewal_execution_initiatives').select('id,canonical_asset_id,investment_need_id,status,completed_at,execution_note').eq('organization_id', context.organizationId).eq('id', decision.initiative_id).maybeSingle();
    if (!initiative) return NextResponse.json({ error: 'La iniciativa asociada ya no está disponible.' }, { status: 409 });
    const initiativeLinks = await fetchAll<ExecutionLink>((from, to) => context.supabase.from('asset_renewal_execution_links').select('id,initiative_id,purchase_order_id,contract_id,work_order_id,link_type').eq('organization_id', context.organizationId).eq('initiative_id', initiative.id).range(from, to));
    const poIds = initiativeLinks.map((row) => row.purchase_order_id).filter((value): value is string => Boolean(value));
    const contractIds = initiativeLinks.map((row) => row.contract_id).filter((value): value is string => Boolean(value));
    const woIds = initiativeLinks.map((row) => row.work_order_id).filter((value): value is string => Boolean(value));
    const [purchaseOrders, contracts, workOrders, documents] = await Promise.all([
      poIds.length ? fetchAll<PurchaseOrder>((from, to) => context.supabase.from('purchase_orders').select('id,po_number,status').eq('organization_id', context.organizationId).in('id', poIds).range(from, to)) : Promise.resolve([]),
      contractIds.length ? fetchAll<Contract>((from, to) => context.supabase.from('contracts').select('id,contract_number,status,document_url,file_url').eq('organization_id', context.organizationId).in('id', contractIds).range(from, to)) : Promise.resolve([]),
      woIds.length ? fetchAll<WorkOrder>((from, to) => context.supabase.from('maintenance_work_orders').select('id,work_order_number,status').eq('organization_id', context.organizationId).in('id', woIds).range(from, to)) : Promise.resolve([]),
      contractIds.length ? fetchAll<ProcurementDocument>((from, to) => context.supabase.from('procurement_documents').select('id,contract_id,document_type,document_number,status,document_url,file_path').in('contract_id', contractIds).range(from, to)) : Promise.resolve([]),
    ]);
    const readiness = buildGaps(initiative, initiativeLinks, purchaseOrders, contracts, workOrders, documents);
    if (readiness.gaps.length > 0) return NextResponse.json({ error: `No se puede aprobar el cierre: ${readiness.gaps.join('; ')}` }, { status: 409 });
    if (decision.decision_type === 'replacement_effective') {
      if (!decision.replacement_asset_id) return NextResponse.json({ error: 'El cierre de reemplazo no tiene activo de reemplazo asociado.' }, { status: 409 });
      const { data: replacement } = await context.supabase.schema('canonical').from('assets').select('id,is_active').eq('organization_id', context.organizationId).eq('id', decision.replacement_asset_id).maybeSingle();
      if (!replacement || !replacement.is_active) return NextResponse.json({ error: 'El activo de reemplazo ya no está disponible o activo.' }, { status: 409 });
    }
  }

  const now = new Date().toISOString();
  const updates = status === 'approved'
    ? { status, approved_by: context.userId, approved_at: now, updated_at: now }
    : { status, approved_by: null, approved_at: null, updated_at: now };
  const { error } = await context.supabase.from('asset_renewal_commissioning_decisions').update(updates).eq('organization_id', context.organizationId).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
