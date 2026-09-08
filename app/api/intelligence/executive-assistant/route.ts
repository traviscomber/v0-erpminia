export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { resolveExecutiveAccess } from '@/lib/intelligence/executive-access';
import { routeOperationalQuery } from '@/lib/intelligence/query-router';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const MAX_MESSAGE_CHARS = 12000;

function extractResponseText(payload: any) {
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === 'output_text' && typeof content.text === 'string') return content.text.trim();
    }
  }
  return typeof payload?.output_text === 'string' ? payload.output_text.trim() : '';
}

async function callModel(instructions: string, input: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY no está configurada en el servidor');
  const models = Array.from(new Set([
    process.env.OPENAI_OPERATIONAL_ASSISTANT_MODEL?.trim(),
    'gpt-5.6',
    'gpt-5.6-terra',
    'gpt-5.6-luna',
  ].filter(Boolean))) as string[];
  let lastError = 'No hay un modelo disponible';

  for (const model of models) {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, instructions, input, reasoning: { effort: 'medium' }, max_output_tokens: 2600 }),
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

type ToolRef = { name: string; mode: 'read' };

export async function GET(request: NextRequest) {
  const access = await resolveExecutiveAccess(request);
  if (!access.ok) return access.response;
  return NextResponse.json({
    conversation: null,
    messages: [],
    hasMore: false,
    oldestMessageAt: null,
    sessionIdleHours: null,
    memoryCount: 0,
    cargo: null,
    persistence: 'stateless_v1',
    authorizedDomains: access.domains,
  });
}

export async function POST(request: NextRequest) {
  const access = await resolveExecutiveAccess(request);
  if (!access.ok) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const body = await request.json().catch(() => null);
  if (body?.action === 'archive') return NextResponse.json({ archived: false, conversationId: null });
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!message) return NextResponse.json({ error: 'Escribe una consulta ejecutiva.' }, { status: 400 });
  if (message.length > MAX_MESSAGE_CHARS) return NextResponse.json({ error: 'La consulta es demasiado extensa.' }, { status: 400 });

  const route = routeOperationalQuery(message, { domain: 'executive' });
  if (route.mode === 'action' || route.requiresExplicitAuthorization) {
    return NextResponse.json({
      answer: 'Puedo priorizar evidencia y preparar una recomendación ejecutiva, pero el Centro Ejecutivo conversacional no ejecuta aprobaciones, compras, cierres, ajustes ni otras mutaciones. La decisión debe confirmarse en el flujo autorizado.',
      model: null,
      sources: [],
      toolsUsed: [],
      conversationId: null,
      route,
      policy: 'READ_ONLY: síntesis ejecutiva sin bypass de permisos ni acciones.',
    });
  }

  try {
    const org = context.organizationId;
    const evidence: Record<string, unknown> = {};
    const sources = new Set<string>();
    const toolsUsed: ToolRef[] = [];

    if (access.canRead('production')) {
      const [flow, fidelity, drilling] = await Promise.all([
        context.supabase
          .from('production_fine_flow_daily_v1')
          .select('operation_date,transported_wet_metric_tons,treated_wet_metric_tons,recovered_fine_cu_metric_tons,fine_coverage_state,transport_treatment_delta_metric_tons,flow_state')
          .eq('organization_id', org)
          .order('operation_date', { ascending: false })
          .limit(31),
        context.supabase
          .from('production_source_fidelity_exceptions_v1')
          .select('domain,exception_type,event_date,reference_code,description')
          .eq('organization_id', org)
          .order('event_date', { ascending: false })
          .limit(40),
        context.supabase
          .from('production_drilling_operational_summary_v1')
          .select('*')
          .eq('organization_id', org)
          .maybeSingle(),
      ]);
      const failed = [flow, fidelity, drilling].find((result) => result.error);
      if (failed?.error) throw failed.error;
      evidence.production = {
        freshness: {
          flow_through: flow.data?.[0]?.operation_date || null,
          drilling_through: drilling.data?.max_date || null,
        },
        recent_flow: flow.data || [],
        source_fidelity_exceptions: fidelity.data || [],
        drilling_summary: drilling.data || null,
      };
      ['production_fine_flow_daily_v1', 'production_source_fidelity_exceptions_v1', 'production_drilling_operational_summary_v1'].forEach((source) => sources.add(source));
      toolsUsed.push({ name: 'read_executive_production', mode: 'read' });
    }

    if (access.canRead('maintenance')) {
      const [workOrders, reviews, preventive] = await Promise.all([
        context.supabase
          .from('maintenance_work_orders')
          .select('id,work_order_number,canonical_asset_id,title,status,priority,scheduled_date,completion_date,down_time_hours,external_cost')
          .eq('organization_id', org)
          .order('created_at', { ascending: false })
          .limit(120),
        context.supabase
          .from('drilling_maintenance_review_queue_v1')
          .select('review_id,asset_code,asset_name,operation_date,review_reason,review_status,has_linked_work_order')
          .eq('organization_id', org)
          .eq('review_status', 'pending')
          .limit(60),
        context.supabase
          .from('preventive_maintenance_hour_status_v1')
          .select('asset_code,asset_name,task_name,hour_status,remaining_hours,meter_basis_conflict,generated_work_order_id')
          .eq('organization_id', org)
          .limit(100),
      ]);
      const failed = [workOrders, reviews, preventive].find((result) => result.error);
      if (failed?.error) throw failed.error;
      evidence.maintenance = {
        work_orders: workOrders.data || [],
        pending_operational_reviews: reviews.data || [],
        preventive_hour_status: preventive.data || [],
      };
      ['maintenance_work_orders', 'drilling_maintenance_review_queue_v1', 'preventive_maintenance_hour_status_v1'].forEach((source) => sources.add(source));
      toolsUsed.push({ name: 'read_executive_maintenance', mode: 'read' });
    }

    if (access.canRead('inventory')) {
      const [overview, snapshot] = await Promise.all([
        context.supabase.from('inventory_intelligence_overview_v1').select('*').eq('organization_id', org).maybeSingle(),
        context.supabase.from('canonical_inventory_current').select('snapshot_date').eq('organization_id', org).order('snapshot_date', { ascending: false }).limit(1),
      ]);
      if (overview.error || snapshot.error) throw overview.error || snapshot.error;
      evidence.inventory = {
        freshness: { snapshot_date: snapshot.data?.[0]?.snapshot_date || null },
        overview: overview.data || null,
      };
      sources.add('inventory_intelligence_overview_v1');
      sources.add('canonical_inventory_current');
      toolsUsed.push({ name: 'read_executive_inventory', mode: 'read' });
    }

    if (access.canRead('procurement')) {
      const [overview, recent, quality] = await Promise.all([
        context.supabase.from('procurement_overview').select('*').eq('organization_id', org).maybeSingle(),
        context.supabase
          .from('canonical_purchase_orders_current')
          .select('po_number,vendor_name,item_code,item_description,total_amount,order_date,status,updated_at,cost_center_code')
          .eq('organization_id', org)
          .order('order_date', { ascending: false })
          .limit(50),
        context.supabase
          .from('purchase_order_quality')
          .select('order_number,order_date,supplier_name,warning_line_count,quality_status,net_amount_variance')
          .eq('organization_id', org)
          .neq('quality_status', 'valid')
          .order('order_date', { ascending: false })
          .limit(30),
      ]);
      const failed = [overview, recent, quality].find((result) => result.error);
      if (failed?.error) throw failed.error;
      evidence.procurement = {
        freshness: { latest_order_date: recent.data?.[0]?.order_date || overview.data?.last_purchase_date || null },
        overview: overview.data || null,
        recent_orders: recent.data || [],
        quality_warnings: quality.data || [],
      };
      ['procurement_overview', 'canonical_purchase_orders_current', 'purchase_order_quality'].forEach((source) => sources.add(source));
      toolsUsed.push({ name: 'read_executive_procurement', mode: 'read' });
    }

    if (access.canRead('finance')) {
      const [overview, centers] = await Promise.all([
        context.supabase.from('finance_overview').select('*').eq('organization_id', org).maybeSingle(),
        context.supabase
          .from('canonical_finance_cost_centers')
          .select('cost_center_code,event_count,recognized_clp,committed_clp,first_event_at,last_event_at')
          .eq('organization_id', org)
          .order('committed_clp', { ascending: false })
          .limit(80),
      ]);
      if (overview.error || centers.error) throw overview.error || centers.error;
      evidence.finance = {
        overview: overview.data || null,
        cost_centers: centers.data || [],
      };
      sources.add('finance_overview');
      sources.add('canonical_finance_cost_centers');
      toolsUsed.push({ name: 'read_executive_finance', mode: 'read' });
    }

    const instructions = `Eres el Asistente Senior del Centro Ejecutivo de MOTIL para una operación minera chilena. Tu función es convertir evidencia autorizada en una lista corta de decisiones y validaciones humanas de mayor valor.\n\nREGLAS OBLIGATORIAS:\n1. Usa exclusivamente EVIDENCIA MOTIL. Nunca insinúes conocimiento de dominios no presentes o no autorizados.\n2. Conserva por separado la fecha de corte de cada fuente. No llames "hoy" o "actual" a un dato cuyo corte sea anterior.\n3. No conviertas ausencia de permiso, ausencia de fuente ni vacío de datos en un cero operacional.\n4. No mezcles compromisos de compra, gasto reconocido, pagos, stock, producción o costos como si fueran la misma métrica.\n5. Una alerta, warning, cola o status sólo describe la semántica de su fuente; no es causa raíz ni riesgo probabilístico por sí solo.\n6. Prioriza máximo 3 asuntos cuando la pregunta sea general. Para cada uno: DATO CANÓNICO → POR QUÉ IMPORTA → INCERTIDUMBRE/EVIDENCIA FALTANTE → SIGUIENTE DECISIÓN O VALIDACIÓN HUMANA.\n7. Una prioridad ejecutiva es una recomendación explicable, no una orden ni autorización.\n8. No ejecutes acciones, no apruebes, no cierres, no compres, no ajustes stock y no cambies estados.\n9. Si las fechas de corte entre dominios no son comparables, dilo antes de correlacionarlos.\n10. Responde breve, operacional y sin JSON crudo.`;

    const result = await callModel(instructions, `DOMINIOS AUTORIZADOS\n${JSON.stringify(access.domains)}\n\nEVIDENCIA MOTIL\n${JSON.stringify(evidence)}\n\nPREGUNTA\n${message}`);

    return NextResponse.json({
      answer: result.text,
      model: result.model,
      responseId: result.responseId,
      sources: Array.from(sources),
      toolsUsed,
      conversationId: null,
      route,
      authorizedDomains: access.domains,
      persistence: 'stateless_v1',
      policy: 'READ_ONLY + permission-aware: síntesis transversal sólo sobre evidencia autorizada, preservando frescura por fuente.',
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error ?? 'unknown');
    const configurationError = detail.includes('OPENAI_API_KEY');
    console.error('[executive-assistant] request failed', { detail });
    return NextResponse.json({
      error: configurationError ? 'El servicio de IA no está configurado en este entorno.' : 'No fue posible construir la síntesis ejecutiva.',
    }, { status: configurationError ? 503 : 500 });
  }
}
