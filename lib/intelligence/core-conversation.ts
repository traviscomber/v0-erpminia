type CoreConversationDomain =
  | 'executive'
  | 'inventory'
  | 'procurement'
  | 'production'
  | 'finance'
  | 'documents'
  | 'data_health';

type DbClient = any;

const HISTORY_LIMIT = 40;
const UI_MESSAGE_LIMIT = 20;

export type CoreConversationScope = {
  organizationId: string;
  userId: string;
  domain: CoreConversationDomain;
};

export type CoreSourceRef = {
  source?: string;
  tool?: string;
  mode?: 'read' | 'prepare_only' | string;
};

function scopeQuery(query: any, scope: CoreConversationScope) {
  return query
    .eq('organization_id', scope.organizationId)
    .eq('user_id', scope.userId)
    .eq('domain', scope.domain);
}

function titleFromMessage(message: string) {
  const normalized = message.replace(/\s+/g, ' ').trim();
  if (!normalized) return 'Conversación MOTIL';
  return normalized.length > 72 ? `${normalized.slice(0, 69)}…` : normalized;
}

export function conversationTranscript(rows: any[]) {
  if (!rows.length) return 'Sin conversación previa.';
  return rows
    .map((row) => `${row.role === 'assistant' ? 'ASISTENTE' : 'USUARIO'}: ${row.content}`)
    .join('\n\n');
}

export async function getCoreConversationState(
  db: DbClient,
  scope: CoreConversationScope,
  args: { conversationId?: string | null; before?: string | null } = {},
) {
  let conversation: any = null;

  if (args.conversationId) {
    let query = db
      .from('motil_ai_conversations')
      .select('id,title,status,last_message_at,created_at');
    query = scopeQuery(query, scope)
      .eq('id', args.conversationId)
      .eq('status', 'active')
      .maybeSingle();
    const { data, error } = await query;
    if (error) throw error;
    conversation = data;
  } else {
    let query = db
      .from('motil_ai_conversations')
      .select('id,title,status,last_message_at,created_at');
    query = scopeQuery(query, scope)
      .eq('status', 'active')
      .order('last_message_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data, error } = await query;
    if (error) throw error;
    conversation = data;
  }

  if (!conversation) {
    return {
      conversation: null,
      messages: [],
      hasMore: false,
      oldestMessageAt: null,
      memoryCount: 0,
    };
  }

  let messagesQuery = db
    .from('motil_ai_messages')
    .select('id,role,content,source_refs,model,created_at');
  messagesQuery = scopeQuery(messagesQuery, scope)
    .eq('conversation_id', conversation.id)
    .order('created_at', { ascending: false })
    .limit(UI_MESSAGE_LIMIT + 1);
  if (args.before) messagesQuery = messagesQuery.lt('created_at', args.before);

  const { data: rows, error: messagesError } = await messagesQuery;
  if (messagesError) throw messagesError;
  const page = rows || [];
  const hasMore = page.length > UI_MESSAGE_LIMIT;
  const messages = page.slice(0, UI_MESSAGE_LIMIT).reverse();

  return {
    conversation,
    messages,
    hasMore,
    oldestMessageAt: messages[0]?.created_at || null,
    memoryCount: 0,
  };
}

export async function archiveCoreConversation(
  db: DbClient,
  scope: CoreConversationScope,
  conversationId: string,
) {
  let query = db
    .from('motil_ai_conversations')
    .update({
      status: 'archived',
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  query = scopeQuery(query, scope).eq('id', conversationId).eq('status', 'active');
  const { error } = await query;
  if (error) throw error;
}

export async function resolveCoreConversation(
  db: DbClient,
  scope: CoreConversationScope,
  args: { conversationId?: string | null; firstMessage: string },
) {
  if (args.conversationId) {
    let query = db.from('motil_ai_conversations').select('id,title,status,last_message_at');
    query = scopeQuery(query, scope)
      .eq('id', args.conversationId)
      .eq('status', 'active')
      .maybeSingle();
    const { data, error } = await query;
    if (error) throw error;
    if (data) return data;
  }

  let existingQuery = db.from('motil_ai_conversations').select('id,title,status,last_message_at');
  existingQuery = scopeQuery(existingQuery, scope)
    .eq('status', 'active')
    .order('last_message_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: existing, error: existingError } = await existingQuery;
  if (existingError) throw existingError;
  if (existing) return existing;

  const { data: created, error: createError } = await db
    .from('motil_ai_conversations')
    .insert({
      organization_id: scope.organizationId,
      user_id: scope.userId,
      domain: scope.domain,
      title: titleFromMessage(args.firstMessage),
      status: 'active',
    })
    .select('id,title,status,last_message_at')
    .single();
  if (createError) throw createError;
  return created;
}

export async function getCoreConversationHistory(
  db: DbClient,
  scope: CoreConversationScope,
  conversationId: string,
) {
  let query = db
    .from('motil_ai_messages')
    .select('id,role,content,source_refs,model,created_at');
  query = scopeQuery(query, scope)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(HISTORY_LIMIT);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).reverse();
}

export async function appendCoreMessage(
  db: DbClient,
  scope: CoreConversationScope,
  args: {
    conversationId: string;
    role: 'user' | 'assistant';
    content: string;
    sourceRefs?: CoreSourceRef[];
    model?: string | null;
  },
) {
  const now = new Date().toISOString();
  const { data, error } = await db
    .from('motil_ai_messages')
    .insert({
      conversation_id: args.conversationId,
      organization_id: scope.organizationId,
      user_id: scope.userId,
      domain: scope.domain,
      role: args.role,
      content: args.content,
      source_refs: args.sourceRefs || [],
      model: args.model || null,
    })
    .select('id,role,content,source_refs,model,created_at')
    .single();
  if (error) throw error;

  let update = db
    .from('motil_ai_conversations')
    .update({ last_message_at: now, updated_at: now });
  update = scopeQuery(update, scope).eq('id', args.conversationId).eq('status', 'active');
  const { error: updateError } = await update;
  if (updateError) throw updateError;
  return data;
}
