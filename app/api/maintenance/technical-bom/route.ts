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

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const canonical = context.supabase.schema('canonical');

  try {
    const lines = await fetchAll((from, to) => context.supabase
      .from('equipment_technical_bom_lines')
      .select('*')
      .eq('organization_id', context.organizationId)
      .order('updated_at', { ascending: false })
      .range(from, to));

    const assetIds = [...new Set(lines.map((row) => row.canonical_asset_id).filter(Boolean))];
    const productIds = [...new Set(lines.map((row) => row.canonical_product_id).filter(Boolean))];

    const [assetsResult, productsResult, stockResult, requirements, installedParts, preventive, workOrders, campaignLinks] = await Promise.all([
      assetIds.length ? canonical.from('assets').select('id,asset_code,name,asset_type,manufacturer,model').eq('organization_id', context.organizationId).in('id', assetIds) : Promise.resolve({ data: [] }),
      productIds.length ? canonical.from('products').select('id,product_code,name,family,unit').eq('organization_id', context.organizationId).in('id', productIds) : Promise.resolve({ data: [] }),
      productIds.length ? context.supabase.from('critical_spare_observations_v1').select('product_id,quantity_available,minimum_required,shortage_quantity,approved_obsolete').eq('organization_id', context.organizationId).in('product_id', productIds) : Promise.resolve({ data: [] }),
      productIds.length ? fetchAll((from, to) => context.supabase.from('work_order_material_requirements').select('canonical_asset_id,canonical_product_id,quantity_required,quantity_shortage,work_order_id').eq('organization_id', context.organizationId).in('canonical_product_id', productIds).range(from, to)) : Promise.resolve([]),
      productIds.length ? fetchAll((from, to) => context.supabase.from('work_order_parts').select('canonical_asset_id,canonical_product_id,quantity_installed,work_order_id').eq('organization_id', context.organizationId).in('canonical_product_id', productIds).gt('quantity_installed', 0).range(from, to)) : Promise.resolve([]),
      assetIds.length ? fetchAll((from, to) => context.supabase.from('preventive_maintenance_schedules').select('id,canonical_asset_id,task_name,enabled').eq('organization_id', context.organizationId).in('canonical_asset_id', assetIds).range(from, to)) : Promise.resolve([]),
      assetIds.length ? fetchAll((from, to) => context.supabase.from('maintenance_work_orders').select('id,canonical_asset_id').eq('organization_id', context.organizationId).in('canonical_asset_id', assetIds).range(from, to)) : Promise.resolve([]),
      fetchAll((from, to) => context.supabase.from('maintenance_campaign_work_orders').select('work_order_id,campaign_id').eq('organization_id', context.organizationId).range(from, to)),
    ]);

    const assets = new Map((assetsResult.data || []).map((row: any) => [row.id, row]));
    const products = new Map((productsResult.data || []).map((row: any) => [row.id, row]));
    const stock = new Map((stockResult.data || []).map((row: any) => [row.product_id, row]));
    const woByAsset = new Map<string, string[]>();
    for (const row of workOrders as any[]) {
      const list = woByAsset.get(row.canonical_asset_id) || [];
      list.push(row.id); woByAsset.set(row.canonical_asset_id, list);
    }
    const campaignsByWo = new Map<string, Set<string>>();
    for (const row of campaignLinks as any[]) {
      const set = campaignsByWo.get(row.work_order_id) || new Set<string>();
      set.add(row.campaign_id); campaignsByWo.set(row.work_order_id, set);
    }

    const items = lines.map((line) => {
      const req = (requirements as any[]).filter((row) => row.canonical_asset_id === line.canonical_asset_id && row.canonical_product_id === line.canonical_product_id);
      const installed = (installedParts as any[]).filter((row) => row.canonical_asset_id === line.canonical_asset_id && row.canonical_product_id === line.canonical_product_id);
      const preventives = (preventive as any[]).filter((row) => row.canonical_asset_id === line.canonical_asset_id && row.enabled !== false);
      const campaignIds = new Set<string>();
      for (const woId of woByAsset.get(line.canonical_asset_id) || []) for (const campaignId of campaignsByWo.get(woId) || []) campaignIds.add(campaignId);
      return {
        ...line,
        asset: assets.get(line.canonical_asset_id) || null,
        product: products.get(line.canonical_product_id) || null,
        stock: stock.get(line.canonical_product_id) || null,
        operational: {
          work_order_requirements: req.length,
          quantity_required_in_work_orders: req.reduce((sum, row) => sum + num(row.quantity_required), 0),
          shortage_in_work_orders: req.reduce((sum, row) => sum + num(row.quantity_shortage), 0),
          installed_quantity: installed.reduce((sum, row) => sum + num(row.quantity_installed), 0),
          equipment_preventives: preventives.length,
          equipment_campaigns: campaignIds.size,
        },
      };
    });

    const whereUsed = new Map<string, any>();
    for (const row of items.filter((item) => item.status === 'approved')) {
      const product = row.product;
      if (!product) continue;
      const entry = whereUsed.get(product.id) || { product, assets: [] };
      entry.assets.push({ asset: row.asset, component_code: row.component_code, component_name: row.component_name, quantity_required: row.quantity_required });
      whereUsed.set(product.id, entry);
    }

    return NextResponse.json({
      counts: {
        total: items.length,
        approved: items.filter((row) => row.status === 'approved').length,
        proposed: items.filter((row) => row.status === 'proposed').length,
        products: new Set(items.filter((row) => row.status === 'approved').map((row) => row.canonical_product_id)).size,
        assets: new Set(items.filter((row) => row.status === 'approved').map((row) => row.canonical_asset_id)).size,
      },
      items,
      whereUsed: [...whereUsed.values()],
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo cargar la BOM técnica.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const body = await request.json().catch(() => null);
  const assetCode = text(body?.assetCode);
  const productCode = text(body?.productCode);
  const componentName = text(body?.componentName);
  const componentCode = text(body?.componentCode) || null;
  const componentPath = text(body?.componentPath) || null;
  const quantityRequired = num(body?.quantityRequired || 1);
  const reason = text(body?.reason);
  const evidenceReference = text(body?.evidenceReference) || null;
  if (!assetCode || !productCode || !componentName || !reason || !Number.isFinite(quantityRequired) || quantityRequired <= 0) return NextResponse.json({ error: 'Completa equipo, repuesto, componente, cantidad y fundamento.' }, { status: 400 });

  const canonical = context.supabase.schema('canonical');
  const [{ data: asset }, { data: product }] = await Promise.all([
    canonical.from('assets').select('id,asset_code,name').eq('organization_id', context.organizationId).eq('asset_code', assetCode).maybeSingle(),
    canonical.from('products').select('id,product_code,name').eq('organization_id', context.organizationId).eq('product_code', productCode).maybeSingle(),
  ]);
  if (!asset) return NextResponse.json({ error: 'No existe un equipo canónico con ese código.' }, { status: 404 });
  if (!product) return NextResponse.json({ error: 'No existe un producto canónico con ese código.' }, { status: 404 });

  const { data: existing } = await context.supabase.from('equipment_technical_bom_lines').select('id,status').eq('organization_id', context.organizationId).eq('canonical_asset_id', asset.id).eq('canonical_product_id', product.id).eq('component_code', componentCode).in('status', ['proposed','approved']).maybeSingle();
  if (existing) return NextResponse.json({ error: 'Ya existe una relación activa para ese equipo, componente y repuesto.' }, { status: 409 });

  const { data, error } = await context.supabase.from('equipment_technical_bom_lines').insert({
    organization_id: context.organizationId,
    canonical_asset_id: asset.id,
    canonical_product_id: product.id,
    component_code: componentCode,
    component_name: componentName,
    component_path: componentPath,
    quantity_required: quantityRequired,
    status: 'proposed',
    reason,
    evidence_reference: evidenceReference,
    proposed_by: context.userId,
    proposed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id, status: 'proposed' });
}

export async function PATCH(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const body = await request.json().catch(() => null);
  const id = text(body?.id);
  const status = text(body?.status);
  if (!id || !['approved','rejected','inactive'].includes(status)) return NextResponse.json({ error: 'Cambio de estado inválido.' }, { status: 400 });
  const { data: existing } = await context.supabase.from('equipment_technical_bom_lines').select('id').eq('organization_id', context.organizationId).eq('id', id).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'Línea BOM no encontrada.' }, { status: 404 });
  const approved = status === 'approved';
  const { error } = await context.supabase.from('equipment_technical_bom_lines').update({ status, approved_by: approved ? context.userId : null, approved_at: approved ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq('organization_id', context.organizationId).eq('id', id);
  if (error) return NextResponse.json({ error: 'No se pudo actualizar la línea BOM.' }, { status: 500 });
  return NextResponse.json({ ok: true, status });
}
