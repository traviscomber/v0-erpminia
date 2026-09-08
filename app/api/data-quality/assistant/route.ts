export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { resolveDataHealthAccess } from '@/lib/intelligence/data-health-access';
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
      body: JSON.stringify({ model, instructions, input, reasoning: { effort: 'medium' }, max_output_tokens: 2400 }),
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

type SourceRef = { source: string } | { tool: string; mode: 'read' };

export async function GET(request: NextRequest) {
  const access = await resolveDataHealthAccess(request);
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
  const access = await resolveDataHealthAccess(request);
  if (!access.ok) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const body = await request.json().catch(() => null);
  if (body?.action === 'archive') return NextResponse.json({ archived: false, conversationId: null });
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!message) return NextResponse.json({ error: 'Escribe una consulta de calidad de datos.' }, { status: 400 });
  if (message.length > MAX_MESSAGE_CHARS) return NextResponse.json({ error: 'La consulta es demasiado extensa.' }, { status: 400 });

  const route = routeOperationalQuery(message, { domain: 'data_health' });
  if (route.mode === 'action' || route.requiresExplicitAuthorization) {
    return NextResponse.json({
      answer: 'Puedo explicar la calidad, frescura y cobertura de los datos, pero este asistente no corrige, concilia ni modifica fuentes. La resolución debe realizarse en el flujo humano autorizado.',
      model: null,
      sources: [],
      toolsUsed: [],
      conversationId: null,
      route,
      policy: 'READ_ONLY: Data Health nunca modifica la fuente canónica.',
    });
  }

  try {
    const org = context.organizationId;
    const evidence: Record<string, unknown> = {};
    const refs: SourceRef[] = [];

    if (access.canRead('production')) {
      const [checks, transport, metallurgy, drilling, fidelity] = await Promise.all([
        context.supabase.from('production_canonical_package_quality_v1').select('check_key,expected_value,actual_value,unit,source_scope,status,delta').eq('organization_id', org),
        context.supabase.from('production_material_movements').select('movement_date').eq('organization_id', org).order('movement_date', { ascending: false }).limit(1),
        context.supabase.from('production_metallurgy_deterministic_v2').select('operation_date').eq('organization_id', org).order('operation_date', { ascending: false }).limit(1),
        context.supabase.from('production_drilling_source_reports').select('operation_date').eq('organization_id', org).order('operation_date', { ascending: false }).limit(1),
        context.supabase.from('production_source_fidelity_exceptions_v1').select('domain,exception_type,source_file,source_sheet,source_row,event_date,reference_code,description').eq('organization_id', org).order('event_date', { ascending: false }).limit(60),
      ]);
      const failed = [checks, transport, metallurgy, drilling, fidelity].find((result) => result.error);
      if (failed?.error) throw failed.error;
      evidence.production = {
        quality_checks: checks.data || [],
        latest_dates: {
          transport: transport.data?.[0]?.movement_date || null,
          metallurgy: metallurgy.data?.[0]?.operation_date || null,
          drilling: drilling.data?.[0]?.operation_date || null,
        },
        source_fidelity_exceptions: fidelity.data || [],
      };
      refs.push({ source: 'production_canonical_package_quality_v1' }, { source: 'production_source_fidelity_exceptions_v1' }, { tool: 'read_data_health_production', mode: 'read' });
    }

    if (access.canRead('maintenance')) {
      const [workOrders, reviews] = await Promise.all([
        context.supabase.from('maintenance_work_orders').select('id,status,canonical_asset_id,work_order_number,title').eq('organization_id', org).limit(500),
        context.supabase.from('drilling_maintenance_review_queue_v1').select('review_id,asset_code,asset_name,operation_date,review_reason,review_status,has_linked_work_order').eq('organization_id', org).eq('review_status', 'pending').limit(100),
      ]);
      const failed = [workOrders, reviews].find((result) => result.error);
      if (failed?.error) throw failed.error;
      const rows = workOrders.data || [];
      const closed = new Set(['completed', 'closed', 'cancelled', 'canceled']);
      const active = rows.filter((row: any) => !closed.has(String(row.status || '').toLowerCase()));
      evidence.maintenance = {
        work_orders_total: rows.length,
        active_work_orders: active.length,
        active_without_canonical_asset: active.filter((row: any) => !row.canonical_asset_id).slice(0, 100),
        pending_operational_reviews: reviews.data || [],
      };
      refs.push({ source: 'maintenance_work_orders' }, { source: 'drilling_maintenance_review_queue_v1' }, { tool: 'read_data_health_maintenance', mode: 'read' });
    }

    if (access.canRead('inventory')) {
      const [overview, snapshot] = await Promise.all([
        context.supabase.from('inventory_intelligence_overview_v1').select('*').eq('organization_id', org).maybeSingle(),
        context.supabase.from('canonical_inventory_current').select('snapshot_date').eq('organization_id', org).order('snapshot_date', { ascending: false }).limit(1),
      ]);
      if (overview.error || snapshot.error) throw overview.error || snapshot.error;
      evidence.inventory = {
        latest_snapshot_date: snapshot.data?.[0]?.snapshot_date || null,
        overview: overview.data || null,
      };
      refs.push({ source: 'inventory_intelligence_overview_v1' }, { source: 'canonical_inventory_current' }, { tool: 'read_data_health_inventory', mode: 'read' });
    }

    if (access.canRead('procurement')) {
      const [quality, exceptions, supplierReconciliation] = await Promise.all([
        context.supabase.from('purchase_order_quality').select('order_number,order_date,supplier_name,warning_line_count,quality_status,net_amount_variance').eq('organization_id', org).neq('quality_status', 'valid').order('order_date', { ascending: false }).limit(100),
        context.supabase.from('procurement_match_exceptions').select('status').eq('organization_id', org),
        context.supabase.from('supplier_reconciliation_v1').select('source_supplier_name,match_status,match_confidence,match_notes').eq('organization_id', org).eq('match_status', 'pending').limit(100),
      ]);
      const failed = [quality, exceptions, supplierReconciliation].find((result) => result.error);
      if (failed?.error) throw failed.error;
      evidence.procurement = {
        purchase_order_quality_warnings: quality.data || [],
        open_match_exceptions: (exceptions.data || []).filter((row: any) => !['resolved', 'closed', 'ignored'].includes(String(row.status || '').toLowerCase())).length,
        supplier_reconciliation_pending: supplierReconciliation.data || [],
      };
      refs.push({ source: 'purchase_order_quality' }, { source: 'supplier_reconciliation_v1' }, { tool: 'read_data_health_procurement', mode: 'read' });
    }

    const instructions = `Eres el especialista de Calidad de Datos dentro de MOTIL Intelligence Core. Tu función es explicar si una conclusión operacional puede confiar en sus fuentes y qué evidencia falta para mejorarla.\n\nREGLAS:\n1. Usa sólo EVIDENCIA MOTIL y sólo los dominios autorizados presentes.\n2. Diferencia calidad, frescura, cobertura, conciliación e inconsistencia. No conviertas ausencia de datos en una conclusión operacional.\n3. Una fuente atrasada puede seguir siendo válida históricamente, pero no representa el estado actual. Declara las fechas de corte cuando sean relevantes.\n4. Un warning, excepción o cola de revisión no es automáticamente un error operativo ni una causa raíz.\n5. Nunca expongas datos de dominios no incluidos en EVIDENCIA MOTIL ni insinúes que conoces su estado.\n6. No corrijas ni modifiques datos, no fusiones registros y no cierres revisiones. Recomienda la validación humana mínima necesaria.\n7. Responde en formato operativo: Dato canónico → impacto en confiabilidad → evidencia faltante → siguiente validación.\n8. Mantén la respuesta breve y específica. No muestres JSON crudo.`;

    const result = await callModel(instructions, `DOMINIOS AUTORIZADOS\n${JSON.stringify(access.domains)}\n\nEVIDENCIA MOTIL\n${JSON.stringify(evidence)}\n\nPREGUNTA\n${message}`);
    const sources = refs.filter((ref): ref is { source: string } => 'source' in ref).map((ref) => ref.source);
    const toolsUsed = refs.filter((ref): ref is { tool: string; mode: 'read' } => 'tool' in ref).map((ref) => ({ name: ref.tool, mode: ref.mode }));

    return NextResponse.json({
      answer: result.text,
      model: result.model,
      responseId: result.responseId,
      sources,
      toolsUsed,
      conversationId: null,
      route,
      authorizedDomains: access.domains,
      persistence: 'stateless_v1',
      policy: 'READ_ONLY + permission-aware: calidad/frescura/cobertura sólo sobre dominios que el usuario puede leer.',
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error ?? 'unknown');
    const configurationError = detail.includes('OPENAI_API_KEY');
    console.error('[data-quality-assistant] request failed', { detail });
    return NextResponse.json({
      error: configurationError ? 'El servicio de IA no está configurado en este entorno.' : 'No fue posible analizar la calidad de datos.',
    }, { status: configurationError ? 503 : 500 });
  }
}
