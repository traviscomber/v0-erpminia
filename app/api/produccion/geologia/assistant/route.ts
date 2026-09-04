export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';
import { buildCanonicalGeologyContext } from '@/lib/geology-ai/canonical-context';
import { buildGeologyAgentInstructions, LA_PATAGUA_PROCESS_CONTEXT } from '@/lib/geology-ai/prompt';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = 'gpt-5.6-terra';
const DEFAULT_MEMORY_MODEL = 'gpt-5.6-luna';
const MAX_MESSAGE_CHARS = 12000;
const HISTORY_LIMIT = 40;

function extractResponseText(payload: any) {
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === 'output_text' && typeof content.text === 'string') return content.text.trim();
    }
  }
  return typeof payload?.output_text === 'string' ? payload.output_text.trim() : '';
}

async function callOpenAI(args: { instructions: string; input: string; model?: string; maxOutputTokens?: number }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY no está configurada en el servidor');

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: args.model || process.env.OPENAI_GEOLOGY_MODEL || DEFAULT_MODEL,
      instructions: args.instructions,
      input: args.input,
      reasoning: { effort: 'medium' },
      max_output_tokens: args.maxOutputTokens || 4200,
    }),
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message || `OpenAI respondió ${response.status}`;
    throw new Error(message);
  }

  const text = extractResponseText(payload);
  if (!text) throw new Error('OpenAI no devolvió texto utilizable');
  return { text, model: payload?.model || args.model || DEFAULT_MODEL, responseId: payload?.id || null };
}

function conversationTranscript(rows: any[]) {
  if (!rows.length) return 'Sin conversación previa.';
  return rows
    .map((row) => `${row.role === 'assistant' ? 'ASISTENTE' : 'USUARIO'}: ${row.content}`)
    .join('\n\n');
}

async function resolveCargo(context: Extract<Awaited<ReturnType<typeof getOrganizationContext>>, { ok: true }>) {
  const { data: profile } = await context.supabase
    .from('profiles')
    .select('cargo_id')
    .eq('id', context.userId)
    .maybeSingle();
  if (!profile?.cargo_id) return null;
  const { data: cargo } = await context.supabase
    .from('cargos')
    .select('name')
    .eq('id', profile.cargo_id)
    .maybeSingle();
  return cargo?.name || null;
}

async function extractDurableMemory(args: {
  message: string;
  existingMemory: string[];
}) {
  const instructions = `Extrae memoria durable útil para personalizar futuras conversaciones de un asistente de geología. Usa SOLAMENTE afirmaciones explícitas del usuario. Nunca guardes contraseñas, secretos, tokens, datos médicos ni inferencias sensibles. No conviertas una afirmación geológica del usuario en dato canónico. Guarda sólo preferencias de trabajo, responsabilidades declaradas, terminología interna, contexto laboral estable o reglas de decisión del usuario. Devuelve JSON puro, sin markdown, como un arreglo de objetos {"type":"preference|responsibility|terminology|working_context|decision_rule|observation","text":"...","confidence":0.0}. Máximo 3 objetos. Si no hay memoria durable, devuelve [].`;
  const input = `MEMORIA YA CONOCIDA:\n${args.existingMemory.join('\n') || 'Ninguna'}\n\nMENSAJE NUEVO DEL USUARIO:\n${args.message}`;
  try {
    const result = await callOpenAI({
      instructions,
      input,
      model: process.env.OPENAI_GEOLOGY_MEMORY_MODEL || DEFAULT_MEMORY_MODEL,
      maxOutputTokens: 500,
    });
    const clean = result.text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(clean);
    if (!Array.isArray(parsed)) return [];
    const allowed = new Set(['preference', 'responsibility', 'terminology', 'working_context', 'decision_rule', 'observation']);
    return parsed.slice(0, 3).filter((item) => allowed.has(String(item?.type)) && typeof item?.text === 'string' && item.text.trim().length >= 4).map((item) => ({
      memory_type: String(item.type),
      memory_text: item.text.trim().slice(0, 1000),
      confidence: Math.max(0, Math.min(1, Number(item.confidence ?? 0.7))),
    }));
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.PROD_GEOLOGIA);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const requestedId = request.nextUrl.searchParams.get('conversationId');
  let conversation: any = null;

  if (requestedId) {
    const { data } = await context.supabase
      .from('geology_ai_conversations')
      .select('id,title,last_message_at,created_at')
      .eq('id', requestedId)
      .eq('organization_id', context.organizationId)
      .eq('user_id', context.userId)
      .maybeSingle();
    conversation = data;
  } else {
    const { data } = await context.supabase
      .from('geology_ai_conversations')
      .select('id,title,last_message_at,created_at')
      .eq('organization_id', context.organizationId)
      .eq('user_id', context.userId)
      .eq('status', 'active')
      .order('last_message_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    conversation = data;
  }

  let messages: any[] = [];
  if (conversation?.id) {
    const { data } = await context.supabase
      .from('geology_ai_messages')
      .select('id,role,content,source_refs,model,created_at')
      .eq('conversation_id', conversation.id)
      .eq('organization_id', context.organizationId)
      .eq('user_id', context.userId)
      .order('created_at', { ascending: true })
      .limit(200);
    messages = data || [];
  }

  const [{ data: memories }, cargo] = await Promise.all([
    context.supabase
      .from('geology_ai_user_memory')
      .select('memory_type,memory_text,confidence,updated_at')
      .eq('organization_id', context.organizationId)
      .eq('user_id', context.userId)
      .eq('active', true)
      .order('updated_at', { ascending: false })
      .limit(20),
    resolveCargo(context),
  ]);

  return NextResponse.json({
    conversation,
    messages,
    memoryCount: memories?.length || 0,
    cargo,
    agent: 'Asistente Senior de Geología La Patagua',
  });
}

export async function POST(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.PROD_GEOLOGIA);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const body = await request.json().catch(() => null);
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  const requestedConversationId = typeof body?.conversationId === 'string' ? body.conversationId : null;
  if (!message) return NextResponse.json({ error: 'Escribe una consulta' }, { status: 400 });
  if (message.length > MAX_MESSAGE_CHARS) return NextResponse.json({ error: 'La consulta es demasiado larga' }, { status: 400 });

  let conversation: any = null;
  if (requestedConversationId) {
    const { data } = await context.supabase
      .from('geology_ai_conversations')
      .select('id,title')
      .eq('id', requestedConversationId)
      .eq('organization_id', context.organizationId)
      .eq('user_id', context.userId)
      .eq('status', 'active')
      .maybeSingle();
    conversation = data;
  }

  if (!conversation) {
    const { data, error } = await context.supabase
      .from('geology_ai_conversations')
      .insert({
        organization_id: context.organizationId,
        user_id: context.userId,
        title: message.slice(0, 90),
      })
      .select('id,title')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    conversation = data;
  }

  const { data: userMessage, error: userMessageError } = await context.supabase
    .from('geology_ai_messages')
    .insert({
      conversation_id: conversation.id,
      organization_id: context.organizationId,
      user_id: context.userId,
      role: 'user',
      content: message,
    })
    .select('id')
    .single();
  if (userMessageError) return NextResponse.json({ error: userMessageError.message }, { status: 500 });

  const [historyResult, memoryResult, cargo, canonical] = await Promise.all([
    context.supabase
      .from('geology_ai_messages')
      .select('role,content,created_at')
      .eq('conversation_id', conversation.id)
      .eq('organization_id', context.organizationId)
      .eq('user_id', context.userId)
      .order('created_at', { ascending: false })
      .limit(HISTORY_LIMIT),
    context.supabase
      .from('geology_ai_user_memory')
      .select('memory_type,memory_text,confidence')
      .eq('organization_id', context.organizationId)
      .eq('user_id', context.userId)
      .eq('active', true)
      .order('updated_at', { ascending: false })
      .limit(20),
    resolveCargo(context),
    buildCanonicalGeologyContext({ supabase: context.supabase, organizationId: context.organizationId }),
  ]);

  const history = [...(historyResult.data || [])].reverse();
  const memoryRows = memoryResult.data || [];
  const memory = memoryRows.map((row: any) => `${row.memory_type}: ${row.memory_text}`);
  const instructions = `${buildGeologyAgentInstructions({
    userName: context.userName || context.userEmail || 'Usuario',
    userEmail: context.userEmail || '',
    cargo,
    accessLevel: access.canWrite ? 'ED' : 'LEC',
    memory,
  })}\n${LA_PATAGUA_PROCESS_CONTEXT}`;

  const modelInput = `CONVERSACIÓN RECIENTE\n${conversationTranscript(history)}\n\nCONTEXTO CANÓNICO VIVO DE LA PATAGUA\n${JSON.stringify(canonical)}\n\nPREGUNTA ACTUAL\n${message}`;

  try {
    const answer = await callOpenAI({ instructions, input: modelInput });
    const sourceRefs = canonical.sources.map((source: string) => ({ source }));

    const { data: assistantMessage, error: assistantMessageError } = await context.supabase
      .from('geology_ai_messages')
      .insert({
        conversation_id: conversation.id,
        organization_id: context.organizationId,
        user_id: context.userId,
        role: 'assistant',
        content: answer.text,
        source_refs: sourceRefs,
        model: answer.model,
      })
      .select('id,role,content,source_refs,model,created_at')
      .single();
    if (assistantMessageError) throw new Error(assistantMessageError.message);

    await context.supabase
      .from('geology_ai_conversations')
      .update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', conversation.id)
      .eq('organization_id', context.organizationId)
      .eq('user_id', context.userId);

    const learned = await extractDurableMemory({ message, existingMemory: memory });
    if (learned.length) {
      const existingTexts = new Set(memoryRows.map((row: any) => String(row.memory_text).toLowerCase().trim()));
      const fresh = learned.filter((item) => !existingTexts.has(item.memory_text.toLowerCase().trim()));
      if (fresh.length) {
        await context.supabase.from('geology_ai_user_memory').insert(fresh.map((item) => ({
          organization_id: context.organizationId,
          user_id: context.userId,
          ...item,
          source_message_id: userMessage.id,
        })));
      }
    }

    return NextResponse.json({
      conversationId: conversation.id,
      message: assistantMessage,
      learned: learned.length,
      model: answer.model,
    });
  } catch (error) {
    const messageText = error instanceof Error ? error.message : 'No fue posible consultar al agente';
    return NextResponse.json({ error: messageText }, { status: 502 });
  }
}
