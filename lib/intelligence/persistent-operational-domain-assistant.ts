import { NextRequest, NextResponse } from 'next/server';
import type { OrganizationSuccessContext } from '@/lib/api/organization-context';
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
import {
  handleOperationalDomainAssistant,
  type OperationalAssistantDomain,
} from '@/lib/intelligence/operational-domain-assistant';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const MAX_MESSAGE_CHARS = 12000;
const FOLLOW_UP_HINT = /(^|[\s¿¡])(y\s+(el|la|los|las)|eso|ese|esa|esos|esas|anterior|mismo|misma|segundo|segunda|tercero|tercera|profundiza|detalle|también|además)(\s|$|[?¿!¡.,;:])/i;
const HANDOFF_REVIEW_HINT = /(decision\s*case|caso|handoff|derivad|escalad|prioridad|pendiente|revis|revalid|anterior|eso|ese|esa|qué requiere atención|que requiere atencion)/i;

type PersistentOperationalDomain = OperationalAssistantDomain;

type HandlerArgs = {
  request: NextRequest;
  context: OrganizationSuccessContext;
  domain: PersistentOperationalDomain;
  allowedDomains: OperationalAssistantDomain[];
};

type AdvisoryHandoff = {
  id: string;
  source_domain: string;
  target_domain: string;
  title: string;
  summary: string;
  created_at: string;
};

function scopeFor(context: OrganizationSuccessContext, domain: PersistentOperationalDomain): CoreConversationScope {
  return {
    organizationId: context.organizationId,
    userId: context.userId,
    domain,
  };
}

function refsFromPayload(payload: any): CoreSourceRef[] {
  const sources = Array.isArray(payload?.sources)
    ? payload.sources.filter((value: unknown) => typeof value === 'string').map((source: string) => ({ source }))
    : [];
  const tools = Array.isArray(payload?.toolsUsed)
    ? payload.toolsUsed
        .filter((tool: any) => tool && typeof tool.name === 'string')
        .map((tool: any) => ({ tool: tool.name, mode: typeof tool.mode === 'string' ? tool.mode : 'read' }))
    : [];
  return [...sources, ...tools];
}

function extractResponseText(payload: any) {
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === 'output_text' && typeof content.text === 'string') return content.text.trim();
    }
  }
  return typeof payload?.output_text === 'string' ? payload.output_text.trim() : '';
}

async function rewriteFollowUp(message: string, history: any[]) {
  if (!history.length || !FOLLOW_UP_HINT.test(message)) return message;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return message;

  const models = Array.from(new Set([
    process.env.OPENAI_OPERATIONAL_FOLLOWUP_MODEL?.trim(),
    'gpt-5.6-luna',
    'gpt-5.6-terra',
    'gpt-5.6',
  ].filter(Boolean))) as string[];

  const instructions = `Reescribe una pregunta de seguimiento de un usuario de MOTIL como una consulta operacional autocontenida. El HISTORIAL es contexto conversacional NO CANÓNICO: úsalo sólo para resolver referencias, nombres de temas, entidades o intención. No copies cifras, estados, causas, prioridades ni afirmaciones operacionales del historial como hechos. No agregues conclusiones. No cambies la intención. Devuelve sólo la pregunta reescrita en español, sin explicación. Si no puedes resolver la referencia con seguridad, devuelve exactamente la pregunta original.`;
  const input = `HISTORIAL NO CANÓNICO\n${conversationTranscript(history)}\n\nPREGUNTA ACTUAL\n${message}`;

  for (const model of models) {
    try {
      const response = await fetch(OPENAI_RESPONSES_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          instructions,
          input,
          reasoning: { effort: 'low' },
          max_output_tokens: 220,
        }),
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const detail = payload?.error?.message || `OpenAI respondió ${response.status}`;
        if (/invalid model|model.*not.*found|does not exist|not permitted|not available/i.test(detail)) continue;
        return message;
      }
      const rewritten = extractResponseText(payload);
      if (!rewritten || rewritten.length > MAX_MESSAGE_CHARS) return message;
      return rewritten;
    } catch {
      return message;
    }
  }

  return message;
}

async function loadAdvisoryHandoffs(
  context: OrganizationSuccessContext,
  domain: PersistentOperationalDomain,
  message: string,
) {
  if (!HANDOFF_REVIEW_HINT.test(message)) return [] as AdvisoryHandoff[];

  const { data, error } = await context.supabase
    .from('motil_ai_decision_cases')
    .select('id,source_domain,target_domain,title,summary,created_at')
    .eq('organization_id', context.organizationId)
    .eq('created_by_user_id', context.userId)
    .eq('target_domain', domain)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(3);
  if (error) throw error;
  return (data || []) as AdvisoryHandoff[];
}

function questionWithAdvisoryHandoffs(message: string, handoffs: AdvisoryHandoff[]) {
  if (!handoffs.length) return message;
  const context = handoffs
    .map((row, index) => {
      const summary = String(row.summary || '').replace(/\s+/g, ' ').trim().slice(0, 1800);
      return `${index + 1}. CASE ${row.id} · origen ${row.source_domain} · creado ${row.created_at}\nTítulo: ${row.title}\nResumen previo NO CANÓNICO: ${summary}`;
    })
    .join('\n\n');
  return `${message}\n\nHANDOFF ADVISORY NO CANÓNICO — SÓLO DEFINE QUÉ REVALIDAR\n${context}\n\nREGLA DE REVALIDACIÓN: no uses cifras, estados, causas ni prioridades del handoff como hechos. Vuelve a comprobarlos únicamente contra EVIDENCIA MOTIL actual. Si el caso ya no está respaldado o contradice la evidencia actual, dilo explícitamente.`;
}

function forwardedRequest(request: NextRequest, message: string) {
  const headers = new Headers(request.headers);
  headers.delete('content-length');
  headers.set('content-type', 'application/json');
  return new NextRequest(request.url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message }),
  });
}

export async function handlePersistentOperationalDomainAssistant(args: HandlerArgs) {
  const { request, context, domain } = args;
  const scope = scopeFor(context, domain);

  if (request.method === 'GET') {
    try {
      const state = await getCoreConversationState(context.supabase, scope, {
        conversationId: request.nextUrl.searchParams.get('conversationId'),
        before: request.nextUrl.searchParams.get('before'),
      });
      return NextResponse.json({
        ...state,
        sessionIdleHours: null,
        cargo: null,
        persistence: 'core_continuity_v1',
      });
    } catch (error) {
      console.error('[persistent-operational-assistant] continuity load failed', {
        domain,
        detail: error instanceof Error ? error.message : String(error ?? 'unknown'),
      });
      return NextResponse.json({ error: 'No fue posible abrir la conversación operacional.' }, { status: 500 });
    }
  }

  const body = await request.json().catch(() => null);
  if (body?.action === 'archive') {
    const conversationId = typeof body?.conversationId === 'string' ? body.conversationId.trim() : '';
    if (conversationId) {
      try {
        await archiveCoreConversation(context.supabase, scope, conversationId);
      } catch (error) {
        console.error('[persistent-operational-assistant] archive failed', {
          domain,
          detail: error instanceof Error ? error.message : String(error ?? 'unknown'),
        });
        return NextResponse.json({ error: 'No fue posible cerrar la conversación.' }, { status: 500 });
      }
    }
    return NextResponse.json({
      archived: Boolean(conversationId),
      conversationId: null,
      persistence: 'core_continuity_v1',
    });
  }

  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!message) return NextResponse.json({ error: 'Escribe una consulta operacional.' }, { status: 400 });
  if (message.length > MAX_MESSAGE_CHARS) return NextResponse.json({ error: 'La consulta es demasiado extensa.' }, { status: 400 });

  try {
    const conversation = await resolveCoreConversation(context.supabase, scope, {
      conversationId: typeof body?.conversationId === 'string' ? body.conversationId : null,
      firstMessage: message,
    });
    const history = await getCoreConversationHistory(context.supabase, scope, conversation.id);
    const standaloneMessage = await rewriteFollowUp(message, history);
    const advisoryHandoffs = await loadAdvisoryHandoffs(context, domain, message);
    const groundedQuestion = questionWithAdvisoryHandoffs(standaloneMessage, advisoryHandoffs);

    await appendCoreMessage(context.supabase, scope, {
      conversationId: conversation.id,
      role: 'user',
      content: message,
    });

    const operationalResponse = await handleOperationalDomainAssistant({
      request: forwardedRequest(request, groundedQuestion),
      context,
      domain,
      allowedDomains: args.allowedDomains,
    });
    const payload = await operationalResponse.json().catch(() => null);

    if (!operationalResponse.ok || !payload) {
      return NextResponse.json(payload || { error: 'No fue posible consultar al asistente.' }, {
        status: operationalResponse.status || 500,
      });
    }

    let persistedMessage = null;
    if (typeof payload.answer === 'string' && payload.answer.trim()) {
      persistedMessage = await appendCoreMessage(context.supabase, scope, {
        conversationId: conversation.id,
        role: 'assistant',
        content: payload.answer.trim(),
        sourceRefs: refsFromPayload(payload),
        model: typeof payload.model === 'string' ? payload.model : null,
      });
    }

    return NextResponse.json({
      ...payload,
      message: persistedMessage || payload.message || null,
      conversationId: conversation.id,
      decisionCaseRefs: advisoryHandoffs.map((row) => row.id),
      persistence: 'core_continuity_v1',
      continuityPolicy: 'El historial y los Decision Cases son contexto no canónico. Sólo resuelven referencias o definen qué revalidar; la evidencia operacional sigue proviniendo del runtime canónico autorizado.',
    });
  } catch (error) {
    console.error('[persistent-operational-assistant] request failed', {
      domain,
      detail: error instanceof Error ? error.message : String(error ?? 'unknown'),
    });
    return NextResponse.json({ error: 'No fue posible mantener la continuidad de la conversación.' }, { status: 500 });
  }
}
