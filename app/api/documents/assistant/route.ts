export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { resolveDocumentAccess } from '@/lib/intelligence/document-access';
import { routeOperationalQuery } from '@/lib/intelligence/query-router';
import {
  appendCoreMessage,
  archiveCoreConversation,
  conversationTranscript,
  getCoreConversationHistory,
  getCoreConversationState,
  resolveCoreConversation,
  type CoreConversationScope,
  type CoreSourceRef,
} from '@/lib/intelligence/core-conversation';

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
      body: JSON.stringify({ model, instructions, input, reasoning: { effort: 'medium' }, max_output_tokens: 2200 }),
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

function documentScope(context: Extract<Awaited<ReturnType<typeof getOrganizationContext>>, { ok: true }>): CoreConversationScope {
  return {
    organizationId: context.organizationId,
    userId: context.userId,
    domain: 'documents',
  };
}

function documentSourceRefs(sources: string[], toolsUsed: Array<{ name: string; mode: 'read' }>): CoreSourceRef[] {
  return [
    ...Array.from(new Set(sources)).map((source) => ({ source })),
    ...toolsUsed.map((tool) => ({ tool: tool.name, mode: tool.mode })),
  ];
}

export async function GET(request: NextRequest) {
  const access = await resolveDocumentAccess(request);
  if (!access.ok) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const state = await getCoreConversationState(context.supabase, documentScope(context), {
      conversationId: request.nextUrl.searchParams.get('conversationId'),
      before: request.nextUrl.searchParams.get('before'),
    });
    return NextResponse.json({
      ...state,
      sessionIdleHours: null,
      cargo: null,
      persistence: 'core_continuity_v1',
      authorizedDomains: access.domains,
    });
  } catch (error) {
    console.error('[documents-assistant] continuity load failed', {
      detail: error instanceof Error ? error.message : String(error ?? 'unknown'),
    });
    return NextResponse.json({ error: 'No fue posible abrir la conversación documental.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const access = await resolveDocumentAccess(request);
  if (!access.ok) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const scope = documentScope(context);

  const body = await request.json().catch(() => null);
  if (body?.action === 'archive') {
    const conversationId = typeof body?.conversationId === 'string' ? body.conversationId.trim() : '';
    if (conversationId) {
      try {
        await archiveCoreConversation(context.supabase, scope, conversationId);
      } catch (error) {
        console.error('[documents-assistant] archive failed', {
          detail: error instanceof Error ? error.message : String(error ?? 'unknown'),
        });
        return NextResponse.json({ error: 'No fue posible cerrar la conversación documental.' }, { status: 500 });
      }
    }
    return NextResponse.json({ archived: Boolean(conversationId), conversationId: null, persistence: 'core_continuity_v1' });
  }

  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!message) return NextResponse.json({ error: 'Escribe una consulta documental.' }, { status: 400 });
  if (message.length > MAX_MESSAGE_CHARS) return NextResponse.json({ error: 'La consulta es demasiado extensa.' }, { status: 400 });

  const route = routeOperationalQuery(message, { domain: 'documents' });

  try {
    const conversation = await resolveCoreConversation(context.supabase, scope, {
      conversationId: typeof body?.conversationId === 'string' ? body.conversationId : null,
      firstMessage: message,
    });
    const history = await getCoreConversationHistory(context.supabase, scope, conversation.id);
    await appendCoreMessage(context.supabase, scope, {
      conversationId: conversation.id,
      role: 'user',
      content: message,
    });

    if (route.mode === 'action' || route.requiresExplicitAuthorization) {
      const answer = 'Puedo identificar documentos, vencimientos y evidencia faltante, pero este asistente no aprueba, reemplaza, sube ni modifica documentos. Usa el flujo autorizado del módulo para cualquier cambio.';
      const persisted = await appendCoreMessage(context.supabase, scope, {
        conversationId: conversation.id,
        role: 'assistant',
        content: answer,
      });
      return NextResponse.json({
        answer,
        message: persisted,
        model: null,
        sources: [],
        toolsUsed: [],
        conversationId: conversation.id,
        route,
        persistence: 'core_continuity_v1',
        policy: 'READ_ONLY: el asistente documental no modifica archivos ni estados. El historial es contexto no canónico.',
      });
    }

    const org = context.organizationId;
    const evidence: Record<string, unknown> = {};
    const sources: string[] = [];
    const toolsUsed: Array<{ name: string; mode: 'read' }> = [];

    if (access.canRead('hse')) {
      const hse = await context.supabase
        .from('documents')
        .select('id,module,category,document_type,title,document_number,version,status,issue_date,valid_from,valid_until,expiry_date,created_at,updated_at')
        .eq('organization_id', org)
        .in('module', ['hse', 'prevención'])
        .order('updated_at', { ascending: false })
        .limit(120);
      if (hse.error) throw hse.error;
      evidence.hse = hse.data || [];
      sources.push('documents');
      toolsUsed.push({ name: 'read_hse_documents', mode: 'read' });
    }

    if (access.canRead('legal')) {
      const [legalDocs, contracts] = await Promise.all([
        context.supabase
          .from('documents')
          .select('id,module,category,document_type,title,document_number,version,status,issue_date,valid_from,valid_until,expiry_date,created_at,updated_at')
          .eq('organization_id', org)
          .eq('module', 'legal')
          .order('updated_at', { ascending: false })
          .limit(120),
        context.supabase
          .from('contracts')
          .select('id,contract_number,contract_type,title,start_date,end_date,contract_value,currency,status,execution_percentage,responsible_area,responsible_person,review_due_date,contractor_name,compliance_status,updated_at')
          .eq('organization_id', org)
          .order('updated_at', { ascending: false })
          .limit(120),
      ]);
      if (legalDocs.error || contracts.error) throw legalDocs.error || contracts.error;
      evidence.legal = { documents: legalDocs.data || [], contracts: contracts.data || [] };
      sources.push('documents', 'contracts');
      toolsUsed.push({ name: 'read_legal_documents', mode: 'read' }, { name: 'read_contracts', mode: 'read' });
    }

    const unsupported = access.domains.filter((domain) => domain === 'maintenance' || domain === 'inventory');
    if (unsupported.length) {
      evidence.unavailable_tenant_safe_document_domains = unsupported;
    }

    const instructions = `Eres el especialista de Documentos dentro de MOTIL Intelligence Core.\n\nREGLAS:\n1. Usa sólo EVIDENCIA MOTIL y únicamente dominios autorizados para afirmar presencia, estado, vigencia, vencimiento, aprobación, contrato o cumplimiento.\n2. HISTORIAL CONVERSACIONAL es contexto NO CANÓNICO. Puede ayudarte a entender a qué documento, contrato o tema se refiere el usuario, pero una mención previa nunca prueba que un documento exista ni cuál sea su estado actual.\n3. Separa documento vigente, próximo a vencer, vencido, en revisión y evidencia faltante según campos explícitos.\n4. Nunca infieras cumplimiento contractual, aprobación, renovación o vigencia cuando la fuente no lo acredita.\n5. Declara fechas exactas cuando hables de vencimientos o revisiones.\n6. Si un dominio aparece como unavailable_tenant_safe_document_domains, explica que no se incluyó porque no existe una fuente tenant-safe confirmada; no lo presentes como ausencia de documentos.\n7. No expongas URLs privadas, rutas de almacenamiento ni datos personales innecesarios.\n8. No modifiques archivos ni estados. Recomienda la validación humana mínima necesaria.\n9. Responde de forma ejecutiva: Dato canónico → riesgo/impacto documental → evidencia faltante → siguiente acción.\n10. No muestres JSON crudo.`;

    const result = await callModel(
      instructions,
      `DOMINIOS AUTORIZADOS\n${JSON.stringify(access.domains)}\n\nHISTORIAL CONVERSACIONAL NO CANÓNICO\n${conversationTranscript(history)}\n\nEVIDENCIA MOTIL CANÓNICA/AUTORIZADA\n${JSON.stringify(evidence)}\n\nPREGUNTA\n${message}`,
    );

    const persisted = await appendCoreMessage(context.supabase, scope, {
      conversationId: conversation.id,
      role: 'assistant',
      content: result.text,
      sourceRefs: documentSourceRefs(sources, toolsUsed),
      model: result.model,
    });

    return NextResponse.json({
      answer: result.text,
      message: persisted,
      model: result.model,
      responseId: result.responseId,
      sources: Array.from(new Set(sources)),
      toolsUsed,
      conversationId: conversation.id,
      route,
      authorizedDomains: access.domains,
      persistence: 'core_continuity_v1',
      policy: 'READ_ONLY + tenant-safe: sólo documentos con organización explícita y permisos confirmados. Historial no canónico separado de evidencia.',
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error ?? 'unknown');
    const configurationError = detail.includes('OPENAI_API_KEY');
    console.error('[documents-assistant] request failed', { detail });
    return NextResponse.json({
      error: configurationError ? 'El servicio de IA no está configurado en este entorno.' : 'No fue posible analizar documentos.',
    }, { status: configurationError ? 503 : 500 });
  }
}
