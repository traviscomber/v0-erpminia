export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type QueryError = { message: string } | null;
type RangeResult<T> = PromiseLike<{ data: T[] | null; error: QueryError }>;
type LifecycleDecision = { id: string; canonical_asset_id: string; decision_type: string; status: string; reason: string; target_date: string | null };
type Asset = { id: string; asset_code: string; name: string; asset_type: string | null; cost_center_code: string | null; is_active: boolean };
type CostCenter = { id: string; code: string; name: string; budget_annual: number | string | null; budget_used: number | string | null; status: string | null };
type InvestmentNeed = { id: string; lifecycle_decision_id: string; canonical_asset_id: string; cost_center_id: string; target_amount: number | string; target_date: string | null; status: string; reason: string; evidence_reference: string | null; proposed_at: string; approved_at: string | null };

const text = (value: unknown) => String(value ?? '').trim();
const money = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const canonical = context.supabase.schema('canonical');

  try {
    const [decisions, assetsResult, costCenters, needs] = await Promise.all([
      fetchAll<LifecycleDecision>((from, to) => context.supabase.from('maintenance_asset_lifecycle_decisions').select('id,canonical_asset_id,decision_type,status,reason,target_date').eq('organization_id', context.organizationId).eq('status', 'approved').in('decision_type', ['rebuild', 'replace']).range(from, to)),
      canonical.from('assets').select('id,asset_code,name,asset_type,cost_center_code,is_active').eq('organization_id', context.organizationId).eq('is_active', true).order('asset_code'),
      fetchAll<CostCenter>((from, to) => context.supabase.from('cost_centers').select('id,code,name,budget_annual,budget_used,status').eq('organization_id', context.organizationId).range(from, to)),
      fetchAll<InvestmentNeed>((from, to) => context.supabase.from('asset_renewal_investment_needs').select('id,lifecycle_decision_id,canonical_asset_id,cost_center_id,target_amount,target_date,status,reason,evidence_reference,proposed_at,approved_at').eq('organization_id', context.organizationId).order('updated_at', { ascending: false }).range(from, to)),
    ]);
    if (assetsResult.error) throw new Error(assetsResult.error.message);

    const assets = (assetsResult.data || []) as Asset[];
    const assetById = new Map(assets.map((asset) => [asset.id, asset]));
    const centerByCode = new Map(costCenters.map((center) => [center.code, center]));
    const centerById = new Map(costCenters.map((center) => [center.id, center]));
    const activeNeedByDecision = new Map<string, InvestmentNeed>();
    for (const need of needs) {
      if (!activeNeedByDecision.has(need.lifecycle_decision_id) && ['proposed', 'approved'].includes(need.status)) activeNeedByDecision.set(need.lifecycle_decision_id, need);
    }

    const approvedByCenter = new Map<string, number>();
    const proposedByCenter = new Map<string, number>();
    for (const need of needs) {
      const amount = money(need.target_amount) || 0;
      if (need.status === 'approved') approvedByCenter.set(need.cost_center_id, (approvedByCenter.get(need.cost_center_id) || 0) + amount);
      if (need.status === 'proposed') proposedByCenter.set(need.cost_center_id, (proposedByCenter.get(need.cost_center_id) || 0) + amount);
    }

    const centers = costCenters.map((center) => {
      const annual = money(center.budget_annual);
      const used = money(center.budget_used) || 0;
      const available = annual === null ? null : annual - used;
      const approvedNeedTotal = approvedByCenter.get(center.id) || 0;
      const proposedNeedTotal = proposedByCenter.get(center.id) || 0;
      return {
        id: center.id,
        code: center.code,
        name: center.name,
        budgetAnnual: annual,
        budgetUsed: used,
        budgetAvailable: available,
        approvedNeedTotal,
        proposedNeedTotal,
        fundingGap: available === null ? null : Math.max(0, approvedNeedTotal - available),
      };
    });
    const centerSummaryById = new Map(centers.map((center) => [center.id, center]));

    const items = decisions.map((decision) => {
      const asset = assetById.get(decision.canonical_asset_id) || null;
      const matchedCenter = asset?.cost_center_code ? centerByCode.get(asset.cost_center_code) || null : null;
      const need = activeNeedByDecision.get(decision.id) || null;
      const effectiveCenter = need ? centerById.get(need.cost_center_id) || matchedCenter : matchedCenter;
      const gaps: string[] = [];
      if (!asset) gaps.push('Activo canónico no disponible');
      if (!asset?.cost_center_code) gaps.push('Activo sin centro de costo registrado');
      else if (!matchedCenter) gaps.push('Centro de costo del activo no encontrado en presupuesto operacional');
      if (effectiveCenter && money(effectiveCenter.budget_annual) === null) gaps.push('Centro de costo sin presupuesto anual registrado');
      return {
        decision,
        asset,
        need,
        costCenter: effectiveCenter ? centerSummaryById.get(effectiveCenter.id) || null : null,
        gaps,
      };
    });

    return NextResponse.json({
      counts: {
        candidates: items.length,
        proposed: items.filter((row) => row.need?.status === 'proposed').length,
        approved: items.filter((row) => row.need?.status === 'approved').length,
        withoutNeed: items.filter((row) => !row.need).length,
        withFundingGap: centers.filter((center) => (center.fundingGap || 0) > 0).length,
      },
      items,
      centers: centers.filter((center) => center.approvedNeedTotal > 0 || center.proposedNeedTotal > 0),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo cargar la planificación de inversión.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const body = await request.json().catch(() => null);
  const lifecycleDecisionId = text(body?.lifecycleDecisionId);
  const targetAmount = money(body?.targetAmount);
  const targetDate = text(body?.targetDate) || null;
  const reason = text(body?.reason);
  const evidenceReference = text(body?.evidenceReference) || null;
  if (!lifecycleDecisionId || targetAmount === null || targetAmount <= 0 || !reason) return NextResponse.json({ error: 'Completa decisión, monto objetivo y fundamento.' }, { status: 400 });
  if (targetDate && Number.isNaN(new Date(targetDate).getTime())) return NextResponse.json({ error: 'Fecha objetivo inválida.' }, { status: 400 });

  const { data: decision } = await context.supabase.from('maintenance_asset_lifecycle_decisions').select('id,canonical_asset_id,decision_type,status').eq('organization_id', context.organizationId).eq('id', lifecycleDecisionId).maybeSingle();
  if (!decision || decision.status !== 'approved' || !['rebuild', 'replace'].includes(decision.decision_type)) return NextResponse.json({ error: 'La necesidad debe provenir de una decisión aprobada de reconstrucción o reemplazo.' }, { status: 409 });

  const canonical = context.supabase.schema('canonical');
  const { data: asset } = await canonical.from('assets').select('id,cost_center_code').eq('organization_id', context.organizationId).eq('id', decision.canonical_asset_id).eq('is_active', true).maybeSingle();
  if (!asset?.cost_center_code) return NextResponse.json({ error: 'El activo no tiene un centro de costo canónico registrado.' }, { status: 409 });
  const { data: costCenter } = await context.supabase.from('cost_centers').select('id,code').eq('organization_id', context.organizationId).eq('code', asset.cost_center_code).maybeSingle();
  if (!costCenter) return NextResponse.json({ error: 'El centro de costo del activo no existe en el presupuesto operacional.' }, { status: 409 });

  const { data: existing } = await context.supabase.from('asset_renewal_investment_needs').select('id,status').eq('organization_id', context.organizationId).eq('lifecycle_decision_id', decision.id).in('status', ['proposed', 'approved']).maybeSingle();
  if (existing?.status === 'approved') return NextResponse.json({ error: 'La decisión ya tiene una necesidad de inversión aprobada. Inactívala antes de reemplazarla.' }, { status: 409 });

  const payload = {
    organization_id: context.organizationId,
    lifecycle_decision_id: decision.id,
    canonical_asset_id: decision.canonical_asset_id,
    cost_center_id: costCenter.id,
    target_amount: targetAmount,
    target_date: targetDate,
    status: 'proposed',
    reason,
    evidence_reference: evidenceReference,
    proposed_by: context.userId,
    proposed_at: new Date().toISOString(),
    approved_by: null,
    approved_at: null,
    updated_at: new Date().toISOString(),
  };
  const result = existing
    ? await context.supabase.from('asset_renewal_investment_needs').update(payload).eq('organization_id', context.organizationId).eq('id', existing.id).select('id').single()
    : await context.supabase.from('asset_renewal_investment_needs').insert(payload).select('id').single();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: result.data.id, status: 'proposed' }, { status: existing ? 200 : 201 });
}

export async function PATCH(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const body = await request.json().catch(() => null);
  const id = text(body?.id);
  const status = text(body?.status);
  if (!id || !['approved', 'rejected', 'inactive'].includes(status)) return NextResponse.json({ error: 'Cambio de estado inválido.' }, { status: 400 });

  const { data: existing } = await context.supabase.from('asset_renewal_investment_needs').select('id,status').eq('organization_id', context.organizationId).eq('id', id).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'Necesidad de inversión no encontrada.' }, { status: 404 });
  if (status === 'approved' && existing.status !== 'proposed') return NextResponse.json({ error: 'Solo una necesidad propuesta puede aprobarse.' }, { status: 409 });

  const update = status === 'approved'
    ? { status, approved_by: context.userId, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    : { status, updated_at: new Date().toISOString() };
  const { error } = await context.supabase.from('asset_renewal_investment_needs').update(update).eq('organization_id', context.organizationId).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, status });
}
