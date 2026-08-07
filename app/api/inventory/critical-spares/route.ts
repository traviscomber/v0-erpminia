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

function classify(row: any) {
  const available = num(row.quantity_available);
  const minimum = num(row.minimum_required);
  const shortage = num(row.shortage_quantity);
  const operationalDemand = num(row.wo_quantity_requested) + num(row.outbound_quantity);
  const purchaseEvidence = num(row.purchase_line_count);
  if (shortage > 0 || available < 0) return { level: 'critical', reason: shortage > 0 ? 'Faltante asociado a una necesidad de OT.' : 'Existencia canónica negativa.' };
  if (row.approved_obsolete && (available > 0 || operationalDemand > 0 || purchaseEvidence > 0)) return { level: 'high', reason: 'Producto marcado obsoleto con existencia o demanda registrada.' };
  if (minimum > 0 && available < minimum && (operationalDemand > 0 || purchaseEvidence > 0)) return { level: 'high', reason: 'Disponibilidad bajo el mínimo registrado y existe evidencia de demanda.' };
  if (available <= 0 && operationalDemand > 0) return { level: 'high', reason: 'Sin disponibilidad y existe consumo o requerimiento de mantenimiento registrado.' };
  if (available <= 0 && purchaseEvidence > 0) return { level: 'attention', reason: 'Sin disponibilidad actual y con historial de compra registrado.' };
  if (row.approved_obsolete) return { level: 'attention', reason: 'Obsolescencia aprobada; sin demanda operacional registrada en las fuentes actuales.' };
  return { level: 'normal', reason: 'Sin condición crítica verificable con la información disponible.' };
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  try {
    const [rows, relations] = await Promise.all([
      fetchAll((from, to) => context.supabase.from('critical_spare_observations_v1').select('*').eq('organization_id', context.organizationId).range(from, to)),
      fetchAll((from, to) => context.supabase.from('spare_part_lifecycle_relations').select('*').eq('organization_id', context.organizationId).order('updated_at', { ascending: false }).range(from, to)),
    ]);

    const productMap = new Map(rows.map((row) => [row.product_id, row]));
    const items = rows.map((row) => {
      const classification = classify(row);
      return {
        ...row,
        priority: classification.level,
        priority_reason: classification.reason,
        demand_evidence: {
          work_order_quantity: num(row.wo_quantity_requested),
          movement_out_quantity: num(row.outbound_quantity),
          purchase_lines: num(row.purchase_line_count),
        },
      };
    });
    const rank: Record<string, number> = { critical: 0, high: 1, attention: 2, normal: 3 };
    items.sort((a, b) => rank[a.priority] - rank[b.priority]
      || num(b.affected_assets) - num(a.affected_assets)
      || num(b.shortage_quantity) - num(a.shortage_quantity)
      || num(b.purchase_line_count) - num(a.purchase_line_count));

    const enrichedRelations = relations.map((row) => ({
      ...row,
      source_product: productMap.get(row.source_product_id) ? { id: row.source_product_id, code: productMap.get(row.source_product_id).product_code, name: productMap.get(row.source_product_id).name } : null,
      target_product: row.target_product_id && productMap.get(row.target_product_id) ? { id: row.target_product_id, code: productMap.get(row.target_product_id).product_code, name: productMap.get(row.target_product_id).name } : null,
    }));

    const visible = items.filter((row) => row.priority !== 'normal');
    const counts = {
      products: items.length,
      critical: visible.filter((row) => row.priority === 'critical').length,
      high: visible.filter((row) => row.priority === 'high').length,
      attention: visible.filter((row) => row.priority === 'attention').length,
      with_operational_demand: items.filter((row) => num(row.wo_quantity_requested) > 0 || num(row.outbound_quantity) > 0).length,
      with_purchase_history: items.filter((row) => num(row.purchase_line_count) > 0).length,
      with_observed_lead_time: items.filter((row) => row.observed_lead_days != null).length,
      with_registered_lead_time: items.filter((row) => row.committed_lead_days != null).length,
      approved_lifecycle_relations: relations.filter((row) => row.status === 'approved').length,
    };

    return NextResponse.json({ counts, items: visible.slice(0, 1500), relations: enrichedRelations, generatedAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo evaluar repuestos críticos.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const body = await request.json().catch(() => null);
  const sourceProductId = text(body?.sourceProductId);
  const relationType = text(body?.relationType);
  const targetProductCode = text(body?.targetProductCode);
  const reason = text(body?.reason);
  const evidenceReference = text(body?.evidenceReference) || null;
  if (!sourceProductId || !['substitute', 'replacement', 'obsolete'].includes(relationType) || !reason) return NextResponse.json({ error: 'Completa producto, tipo y fundamento.' }, { status: 400 });
  if (relationType !== 'obsolete' && !targetProductCode) return NextResponse.json({ error: 'Indica el código exacto del producto sustituto o reemplazo.' }, { status: 400 });

  const canonical = context.supabase.schema('canonical');
  const { data: source } = await canonical.from('products').select('id, product_code, name').eq('organization_id', context.organizationId).eq('id', sourceProductId).maybeSingle();
  if (!source) return NextResponse.json({ error: 'El producto de origen no pertenece a la organización activa.' }, { status: 404 });

  let target: any = null;
  if (relationType !== 'obsolete') {
    const result = await canonical.from('products').select('id, product_code, name').eq('organization_id', context.organizationId).eq('product_code', targetProductCode).maybeSingle();
    target = result.data;
    if (!target) return NextResponse.json({ error: 'No existe un producto canónico con ese código.' }, { status: 404 });
    if (target.id === source.id) return NextResponse.json({ error: 'El producto no puede reemplazarse por sí mismo.' }, { status: 400 });
  }

  let existingQuery = context.supabase.from('spare_part_lifecycle_relations')
    .select('id')
    .eq('organization_id', context.organizationId)
    .eq('source_product_id', source.id)
    .eq('relation_type', relationType);
  existingQuery = target?.id ? existingQuery.eq('target_product_id', target.id) : existingQuery.is('target_product_id', null);
  const { data: existing } = await existingQuery.maybeSingle();
  const payload = {
    organization_id: context.organizationId,
    source_product_id: source.id,
    target_product_id: target?.id || null,
    relation_type: relationType,
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
    ? await context.supabase.from('spare_part_lifecycle_relations').update(payload).eq('organization_id', context.organizationId).eq('id', existing.id).select('id').single()
    : await context.supabase.from('spare_part_lifecycle_relations').insert(payload).select('id').single();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: result.data.id, status: 'proposed' });
}

export async function PATCH(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const body = await request.json().catch(() => null);
  const id = text(body?.id);
  const status = text(body?.status);
  if (!id || !['approved', 'rejected', 'inactive'].includes(status)) return NextResponse.json({ error: 'Cambio de estado inválido.' }, { status: 400 });

  const { data: existing } = await context.supabase.from('spare_part_lifecycle_relations').select('id').eq('organization_id', context.organizationId).eq('id', id).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'Relación no encontrada.' }, { status: 404 });
  const approved = status === 'approved';
  const { error } = await context.supabase.from('spare_part_lifecycle_relations').update({
    status,
    approved_by: approved ? context.userId : null,
    approved_at: approved ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq('organization_id', context.organizationId).eq('id', id);
  if (error) return NextResponse.json({ error: 'No se pudo actualizar la relación.' }, { status: 500 });
  return NextResponse.json({ ok: true, status });
}
