export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

const text = (value: unknown) => String(value ?? '').trim();
const num = (value: unknown) => Number(value ?? 0);

async function fetchAll(queryFactory: (from: number, to: number) => any) {
  const rows: any[] = [];
  const chunk = 1000;
  for (let from = 0; ; from += chunk) {
    const { data, error } = await queryFactory(from, from + chunk - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < chunk) break;
  }
  return rows;
}

function validDate(value: unknown) {
  const raw = text(value);
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : raw;
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const [assetsResult, decisions, workOrders, costs, strategies, preventives, parts] = await Promise.all([
      context.supabase.from('maintenance_canonical_assets_v1').select('id,asset_code,name,asset_type,category,manufacturer,model,is_active,source_payload').eq('organization_id', context.organizationId).eq('is_active', true).order('asset_code'),
      fetchAll((from, to) => context.supabase.from('maintenance_asset_lifecycle_decisions').select('*').eq('organization_id', context.organizationId).order('updated_at', { ascending: false }).range(from, to)),
      fetchAll((from, to) => context.supabase.from('maintenance_work_orders').select('id,canonical_asset_id,work_type,status,scheduled_date,start_date,completion_date,down_time_hours,root_cause,external_cost').eq('organization_id', context.organizationId).range(from, to)),
      fetchAll((from, to) => context.supabase.from('work_order_cost_summary').select('work_order_id,canonical_asset_id,total_cost,parts_cost,labor_cost,external_cost').eq('organization_id', context.organizationId).range(from, to)),
      fetchAll((from, to) => context.supabase.from('maintenance_asset_strategies').select('canonical_asset_id,criticality_level,maintenance_strategy,status').eq('organization_id', context.organizationId).eq('status', 'approved').range(from, to)),
      fetchAll((from, to) => context.supabase.from('preventive_maintenance_schedules').select('id,canonical_asset_id,enabled').eq('organization_id', context.organizationId).eq('enabled', true).range(from, to)),
      fetchAll((from, to) => context.supabase.from('work_order_parts').select('canonical_asset_id,quantity_installed,total_cost').eq('organization_id', context.organizationId).gt('quantity_installed', 0).range(from, to)),
    ]);
    if (assetsResult.error) throw assetsResult.error;

    const decisionByAsset = new Map<string, any>();
    for (const row of decisions) if (!decisionByAsset.has(row.canonical_asset_id)) decisionByAsset.set(row.canonical_asset_id, row);
    const strategyByAsset = new Map(strategies.map((row: any) => [row.canonical_asset_id, row]));
    const preventiveCount = new Map<string, number>();
    for (const row of preventives) if (row.canonical_asset_id) preventiveCount.set(row.canonical_asset_id, (preventiveCount.get(row.canonical_asset_id) || 0) + 1);

    const items = (assetsResult.data || []).map((asset: any) => {
      const assetOrders = workOrders.filter((row) => row.canonical_asset_id === asset.id);
      const assetCosts = costs.filter((row) => row.canonical_asset_id === asset.id);
      const assetParts = parts.filter((row) => row.canonical_asset_id === asset.id);
      const acquisitionDate = validDate(asset.source_payload?.acquisition_date);
      const acquisitionCost = Number.isFinite(Number(asset.source_payload?.acquisition_cost)) ? Number(asset.source_payload?.acquisition_cost) : null;
      const expectedLifespanYears = Number.isFinite(Number(asset.source_payload?.expected_lifespan_years)) ? Number(asset.source_payload?.expected_lifespan_years) : null;
      const completedDates = assetOrders.map((row) => row.completion_date || row.start_date || row.scheduled_date).filter(Boolean).map((value) => new Date(value)).filter((value) => !Number.isNaN(value.getTime()));
      const lastMaintenanceAt = completedDates.length ? new Date(Math.max(...completedDates.map((value) => value.getTime()))).toISOString() : null;
      const strategy = strategyByAsset.get(asset.id) || null;
      const evidence = {
        workOrders: assetOrders.length,
        correctiveWorkOrders: assetOrders.filter((row) => row.work_type === 'correctivo').length,
        completedWorkOrders: assetOrders.filter((row) => ['completada','completado','completed','closed','cerrada','cerrado'].includes(String(row.status || '').toLowerCase())).length,
        totalDowntimeHours: assetOrders.reduce((sum, row) => sum + num(row.down_time_hours), 0),
        totalMaintenanceCost: assetCosts.reduce((sum, row) => sum + num(row.total_cost), 0),
        installedPartLines: assetParts.length,
        installedPartsCost: assetParts.reduce((sum, row) => sum + num(row.total_cost), 0),
        activePreventives: preventiveCount.get(asset.id) || 0,
        lastMaintenanceAt,
        acquisitionDate,
        acquisitionCost,
        expectedLifespanYears,
        criticality: strategy?.criticality_level || null,
        maintenanceStrategy: strategy?.maintenance_strategy || null,
      };
      const gaps: string[] = [];
      if (!acquisitionDate) gaps.push('Sin fecha de adquisición verificable');
      if (!strategy) gaps.push('Sin estrategia de mantenimiento aprobada');
      if (evidence.workOrders === 0) gaps.push('Sin historial de OT vinculado');
      if (assetCosts.length === 0) gaps.push('Sin evidencia de costos de OT');
      return { asset: { ...asset, source_payload: undefined }, decision: decisionByAsset.get(asset.id) || null, evidence, gaps };
    });

    return NextResponse.json({
      counts: {
        assets: items.length,
        withApprovedDecision: items.filter((row) => row.decision?.status === 'approved').length,
        proposed: items.filter((row) => row.decision?.status === 'proposed').length,
        replaceOrRetire: items.filter((row) => row.decision?.status === 'approved' && ['replace','retire'].includes(row.decision.decision_type)).length,
        withEvidenceGaps: items.filter((row) => row.gaps.length > 0).length,
      },
      items,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[maintenance/asset-lifecycle:get]', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo cargar el ciclo de vida de activos.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const body = await request.json().catch(() => null);
  const assetCode = text(body?.assetCode);
  const decisionType = text(body?.decisionType);
  const reason = text(body?.reason);
  const evidenceReference = text(body?.evidenceReference) || null;
  const targetDate = validDate(body?.targetDate);
  if (!assetCode || !['maintain','repair','rebuild','replace','retire'].includes(decisionType) || !reason) return NextResponse.json({ error: 'Completa equipo, decisión y fundamento.' }, { status: 400 });

  const { data: asset } = await context.supabase.from('maintenance_canonical_assets_v1').select('id').eq('organization_id', context.organizationId).eq('asset_code', assetCode).eq('is_active', true).maybeSingle();
  if (!asset) return NextResponse.json({ error: 'Equipo canónico activo no encontrado.' }, { status: 404 });
  const { data: existing } = await context.supabase.from('maintenance_asset_lifecycle_decisions').select('id,status').eq('organization_id', context.organizationId).eq('canonical_asset_id', asset.id).in('status', ['proposed','approved']).maybeSingle();
  if (existing?.status === 'approved') return NextResponse.json({ error: 'El equipo ya tiene una decisión aprobada. Inactívala antes de proponer otra.' }, { status: 409 });

  const payload = { organization_id: context.organizationId, canonical_asset_id: asset.id, decision_type: decisionType, status: 'proposed', reason, evidence_reference: evidenceReference, target_date: targetDate, proposed_by: context.userId, proposed_at: new Date().toISOString(), approved_by: null, approved_at: null, updated_at: new Date().toISOString() };
  const result = existing
    ? await context.supabase.from('maintenance_asset_lifecycle_decisions').update(payload).eq('organization_id', context.organizationId).eq('id', existing.id).select('id').single()
    : await context.supabase.from('maintenance_asset_lifecycle_decisions').insert(payload).select('id').single();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: result.data.id, status: 'proposed' }, { status: existing ? 200 : 201 });
}

export async function PATCH(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const body = await request.json().catch(() => null);
  const id = text(body?.id);
  const status = text(body?.status);
  if (!id || !['approved','rejected','inactive'].includes(status)) return NextResponse.json({ error: 'Cambio de estado inválido.' }, { status: 400 });
  const { data: existing } = await context.supabase.from('maintenance_asset_lifecycle_decisions').select('id').eq('organization_id', context.organizationId).eq('id', id).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'Decisión no encontrada.' }, { status: 404 });
  const approved = status === 'approved';
  const { error } = await context.supabase.from('maintenance_asset_lifecycle_decisions').update({ status, approved_by: approved ? context.userId : null, approved_at: approved ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq('organization_id', context.organizationId).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, status });
}
