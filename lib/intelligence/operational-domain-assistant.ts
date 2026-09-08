import { NextRequest, NextResponse } from 'next/server';
import type { OrganizationSuccessContext } from '@/lib/api/organization-context';
import { routeOperationalQuery, type QueryCapability } from '@/lib/intelligence/query-router';

export type OperationalAssistantDomain = 'inventory' | 'procurement';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = 'gpt-5.6';
const FALLBACK_MODELS = ['gpt-5.6', 'gpt-5.6-terra', 'gpt-5.6-luna'];
const MAX_MESSAGE_CHARS = 12000;

type EvidenceBundle = {
  capability: OperationalAssistantDomain;
  sources: string[];
  toolsUsed: Array<{ name: string; mode: 'read' }>;
  payload: Record<string, unknown>;
};

function extractResponseText(payload: any) {
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === 'output_text' && typeof content.text === 'string') return content.text.trim();
    }
  }
  return typeof payload?.output_text === 'string' ? payload.output_text.trim() : '';
}

async function callOpenAI(args: { instructions: string; input: string }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY no está configurada en el servidor');

  const configuredModel = process.env.OPENAI_OPERATIONAL_ASSISTANT_MODEL?.trim();
  const models = Array.from(new Set([configuredModel, DEFAULT_MODEL, ...FALLBACK_MODELS].filter(Boolean))) as string[];
  let lastError = 'No hay un modelo de OpenAI disponible';

  for (const model of models) {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        instructions: args.instructions,
        input: args.input,
        reasoning: { effort: 'medium' },
        max_output_tokens: 2600,
      }),
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = payload?.error?.message || `OpenAI respondió ${response.status}`;
      lastError = detail;
      if (/invalid model|model.*not.*found|does not exist|not permitted|not available/i.test(detail)) continue;
      throw new Error(detail);
    }
    const text = extractResponseText(payload);
    if (!text) throw new Error('OpenAI no devolvió texto utilizable');
    return { text, model: payload?.model || model, responseId: payload?.id || null };
  }

  throw new Error(lastError);
}

async function buildInventoryEvidence(context: OrganizationSuccessContext): Promise<EvidenceBundle> {
  const organizationId = context.organizationId;
  const [overview, freshness, negative, reorder, outOfStock] = await Promise.all([
    context.supabase.from('inventory_intelligence_overview_v1').select('*').eq('organization_id', organizationId).maybeSingle(),
    context.supabase.from('canonical_inventory_current').select('snapshot_date').eq('organization_id', organizationId).order('snapshot_date', { ascending: false }).limit(1),
    context.supabase.from('inventory_intelligence_position_v1')
      .select('product_code,product_name,family,unit,quantity_on_hand,quantity_reserved,quantity_available,unit_cost,stock_value,stock_status,last_counted_date,warehouse_code,validation_status')
      .eq('organization_id', organizationId).eq('stock_status', 'negative').order('stock_value', { ascending: false }).limit(30),
    context.supabase.from('inventory_intelligence_position_v1')
      .select('product_code,product_name,family,unit,quantity_on_hand,quantity_reserved,quantity_available,unit_cost,stock_value,stock_status,last_counted_date,warehouse_code,validation_status')
      .eq('organization_id', organizationId).eq('stock_status', 'reorder').order('stock_value', { ascending: false }).limit(50),
    context.supabase.from('inventory_intelligence_position_v1')
      .select('product_code,product_name,family,unit,quantity_on_hand,quantity_reserved,quantity_available,unit_cost,stock_value,stock_status,last_counted_date,warehouse_code,validation_status')
      .eq('organization_id', organizationId).eq('stock_status', 'out_of_stock').order('stock_value', { ascending: false }).limit(40),
  ]);

  const failures = [overview.error, freshness.error, negative.error, reorder.error, outOfStock.error].filter(Boolean);
  if (failures.length) throw new Error((failures[0] as any)?.message || 'No se pudo cargar inventario canónico');

  return {
    capability: 'inventory',
    sources: ['canonical_inventory_current', 'inventory_intelligence_overview_v1', 'inventory_intelligence_position_v1'],
    toolsUsed: [
      { name: 'read_inventory_overview', mode: 'read' },
      { name: 'read_inventory_attention', mode: 'read' },
      { name: 'read_inventory_freshness', mode: 'read' },
    ],
    payload: {
      freshness: {
        latest_snapshot_date: freshness.data?.[0]?.snapshot_date || null,
        meaning: 'Fecha máxima disponible en canonical_inventory_current; no implica tiempo real.',
      },
      overview: overview.data || null,
      attention: {
        negative: negative.data || [],
        reorder: reorder.data || [],
        out_of_stock: outOfStock.data || [],
      },
      semantics: {
        stock_status: 'Estado derivado de existencias. No equivale por sí solo a criticidad operacional, riesgo de falla ni prioridad de compra.',
        value: 'Valorización de inventario según costo registrado; no reemplaza una cotización vigente.',
      },
    },
  };
}

async function buildProcurementEvidence(context: OrganizationSuccessContext): Promise<EvidenceBundle> {
  const organizationId = context.organizationId;
  const [overview, recentOrders, quality, reconciliation] = await Promise.all([
    context.supabase.from('procurement_overview').select('*').eq('organization_id', organizationId).maybeSingle(),
    context.supabase.from('canonical_purchase_orders_current')
      .select('po_number,vendor_name,item_code,item_description,quantity,unit_price,total_amount,order_date,status,updated_at,cost_center_code')
      .eq('organization_id', organizationId).order('order_date', { ascending: false }).limit(80),
    context.supabase.from('purchase_order_quality')
      .select('purchase_order_id,order_number,order_date,supplier_name,line_count,distinct_product_count,header_net_amount,calculated_line_net_amount,net_amount_variance,warning_line_count,quality_status')
      .eq('organization_id', organizationId).neq('quality_status', 'valid').order('order_date', { ascending: false }).limit(40),
    context.supabase.from('supplier_reconciliation_v1')
      .select('source_supplier_name,match_status,match_confidence,match_notes')
      .eq('organization_id', organizationId).eq('match_status', 'pending').order('source_supplier_name').limit(40),
  ]);

  const failures = [overview.error, recentOrders.error, quality.error, reconciliation.error].filter(Boolean);
  if (failures.length) throw new Error((failures[0] as any)?.message || 'No se pudo cargar compras canónicas');

  const recent = recentOrders.data || [];
  return {
    capability: 'procurement',
    sources: ['canonical_purchase_orders_current', 'procurement_overview', 'purchase_order_quality', 'supplier_reconciliation_v1'],
    toolsUsed: [
      { name: 'read_procurement_overview', mode: 'read' },
      { name: 'read_recent_purchase_orders', mode: 'read' },
      { name: 'read_procurement_quality', mode: 'read' },
    ],
    payload: {
      freshness: {
        latest_order_date: recent[0]?.order_date || overview.data?.last_purchase_date || null,
        latest_updated_at: recent.reduce((latest: string | null, row: any) => {
          const value = typeof row?.updated_at === 'string' ? row.updated_at : null;
          return value && (!latest || value > latest) ? value : latest;
        }, null),
        meaning: 'Última orden/actualización disponible en canonical_purchase_orders_current; no implica tiempo real.',
      },
      overview: overview.data || null,
      recent_orders: recent,
      quality_issues: quality.data || [],
      supplier_reconciliation_pending: reconciliation.data || [],
      semantics: {
        order_status: 'Se conserva el estado de la fuente. No se infiere entrega, recepción, pago ni cierre cuando esa evidencia no existe.',
        amounts: 'Montos y precios corresponden a la orden registrada; no se presentan como cotización vigente salvo evidencia explícita.',
      },
    },
  };
}

function requestedOperationalDomains(capabilities: QueryCapability[], localDomain: OperationalAssistantDomain) {
  const requested = new Set<OperationalAssistantDomain>([localDomain]);
  if (capabilities.includes('inventory')) requested.add('inventory');
  if (capabilities.includes('procurement')) requested.add('procurement');
  return [...requested];
}

function actionRefusal(domain: OperationalAssistantDomain) {
  const label = domain === 'inventory' ? 'Inventario' : 'Compras';
  return `Puedo preparar y explicar la decisión en ${label}, pero este asistente no ejecuta mutaciones operacionales. La acción debe realizarse en el flujo autorizado del módulo y con confirmación humana.`;
}

export async function handleOperationalDomainAssistant(args: {
  request: NextRequest;
  context: OrganizationSuccessContext;
  domain: OperationalAssistantDomain;
  allowedDomains: OperationalAssistantDomain[];
}) {
  const { request, context, domain } = args;

  if (request.method === 'GET') {
    return NextResponse.json({
      conversation: null,
      messages: [],
      hasMore: false,
      oldestMessageAt: null,
      sessionIdleHours: null,
      memoryCount: 0,
      cargo: null,
      persistence: 'stateless_v1',
    });
  }

  const body = await request.json().catch(() => null);
  if (body?.action === 'archive') return NextResponse.json({ archived: false, conversationId: null });

  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!message) return NextResponse.json({ error: 'Escribe una consulta operacional.' }, { status: 400 });
  if (message.length > MAX_MESSAGE_CHARS) return NextResponse.json({ error: 'La consulta es demasiado extensa.' }, { status: 400 });

  const route = routeOperationalQuery(message, { domain });
  if (route.requiresExplicitAuthorization || route.mode === 'action') {
    return NextResponse.json({
      answer: actionRefusal(domain),
      model: null,
      sources: [],
      toolsUsed: [],
      conversationId: null,
      route,
      policy: 'READ_ONLY: ninguna mutación se ejecuta desde este runtime conversacional.',
    });
  }

  try {
    const desired = requestedOperationalDomains(route.capabilities, domain);
    const permitted = desired.filter((item) => args.allowedDomains.includes(item));
    const denied = desired.filter((item) => !args.allowedDomains.includes(item));
    const bundles = await Promise.all(permitted.map((item) => item === 'inventory' ? buildInventoryEvidence(context) : buildProcurementEvidence(context)));

    const sources = Array.from(new Set(bundles.flatMap((bundle) => bundle.sources)));
    const toolsUsed = bundles.flatMap((bundle) => bundle.toolsUsed);
    const evidence = Object.fromEntries(bundles.map((bundle) => [bundle.capability, bundle.payload]));
    const localLabel = domain === 'inventory' ? 'Inventario' : 'Compras';

    const instructions = `Eres el especialista de ${localLabel} dentro de MOTIL Intelligence Core para una operación minera chilena. Tu arquitectura es contexto local primero y expansión transversal sólo cuando aporta evidencia útil.\n\nREGLAS OBLIGATORIAS:\n1. Usa exclusivamente la evidencia canónica incluida en EVIDENCIA MOTIL para afirmaciones operacionales.\n2. Distingue DATO CANÓNICO, INTERPRETACIÓN PROFESIONAL, HIPÓTESIS A REVISAR y SIGUIENTE ACCIÓN cuando corresponda.\n3. Si el usuario pregunta por hoy, ahora o estado actual, declara explícitamente la fecha de frescura disponible. No presentes un snapshot antiguo como tiempo real.\n4. Un stock en reorder/out_of_stock/negative no es por sí solo criticidad operacional, riesgo de falla ni prioridad de compra. Explica qué evidencia adicional faltaría para priorizar.\n5. Un estado de orden de compra no autoriza inferir recepción, entrega, pago o cierre si esos hechos no están en la evidencia.\n6. No inventes precios vigentes, proveedores, lead times, criticidades, repuestos equivalentes, costos, causas ni disponibilidad.\n7. Si falta permiso para una capacidad transversal solicitada, dilo de forma breve y limita la conclusión a la evidencia autorizada.\n8. No ejecutes compras, reservas, ajustes de stock, recepciones, aprobaciones ni otra mutación. Puedes preparar una recomendación para validación humana.\n9. Mantén la respuesta operacional, concreta y breve. Prioriza qué sabemos, qué excepción importa, qué falta confirmar y cuál es el siguiente paso de mayor valor.\n10. No expongas JSON crudo ni detalles internos del runtime.`;

    const input = `RUTA DE CONSULTA\n${JSON.stringify(route)}\n\nCAPACIDADES SIN PERMISO\n${JSON.stringify(denied)}\n\nEVIDENCIA MOTIL\n${JSON.stringify(evidence)}\n\nPREGUNTA\n${message}`;
    const result = await callOpenAI({ instructions, input });

    return NextResponse.json({
      answer: result.text,
      model: result.model,
      responseId: result.responseId,
      sources,
      toolsUsed,
      conversationId: null,
      route,
      deniedCapabilities: denied,
      persistence: 'stateless_v1',
      policy: 'READ_ONLY: evidencia canónica → interpretación → hipótesis → siguiente acción humana. Expansión transversal sólo con permiso y cuando la consulta la requiere.',
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error ?? 'unknown');
    const configurationError = detail.includes('OPENAI_API_KEY');
    console.error('[operational-domain-assistant] request failed', { domain, detail });
    return NextResponse.json({
      error: configurationError ? 'El servicio de IA no está configurado en este entorno.' : 'No fue posible consultar la evidencia operacional.',
    }, { status: configurationError ? 503 : 500 });
  }
}
