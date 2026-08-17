export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

const text = (value: unknown) => String(value ?? '').trim();

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

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const [assetsResult, strategies, preventive, bom, plans, telemetry, criticalSpareRows] = await Promise.all([
      context.supabase.from('maintenance_canonical_assets_v1').select('id,asset_code,name,asset_type,category,manufacturer,model,is_active').eq('organization_id', context.organizationId).eq('is_active', true).order('asset_code'),
      fetchAll((from, to) => context.supabase.from('maintenance_asset_strategies').select('*').eq('organization_id', context.organizationId).order('updated_at', { ascending: false }).range(from, to)),
      fetchAll((from, to) => context.supabase.from('preventive_maintenance_schedules').select('id,canonical_asset_id,enabled').eq('organization_id', context.organizationId).eq('enabled', true).range(from, to)),
      fetchAll((from, to) => context.supabase.from('equipment_technical_bom_lines').select('id,canonical_asset_id,canonical_product_id,status').eq('organization_id', context.organizationId).eq('status', 'approved').range(from, to)),
      fetchAll((from, to) => context.supabase.from('maintenance_standard_job_plans').select('id,canonical_asset_id,asset_type,status').eq('organization_id', context.organizationId).eq('status', 'approved').range(from, to)),
      fetchAll((from, to) => context.supabase.from('telemetry_asset_links').select('id,canonical_asset_id').eq('organization_id', context.organizationId).range(from, to)),
      fetchAll((from, to) => context.supabase.from('critical_spare_observations_v1').select('product_id,minimum_required,shortage_quantity,wo_quantity_requested,outbound_quantity,approved_obsolete').eq('organization_id', context.organizationId).range(from, to)),
    ]);

    if (assetsResult.error) throw assetsResult.error;
    const assets = assetsResult.data || [];
    const strategyByAsset = new Map<string, any>();
    for (const row of strategies) if (!strategyByAsset.has(row.canonical_asset_id)) strategyByAsset.set(row.canonical_asset_id, row);
    const preventiveCount = new Map<string, number>();
    for (const row of preventive) if (row.canonical_asset_id) preventiveCount.set(row.canonical_asset_id, (preventiveCount.get(row.canonical_asset_id) || 0) + 1);
    const bomByAsset = new Map<string, any[]>();
    for (const row of bom) {
      const list = bomByAsset.get(row.canonical_asset_id) || [];
      list.push(row);
      bomByAsset.set(row.canonical_asset_id, list);
    }
    const telemetrySet = new Set(telemetry.map((row) => row.canonical_asset_id).filter(Boolean));
    const criticalProductSet = new Set(
      criticalSpareRows
        .filter((row) => Number(row.shortage_quantity || 0) > 0 || Number(row.minimum_required || 0) > 0 || Number(row.wo_quantity_requested || 0) > 0 || Number(row.outbound_quantity || 0) > 0 || row.approved_obsolete === true)
        .map((row) => row.product_id)
        .filter(Boolean),
    );

    const items = assets.map((asset: any) => {
      const strategy = strategyByAsset.get(asset.id) || null;
      const approvedBom = bomByAsset.get(asset.id) || [];
      const exactPlans = plans.filter((row) => row.canonical_asset_id === asset.id);
      const typePlans = plans.filter((row) => !row.canonical_asset_id && row.asset_type && row.asset_type === asset.asset_type);
      const criticalSpareLinks = approvedBom.filter((row) => criticalProductSet.has(row.canonical_product_id));
      const coverage = {
        preventive: preventiveCount.get(asset.id) || 0,
        approvedBomLines: approvedBom.length,
        criticalSpareLinks: criticalSpareLinks.length,
        approvedStandardPlans: exactPlans.length + typePlans.length,
        telemetryLinked: telemetrySet.has(asset.id),
      };
      const gaps: string[] = [];
      if (strategy?.status === 'approved' && ['critical', 'high'].includes(strategy.criticality_level)) {
        if (coverage.preventive === 0) gaps.push('Sin preventivo activo');
        if (coverage.approvedBomLines === 0) gaps.push('Sin BOM técnica aprobada');
        if (coverage.criticalSpareLinks === 0) gaps.push('Sin repuesto crítico vinculado por BOM aprobada');
        if (coverage.approvedStandardPlans === 0) gaps.push('Sin plan estándar aprobado');
        if (strategy.maintenance_strategy === 'predictive' && !coverage.telemetryLinked) gaps.push('Estrategia predictiva sin telemetría vinculada');
      }
      return { asset, strategy, coverage, gaps };
    });

    return NextResponse.json({
      counts: {
        assets: items.length,
        classified: items.filter((row) => row.strategy?.status === 'approved').length,
        critical: items.filter((row) => row.strategy?.status === 'approved' && row.strategy.criticality_level === 'critical').length,
        high: items.filter((row) => row.strategy?.status === 'approved' && row.strategy.criticality_level === 'high').length,
        withGaps: items.filter((row) => row.gaps.length > 0).length,
      },
      items,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[maintenance/asset-strategies:get]', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo evaluar la estrategia de mantenimiento.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const body = await request.json().catch(() => null);
  const assetCode = text(body?.assetCode);
  const criticalityLevel = text(body?.criticalityLevel);
  const maintenanceStrategy = text(body?.maintenanceStrategy);
  const reason = text(body?.reason);
  const evidenceReference = text(body?.evidenceReference) || null;

  if (!assetCode || !['critical','high','medium','low'].includes(criticalityLevel) || !['preventive','predictive','inspection','run_to_failure'].includes(maintenanceStrategy) || !reason) {
    return NextResponse.json({ error: 'Completa equipo, criticidad, estrategia y fundamento.' }, { status: 400 });
  }

  const { data: asset } = await context.supabase.from('maintenance_canonical_assets_v1').select('id,asset_code,name').eq('organization_id', context.organizationId).eq('asset_code', assetCode).eq('is_active', true).maybeSingle();
  if (!asset) return NextResponse.json({ error: 'No existe un equipo canónico activo con ese código.' }, { status: 404 });

  const { data: existing } = await context.supabase.from('maintenance_asset_strategies').select('id,status').eq('organization_id', context.organizationId).eq('canonical_asset_id', asset.id).in('status', ['proposed','approved']).maybeSingle();
  if (existing?.status === 'approved') return NextResponse.json({ error: 'El equipo ya tiene una estrategia aprobada. Inactívala antes de proponer otra.' }, { status: 409 });

  const payload = {
    organization_id: context.organizationId,
    canonical_asset_id: asset.id,
    criticality_level: criticalityLevel,
    maintenance_strategy: maintenanceStrategy,
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
    ? await context.supabase.from('maintenance_asset_strategies').update(payload).eq('organization_id', context.organizationId).eq('id', existing.id).select('id').single()
    : await context.supabase.from('maintenance_asset_strategies').insert(payload).select('id').single();
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

  const { data: existing } = await context.supabase.from('maintenance_asset_strategies').select('id').eq('organization_id', context.organizationId).eq('id', id).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'Estrategia no encontrada.' }, { status: 404 });
  const approved = status === 'approved';
  const { error } = await context.supabase.from('maintenance_asset_strategies').update({
    status,
    approved_by: approved ? context.userId : null,
    approved_at: approved ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq('organization_id', context.organizationId).eq('id', id);
  if (error) return NextResponse.json({ error: 'No se pudo actualizar la estrategia.' }, { status: 500 });
  return NextResponse.json({ ok: true, status });
}
