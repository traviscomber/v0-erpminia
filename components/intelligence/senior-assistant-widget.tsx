'use client';

import { FormEvent, KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, Database, RotateCcw, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CONTEXT_BY_PATH = [
  ['/dashboard/geologia', 'Geología'],
  ['/dashboard/mantenimiento', 'Mantenimiento'],
  ['/dashboard/mantencion', 'Mantenimiento'],
  ['/dashboard/inventario', 'Inventario'],
  ['/dashboard/bodega', 'Bodega'],
  ['/dashboard/compras', 'Compras'],
  ['/dashboard/produccion', 'Producción'],
  ['/dashboard/finanzas', 'Finanzas'],
  ['/dashboard/calidad-datos', 'Calidad de datos'],
  ['/dashboard/documentos', 'Documentación'],
  ['/dashboard/decisiones', 'Centro Ejecutivo'],
] as const;

type SourceRef = {
  source?: string;
  tool?: string;
  mode?: 'read' | 'prepare_only' | string;
};

type ChatMessage = {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  source_refs?: SourceRef[];
  model?: string | null;
  created_at?: string;
};

type MaintenanceChatState = {
  conversation?: { id: string; title?: string | null } | null;
  messages?: ChatMessage[];
  hasMore?: boolean;
  oldestMessageAt?: string | null;
  sessionIdleHours?: number;
  memoryCount?: number;
  cargo?: string | null;
};

const maintenanceStarters = [
  '¿Qué equipos requieren atención primero y por qué?',
  '¿Qué señales parecen mecánicas y cuáles operacionales?',
  '¿Qué preventivos están vencidos y con qué evidencia?',
  '¿Qué dato faltante tendría más valor para decidir mejor?',
];

const maintenanceToolCopy: Record<string, string> = {
  search_assets: 'Activos',
  get_maintenance_attention_queue: 'Cola de atención',
  get_asset_context: 'Contexto del activo',
  get_asset_context_batch: 'Contexto de activos',
  get_open_work_orders: 'Órdenes abiertas',
  get_maintenance_plan: 'Plan preventivo',
  get_observed_condition_history: 'Condición observada',
  get_closure_readiness: 'Preparación de cierre',
  prepare_maintenance_decision_case: 'Caso preparado',
};

function uniqueToolRefs(refs: SourceRef[]) {
  const unique = new Map<string, SourceRef>();
  for (const ref of refs) {
    if (!ref?.tool) continue;
    const key = `${ref.tool}:${ref.mode || 'read'}`;
    if (!unique.has(key)) unique.set(key, ref);
  }
  return Array.from(unique.values());
}

export function SeniorAssistantMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 72 72" aria-hidden="true" className={className} focusable="false">
      <path
        d="M15 23.5c0-8.6 7-15.5 15.5-15.5h11C50 8 57 14.9 57 23.5V25c5.2 3.8 8.5 10 8.5 17 0 11.9-9.6 21.5-21.5 21.5H31.2L19 68v-7.8C11.6 56.7 6.5 49.1 6.5 40.3 6.5 33.4 9.8 27.3 15 23.5Z"
        className="fill-background stroke-border"
        strokeWidth="2"
      />
      <path
        d="M20 23.5c1.7-7.4 8.3-12.8 16-12.8s14.3 5.4 16 12.8H20Z"
        className="fill-card stroke-foreground"
        strokeWidth="2"
      />
      <path d="M31 10.8h10l2.2 12.7H28.8L31 10.8Z" className="fill-primary" />
      <path d="M15.8 25h40.4v4.7H15.8V25Z" className="fill-foreground" />
      <rect x="16" y="29.5" width="40" height="27" rx="9" className="fill-card stroke-secondary" strokeWidth="3" />
      <path d="M24.5 41.5c1.7-2.5 5.2-2.5 7 0" className="fill-none stroke-secondary" strokeLinecap="round" strokeWidth="3" />
      <path d="M40.5 41.5c1.7-2.5 5.2-2.5 7 0" className="fill-none stroke-secondary" strokeLinecap="round" strokeWidth="3" />
      <path d="M30.8 48.2c3.5 3.2 7 3.2 10.4 0" className="fill-none stroke-primary" strokeLinecap="round" strokeWidth="3" />
      <path d="M58.5 32.5c3.7 2 5.5 5.3 5.5 9.2 0 3.6-1.5 6.4-4.4 8.4" className="fill-none stroke-secondary" strokeLinecap="round" strokeWidth="3" />
      <path d="M61.8 18.2h3.8M60.8 12.8l2.7-2.7M60.8 23.5l2.7 2.7" className="fill-none stroke-primary" strokeLinecap="round" strokeWidth="3" />
    </svg>
  );
}

function MaintenanceAssistantBody() {
  const [loaded, setLoaded] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [oldestMessageAt, setOldestMessageAt] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [memoryCount, setMemoryCount] = useState(0);
  const [cargo, setCargo] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const suppressAutoScrollRef = useRef(false);

  useEffect(() => {
    let active = true;
    fetch('/api/maintenance/senior-assistant', { credentials: 'include', cache: 'no-store' })
      .then(async (response) => {
        const data = (await response.json().catch(() => null)) as MaintenanceChatState & { error?: string };
        if (!response.ok) throw new Error(data?.error || 'No fue posible abrir el asistente.');
        if (!active) return;
        setConversationId(data.conversation?.id || null);
        setMessages(data.messages || []);
        setHasMore(Boolean(data.hasMore));
        setOldestMessageAt(data.oldestMessageAt || null);
        setMemoryCount(data.memoryCount || 0);
        setCargo(data.cargo || null);
        setLoaded(true);
      })
      .catch((cause) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : 'No fue posible abrir el asistente.');
        setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (suppressAutoScrollRef.current) {
      suppressAutoScrollRef.current = false;
      return;
    }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending]);

  const loadOlder = async () => {
    if (!conversationId || !hasMore || !oldestMessageAt || loadingOlder) return;
    setLoadingOlder(true);
    setError(null);
    try {
      const params = new URLSearchParams({ conversationId, before: oldestMessageAt });
      const response = await fetch(`/api/maintenance/senior-assistant?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = (await response.json().catch(() => null)) as MaintenanceChatState & { error?: string };
      if (!response.ok) throw new Error(data?.error || 'No fue posible cargar mensajes anteriores.');
      const older = data.messages || [];
      suppressAutoScrollRef.current = true;
      setMessages((current) => {
        const existing = new Set(current.map((item) => item.id).filter(Boolean));
        return [...older.filter((item) => !item.id || !existing.has(item.id)), ...current];
      });
      setHasMore(Boolean(data.hasMore));
      setOldestMessageAt(data.oldestMessageAt || oldestMessageAt);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible cargar mensajes anteriores.');
    } finally {
      setLoadingOlder(false);
    }
  };

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const question = message.trim();
    if (!question || sending) return;

    setMessages((current) => [...current, { role: 'user', content: question, created_at: new Date().toISOString() }]);
    setMessage('');
    setSending(true);
    setError(null);

    try {
      const response = await fetch('/api/maintenance/senior-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: question, conversationId }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No fue posible consultar al asistente.');
      setConversationId(payload?.conversationId || conversationId);
      if (payload?.message) {
        setMessages((current) => [...current, payload.message]);
      } else if (payload?.answer) {
        const sourceRefs: SourceRef[] = [
          ...(Array.isArray(payload?.sources) ? payload.sources.map((source: string) => ({ source })) : []),
          ...(Array.isArray(payload?.toolsUsed)
            ? payload.toolsUsed.map((tool: { name?: string; mode?: string }) => ({ tool: tool?.name, mode: tool?.mode }))
            : []),
        ];
        setMessages((current) => [...current, { role: 'assistant', content: payload.answer, source_refs: sourceRefs, model: payload?.model || null }]);
      }
      if (Number(payload?.learned || 0) > 0) setMemoryCount((current) => current + Number(payload.learned));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible consultar al asistente.');
    } finally {
      setSending(false);
    }
  }

  const onKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  };

  const startNewConversation = async () => {
    if (sending) return;
    setError(null);
    try {
      if (conversationId) {
        const response = await fetch('/api/maintenance/senior-assistant', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'archive', conversationId }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || 'No fue posible cerrar la conversación.');
      }
      setConversationId(null);
      setMessages([]);
      setHasMore(false);
      setOldestMessageAt(null);
      setMessage('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible cerrar la conversación.');
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-background px-4 py-2.5 text-[11px] text-muted-foreground">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1"><Database className="size-3" />Canónico</span>
          {cargo ? <span className="max-w-48 truncate rounded-full border border-border px-2 py-1" title={cargo}>{cargo}</span> : null}
          <span className="rounded-full border border-border px-2 py-1">Memoria {memoryCount}</span>
        </div>
        <Button type="button" size="icon-sm" variant="ghost" onClick={() => void startNewConversation()} disabled={sending} aria-label="Nueva conversación" title="Archivar conversación y comenzar una nueva">
          <RotateCcw className="size-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-muted/10 px-4 py-4" aria-live="polite">
        {!loaded ? <p className="text-sm text-muted-foreground">Cargando contexto de mantenimiento…</p> : null}
        {loaded && hasMore ? (
          <div className="mb-4 flex justify-center">
            <Button type="button" variant="ghost" size="sm" onClick={() => void loadOlder()} disabled={loadingOlder}>
              {loadingOlder ? 'Cargando…' : 'Ver mensajes anteriores'}
            </Button>
          </div>
        ) : null}

        {loaded && messages.length === 0 ? (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">Pregunta qué requiere atención, qué evidencia lo respalda, qué contradice la señal y cuál es la próxima acción de mayor valor.</p>
            <div className="grid gap-2">
              {maintenanceStarters.map((starter) => (
                <button key={starter} type="button" onClick={() => setMessage(starter)} className="min-h-10 rounded-md border border-border bg-background px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  {starter}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-4">
          {messages.map((item, index) => {
            const toolRefs = uniqueToolRefs(item.source_refs || []);
            return (
              <article key={item.id || `${item.role}-${index}`} className={item.role === 'user' ? 'ml-8 rounded-lg bg-primary px-3 py-2.5 text-sm text-primary-foreground' : 'mr-4 rounded-lg border border-border bg-card px-3 py-3 text-sm text-foreground'}>
                <p className="whitespace-pre-wrap leading-relaxed">{item.content}</p>
                {item.role === 'assistant' && toolRefs.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-2 text-[10px] text-muted-foreground">
                    {toolRefs.map((ref) => <span key={`${ref.tool}:${ref.mode || 'read'}`} className="rounded-full border border-border px-2 py-1">{maintenanceToolCopy[ref.tool || ''] || ref.tool}{ref.mode === 'prepare_only' ? ' · preparar' : ''}</span>)}
                  </div>
                ) : null}
              </article>
            );
          })}
          {sending ? <div className="mr-4 rounded-lg border border-border bg-card px-3 py-3 text-sm text-muted-foreground">Analizando evidencia canónica…</div> : null}
          <div ref={bottomRef} />
        </div>

        {error ? <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">{error}</p> : null}
      </div>

      <form onSubmit={submit} className="border-t border-border bg-card p-3">
        <div className="flex items-end gap-2 rounded-lg border border-border bg-background p-2 focus-within:ring-2 focus-within:ring-primary/40">
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            placeholder="Pregunta al Asistente Senior…"
            className="min-h-12 max-h-28 flex-1 resize-none bg-transparent px-1 py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            aria-label="Pregunta para el Asistente Senior"
          />
          <Button type="submit" size="icon" disabled={!message.trim() || sending} aria-label="Enviar pregunta">
            <Send className="size-4" />
          </Button>
        </div>
        <p className="mt-2 px-1 text-[10px] leading-4 text-muted-foreground">Las recomendaciones se separan de la evidencia. Las acciones operacionales requieren confirmación humana.</p>
      </form>
    </div>
  );
}

export function SeniorAssistantWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const contextLabel = useMemo(() => {
    const match = CONTEXT_BY_PATH.find(([prefix]) => pathname.startsWith(prefix));
    return match?.[1] ?? 'MOTIL';
  }, [pathname]);
  const maintenanceContext = contextLabel === 'Mantenimiento';

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <>
      {open ? (
        <section
          aria-label="Asistente Senior MOTIL"
          className={maintenanceContext
            ? 'fixed bottom-24 right-4 z-50 flex h-[min(700px,calc(100vh-7rem))] w-[min(460px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl md:right-6'
            : 'fixed bottom-24 right-4 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border bg-card shadow-xl md:right-6'}
        >
          <div className="flex items-center gap-3 border-b border-border bg-muted/40 px-4 py-3.5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-background">
              <SeniorAssistantMark className="size-10" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-heading text-sm font-semibold text-foreground">Asistente Senior</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">Contexto: {contextLabel}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Cerrar Asistente Senior"
            >
              <X className="size-4" />
            </button>
          </div>

          {maintenanceContext ? <MaintenanceAssistantBody /> : (
            <div className="space-y-4 p-4">
              <div className="space-y-2">
                <span className="inline-flex items-center rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-primary">Un solo asistente para todo el OS</span>
                <p className="text-sm leading-6 text-foreground">Consulta estado, causas, prioridades y acciones desde un único punto. MOTIL usa sólo el contexto y las fuentes necesarias para cada análisis.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Link href="/dashboard/decisiones" onClick={() => setOpen(false)} className="inline-flex min-h-10 items-center justify-between gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  Centro Ejecutivo <ArrowUpRight className="size-4" />
                </Link>
                <Link href="/dashboard/acciones" onClick={() => setOpen(false)} className="inline-flex min-h-10 items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary">
                  Mis acciones <ArrowUpRight className="size-4 text-secondary" />
                </Link>
              </div>
            </div>
          )}
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="fixed bottom-5 right-4 z-50 flex size-16 items-center justify-center rounded-full border border-primary/50 bg-card shadow-lg transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background md:right-6"
        aria-label={open ? 'Cerrar Asistente Senior' : 'Abrir Asistente Senior'}
        aria-expanded={open}
        title="Asistente Senior MOTIL"
      >
        <SeniorAssistantMark className="size-14" />
        <span className="sr-only">Asistente Senior MOTIL</span>
      </button>
    </>
  );
}
