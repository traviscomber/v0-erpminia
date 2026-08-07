export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

const CLOSED = new Set(['completed', 'closed', 'cancelled', 'canceled']);

function text(value: unknown) { return String(value ?? '').trim(); }
function num(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function status(value: unknown) { return text(value).toLowerCase(); }
function isClosed(value: unknown) { return CLOSED.has(status(value)); }

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const canonical = context.supabase.schema('canonical');

  const [campaignsResult, linksResult, depsResult, ordersResult, costsResult, materialsResult, windowsResult, assetsResult, productsResult] = await Promise.all([
    context.supabase.from('maintenance_campaigns').select('id, name, campaign_type, status, start_date, end_date, scope, created_at, updated_at').eq('organization_id', context.organizationId).order('start_date', { ascending: false }).limit(200),
    context.supabase.from('maintenance_campaign_work_orders').select('id, campaign_id, work_order_id, sequence_no, planned_start_date, planned_end_date, notes').eq('organization_id', context.organizationId).order('sequence_no', { ascending: true }).limit(2000),
    context.supabase.from('maintenance_campaign_dependencies').select('id, campaign_id, predecessor_work_order_id, successor_work_order_id').eq('organization_id', context.organizationId).limit(2000),
    context.supabase.from('maintenance_work_orders').select('id, work_order_number, title, status, priority, scheduled_date, start_date, completion_date, planned_duration_hours, actual_duration_hours, assigned_person_id, assigned_to_name, canonical_asset_id').eq('organization_id', context.organizationId).order('scheduled_date', { ascending: true }).limit(2000),
    context.supabase.from('work_order_cost_summary').select('work_order_id, parts_cost, labor_cost, external_cost, total_cost').eq('organization_id', context.organizationId).limit(2000),
    context.supabase.from('work_order_material_requirements').select('id, work_order_id, canonical_product_id, quantity_required, quantity_available, quantity_shortage, status, required_date').eq('organization_id', context.organizationId).limit(4000),
    context.supabase.from('maintenance_resource_windows').select('id, resource_type, resource_id, start_date, end_date, availability, reason').eq('organization_id', context.organizationId).limit(2000),
    canonical.from('assets').select('id, asset_code, name').eq('organization_id', context.organizationId).limit(2000),
    canonical.from('products').select('id, product_code, name, unit').eq('organization_id', context.organizationId).limit(4000),
  ]);

  const errors = [campaignsResult, linksResult, depsResult, ordersResult, costsResult, materialsResult, windowsResult, assetsResult, productsResult].filter((result) => result.error);
  if (errors.length) return NextResponse.json({ error: 'No se pudo cargar la planificación de campañas.' }, { status: 500 });

  const campaigns = campaignsResult.data || [];
  const links = linksResult.data || [];
  const deps = depsResult.data || [];
  const orders = ordersResult.data || [];
  const costs = costsResult.data || [];
  const materials = materialsResult.data || [];
  const windows = windowsResult.data || [];
  const orderMap = new Map(orders.map((row: any) => [row.id, row]));
  const costMap = new Map(costs.map((row: any) => [row.work_order_id, row]));
  const assetMap = new Map((assetsResult.data || []).map((row: any) => [row.id, row]));
  const productMap = new Map((productsResult.data || []).map((row: any) => [row.id, row]));

  const summaries = campaigns.map((campaign: any) => {
    const campaignLinks = links.filter((row: any) => row.campaign_id === campaign.id);
    const campaignOrders = campaignLinks.map((row: any) => orderMap.get(row.work_order_id)).filter(Boolean) as any[];
    const ids = new Set(campaignOrders.map((row) => row.id));
    const campaignDeps = deps.filter((row: any) => row.campaign_id === campaign.id);
    const blocked = campaignDeps.filter((dep: any) => !isClosed(orderMap.get(dep.predecessor_work_order_id)?.status));
    const campaignMaterials = materials.filter((row: any) => ids.has(row.work_order_id));
    const realCost = campaignOrders.reduce((sum, row) => sum + num(costMap.get(row.id)?.total_cost), 0);
    const completed = campaignOrders.filter((row) => isClosed(row.status)).length;
    const shortages = campaignMaterials.filter((row: any) => num(row.quantity_shortage) > 0).length;
    return {
      ...campaign,
      workOrderCount: campaignOrders.length,
      completedCount: completed,
      blockedCount: blocked.length,
      shortageCount: shortages,
      realCost,
      progress: campaignOrders.length ? Math.round((completed / campaignOrders.length) * 100) : 0,
    };
  });

  const requestedId = request.nextUrl.searchParams.get('campaignId');
  const selectedId = requestedId || summaries[0]?.id || null;
  const selected = summaries.find((row: any) => row.id === selectedId) || null;
  if (!selected) return NextResponse.json({ campaigns: summaries, selected: null, workOrders: [], dependencies: [], materials: [], conflicts: [], eligibleWorkOrders: orders.filter((row: any) => !isClosed(row.status)), source: 'canonical' });

  const selectedLinks = links.filter((row: any) => row.campaign_id === selected.id);
  const selectedIds = new Set(selectedLinks.map((row: any) => row.work_order_id));
  const selectedDeps = deps.filter((row: any) => row.campaign_id === selected.id);
  const selectedMaterials = materials.filter((row: any) => selectedIds.has(row.work_order_id)).map((row: any) => ({ ...row, product: productMap.get(row.canonical_product_id) || null }));

  const conflicts: Array<{ type: string; workOrderId: string; detail: string }> = [];
  const selectedOrders = selectedLinks.map((link: any) => {
    const order = orderMap.get(link.work_order_id);
    if (!order) return null;
    const planDate = link.planned_start_date || order.scheduled_date;
    if (planDate) {
      for (const window of windows as any[]) {
        if (window.availability !== 'unavailable' || planDate < window.start_date || planDate > window.end_date) continue;
        if (order.assigned_person_id && window.resource_type === 'person' && window.resource_id === order.assigned_person_id) conflicts.push({ type: 'person_unavailable', workOrderId: order.id, detail: window.reason || 'Persona no disponible en la fecha planificada.' });
        if (order.canonical_asset_id && window.resource_type === 'asset' && window.resource_id === order.canonical_asset_id) conflicts.push({ type: 'asset_unavailable', workOrderId: order.id, detail: window.reason || 'Equipo no disponible en la fecha planificada.' });
      }
    }
    const predecessors = selectedDeps.filter((dep: any) => dep.successor_work_order_id === order.id);
    const blockedBy = predecessors.filter((dep: any) => !isClosed(orderMap.get(dep.predecessor_work_order_id)?.status)).map((dep: any) => dep.predecessor_work_order_id);
    return {
      ...order,
      ...link,
      asset: assetMap.get(order.canonical_asset_id) || null,
      cost: costMap.get(order.id) || null,
      blockedBy,
      materialShortages: selectedMaterials.filter((row: any) => row.work_order_id === order.id && num(row.quantity_shortage) > 0).length,
      resourceConflicts: conflicts.filter((row) => row.workOrderId === order.id).length,
    };
  }).filter(Boolean);

  for (const current of selectedOrders as any[]) {
    const planDate = current.planned_start_date || current.scheduled_date;
    if (!planDate) continue;
    for (const other of selectedOrders as any[]) {
      if (other.id === current.id) continue;
      const otherDate = other.planned_start_date || other.scheduled_date;
      if (otherDate !== planDate) continue;
      if (current.assigned_person_id && current.assigned_person_id === other.assigned_person_id) conflicts.push({ type: 'person_double_booking', workOrderId: current.id, detail: 'La persona tiene más de una OT de la campaña el mismo día.' });
      if (current.canonical_asset_id && current.canonical_asset_id === other.canonical_asset_id) conflicts.push({ type: 'asset_double_booking', workOrderId: current.id, detail: 'El equipo tiene más de una OT de la campaña el mismo día.' });
    }
  }

  return NextResponse.json({
    campaigns: summaries,
    selected,
    workOrders: selectedOrders,
    dependencies: selectedDeps,
    materials: selectedMaterials,
    conflicts: Array.from(new Map(conflicts.map((row) => [`${row.type}:${row.workOrderId}:${row.detail}`, row])).values()),
    eligibleWorkOrders: orders.filter((row: any) => !isClosed(row.status) && !selectedIds.has(row.id)),
    source: 'canonical',
  });
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const body = await request.json().catch(() => null);
  const action = text(body?.action);
  const now = new Date().toISOString();

  if (action === 'create_campaign') {
    const name = text(body?.name); const startDate = text(body?.startDate); const endDate = text(body?.endDate);
    const campaignType = body?.campaignType === 'shutdown' ? 'shutdown' : 'campaign';
    const scope = text(body?.scope) || null;
    if (!name || !startDate || !endDate || endDate < startDate) return NextResponse.json({ error: 'Completa nombre y un rango de fechas válido.' }, { status: 400 });
    const { data, error } = await context.supabase.from('maintenance_campaigns').insert({ organization_id: context.organizationId, name, campaign_type: campaignType, status: 'planned', start_date: startDate, end_date: endDate, scope, created_by: context.userId }).select('id, name, campaign_type, status, start_date, end_date, scope').single();
    return error ? NextResponse.json({ error: 'No se pudo crear la campaña.' }, { status: 500 }) : NextResponse.json({ campaign: data }, { status: 201 });
  }

  const campaignId = text(body?.campaignId);
  if (!campaignId) return NextResponse.json({ error: 'Selecciona una campaña.' }, { status: 400 });
  const { data: campaign } = await context.supabase.from('maintenance_campaigns').select('id, status, start_date, end_date').eq('organization_id', context.organizationId).eq('id', campaignId).maybeSingle();
  if (!campaign) return NextResponse.json({ error: 'La campaña no pertenece a la organización activa.' }, { status: 404 });

  if (action === 'update_campaign') {
    const nextStatus = ['planned', 'active', 'completed', 'cancelled'].includes(text(body?.status)) ? text(body?.status) : campaign.status;
    const startDate = text(body?.startDate) || campaign.start_date; const endDate = text(body?.endDate) || campaign.end_date;
    if (endDate < startDate) return NextResponse.json({ error: 'La fecha final no puede ser anterior a la inicial.' }, { status: 400 });
    const { error } = await context.supabase.from('maintenance_campaigns').update({ status: nextStatus, start_date: startDate, end_date: endDate, updated_at: now }).eq('organization_id', context.organizationId).eq('id', campaignId);
    return error ? NextResponse.json({ error: 'No se pudo actualizar la campaña.' }, { status: 500 }) : NextResponse.json({ ok: true });
  }

  if (action === 'add_work_order') {
    const workOrderId = text(body?.workOrderId); const plannedStartDate = text(body?.plannedStartDate) || null; const plannedEndDate = text(body?.plannedEndDate) || null;
    const { data: workOrder } = await context.supabase.from('maintenance_work_orders').select('id, status').eq('organization_id', context.organizationId).eq('id', workOrderId).maybeSingle();
    if (!workOrder) return NextResponse.json({ error: 'La OT no pertenece a la organización activa.' }, { status: 400 });
    if (plannedStartDate && (plannedStartDate < campaign.start_date || plannedStartDate > campaign.end_date)) return NextResponse.json({ error: 'La fecha planificada debe quedar dentro de la campaña.' }, { status: 400 });
    if (plannedEndDate && plannedStartDate && plannedEndDate < plannedStartDate) return NextResponse.json({ error: 'La fecha final de la OT no puede ser anterior a la inicial.' }, { status: 400 });
    const { data: memberships } = await context.supabase.from('maintenance_campaign_work_orders').select('campaign_id').eq('organization_id', context.organizationId).eq('work_order_id', workOrderId);
    if ((memberships || []).length) {
      const campaignIds = (memberships || []).map((row: any) => row.campaign_id);
      const { data: activeCampaigns } = await context.supabase.from('maintenance_campaigns').select('id, name, status').eq('organization_id', context.organizationId).in('id', campaignIds).in('status', ['planned', 'active']);
      if ((activeCampaigns || []).some((row: any) => row.id !== campaignId)) return NextResponse.json({ error: 'La OT ya pertenece a otra campaña activa.' }, { status: 409 });
    }
    const { error } = await context.supabase.from('maintenance_campaign_work_orders').insert({ organization_id: context.organizationId, campaign_id: campaignId, work_order_id: workOrderId, planned_start_date: plannedStartDate, planned_end_date: plannedEndDate, created_by: context.userId });
    return error ? NextResponse.json({ error: 'No se pudo agregar la OT a la campaña.' }, { status: 500 }) : NextResponse.json({ ok: true }, { status: 201 });
  }

  if (action === 'plan_work_order') {
    const linkId = text(body?.linkId); const plannedStartDate = text(body?.plannedStartDate) || null; const plannedEndDate = text(body?.plannedEndDate) || null; const sequenceNo = Math.max(0, Math.floor(num(body?.sequenceNo)));
    if (plannedStartDate && (plannedStartDate < campaign.start_date || plannedStartDate > campaign.end_date)) return NextResponse.json({ error: 'La fecha planificada debe quedar dentro de la campaña.' }, { status: 400 });
    if (plannedEndDate && plannedStartDate && plannedEndDate < plannedStartDate) return NextResponse.json({ error: 'La fecha final no puede ser anterior a la inicial.' }, { status: 400 });
    const { error } = await context.supabase.from('maintenance_campaign_work_orders').update({ planned_start_date: plannedStartDate, planned_end_date: plannedEndDate, sequence_no: sequenceNo, updated_at: now }).eq('organization_id', context.organizationId).eq('campaign_id', campaignId).eq('id', linkId);
    return error ? NextResponse.json({ error: 'No se pudo actualizar el plan de la OT.' }, { status: 500 }) : NextResponse.json({ ok: true });
  }

  if (action === 'add_dependency') {
    const predecessorId = text(body?.predecessorWorkOrderId); const successorId = text(body?.successorWorkOrderId);
    if (!predecessorId || !successorId || predecessorId === successorId) return NextResponse.json({ error: 'Selecciona dos OT distintas.' }, { status: 400 });
    const { data: members } = await context.supabase.from('maintenance_campaign_work_orders').select('work_order_id').eq('organization_id', context.organizationId).eq('campaign_id', campaignId).in('work_order_id', [predecessorId, successorId]);
    if ((members || []).length !== 2) return NextResponse.json({ error: 'Ambas OT deben pertenecer a la campaña.' }, { status: 400 });
    const { data: existing } = await context.supabase.from('maintenance_campaign_dependencies').select('predecessor_work_order_id, successor_work_order_id').eq('organization_id', context.organizationId).eq('campaign_id', campaignId);
    const edges = [...(existing || []), { predecessor_work_order_id: predecessorId, successor_work_order_id: successorId }];
    const graph = new Map<string, string[]>();
    for (const edge of edges as any[]) graph.set(edge.predecessor_work_order_id, [...(graph.get(edge.predecessor_work_order_id) || []), edge.successor_work_order_id]);
    const seen = new Set<string>();
    const visit = (node: string): boolean => { if (node === predecessorId && seen.size > 0) return true; if (seen.has(node)) return false; seen.add(node); return (graph.get(node) || []).some(visit); };
    seen.clear();
    if ((graph.get(successorId) || []).some(visit)) return NextResponse.json({ error: 'La dependencia produciría un ciclo.' }, { status: 409 });
    const { error } = await context.supabase.from('maintenance_campaign_dependencies').insert({ organization_id: context.organizationId, campaign_id: campaignId, predecessor_work_order_id: predecessorId, successor_work_order_id: successorId, created_by: context.userId });
    return error ? NextResponse.json({ error: 'No se pudo guardar la dependencia.' }, { status: 500 }) : NextResponse.json({ ok: true }, { status: 201 });
  }

  return NextResponse.json({ error: 'Acción no reconocida.' }, { status: 400 });
}
