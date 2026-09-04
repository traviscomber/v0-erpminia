'use client';

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { Bot, Database, MessageCircle, RotateCcw, Send, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ChatMessage = {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  source_refs?: Array<{ source?: string }>;
  model?: string | null;
  created_at?: string;
};

type ChatState = {
  conversation?: { id: string; title?: string | null } | null;
  messages?: ChatMessage[];
  memoryCount?: number;
  cargo?: string | null;
  agent?: string;
};

const starters = [
  '¿Qué está pasando hoy en Geología y qué debería priorizar?',
  'Compárame la ley cabeza reciente con el plan vigente y explícame los riesgos.',
  '¿Qué sabemos realmente de Peumo y qué evidencia geológica nos falta?',
  'Revisa los sondajes más recientes y dime qué requiere atención.',
];

export function GeologiaAiFloatingChat() {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [memoryCount, setMemoryCount] = useState(0);
  const [cargo, setCargo] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || loaded) return;
    let active = true;
    fetch('/api/produccion/geologia/assistant', { credentials: 'include', cache: 'no-store' })
      .then(async (response) => {
        const data = (await response.json().catch(() => null)) as ChatState & { error?: string };
        if (!response.ok) throw new Error(data?.error || 'No fue posible abrir el asistente');
        if (!active) return;
        setConversationId(data.conversation?.id || null);
        setMessages(data.messages || []);
        setMemoryCount(data.memoryCount || 0);
        setCargo(data.cargo || null);
        setLoaded(true);
      })
      .catch((cause) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : 'No fue posible abrir el asistente');
        setLoaded(true);
      });
    return () => { active = false; };
  }, [open, loaded]);

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [open, messages, sending]);

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    const question = input.trim();
    if (!question || sending) return;

    const optimistic: ChatMessage = { role: 'user', content: question, created_at: new Date().toISOString() };
    setMessages((current) => [...current, optimistic]);
    setInput('');
    setError(null);
    setSending(true);

    try {
      const response = await fetch('/api/produccion/geologia/assistant', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question, conversationId }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || 'No fue posible consultar al asistente');
      setConversationId(data.conversationId || conversationId);
      if (data?.message) setMessages((current) => [...current, data.message]);
      if (Number(data?.learned || 0) > 0) setMemoryCount((current) => current + Number(data.learned));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible consultar al asistente');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  };

  const startNewConversation = () => {
    setConversationId(null);
    setMessages([]);
    setError(null);
    setInput('');
  };

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-5 right-5 z-50 h-12 gap-2 rounded-full px-4 shadow-xl transition-transform hover:-translate-y-0.5',
          open && 'pointer-events-none scale-95 opacity-0',
        )}
        aria-label="Abrir Asistente Senior de Geología"
      >
        <Sparkles className="h-4 w-4" />
        <span className="hidden sm:inline">Geólogo IA</span>
        <MessageCircle className="h-4 w-4 sm:hidden" />
      </Button>

      {open ? (
        <section
          className="fixed bottom-4 right-4 z-50 flex h-[min(720px,calc(100vh-2rem))] w-[min(460px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border bg-background shadow-2xl"
          aria-label="Asistente Senior de Geología La Patagua"
        >
          <header className="border-b bg-card px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">Asistente Senior de Geología</p>
                    <p className="truncate text-[11px] text-muted-foreground">La Patagua · datos canónicos vivos</p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1"><Database className="h-3 w-3" />Canónico</span>
                  {cargo ? <span className="max-w-[250px] truncate rounded-full border px-2 py-1" title={cargo}>{cargo}</span> : null}
                  <span className="rounded-full border px-2 py-1">Memoria {memoryCount}</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button type="button" variant="ghost" size="icon-sm" onClick={startNewConversation} aria-label="Nueva conversación" title="Nueva conversación">
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => setOpen(false)} aria-label="Cerrar asistente">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto bg-muted/10 px-4 py-4">
            {!loaded ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Cargando contexto de La Patagua…</div>
            ) : messages.length === 0 ? (
              <div className="space-y-5">
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-center gap-2 text-sm font-medium"><Sparkles className="h-4 w-4 text-primary" />Consulta Geología como conversación</div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">Puedo analizar plan, ley cabeza, sondajes, ensayes, cobertura y pendientes; separar dato de interpretación; y adaptar recomendaciones a tu cargo. Si falta evidencia, lo diré explícitamente.</p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Puedes partir por:</p>
                  {starters.map((starter) => (
                    <button
                      key={starter}
                      type="button"
                      onClick={() => setInput(starter)}
                      className="w-full rounded-lg border bg-background px-3 py-2.5 text-left text-sm leading-5 transition-colors hover:bg-muted/40"
                    >
                      {starter}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <article key={message.id || `${message.role}-${index}`} className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div className={cn(
                      'max-w-[92%] rounded-xl px-3.5 py-3 text-sm leading-6',
                      message.role === 'user' ? 'bg-primary text-primary-foreground' : 'border bg-card text-card-foreground',
                    )}>
                      <div className="whitespace-pre-wrap break-words">{message.content}</div>
                      {message.role === 'assistant' && message.source_refs?.length ? (
                        <p className="mt-2 border-t pt-2 text-[10px] text-muted-foreground">Respuesta grounded en fuentes canónicas de La Patagua.</p>
                      ) : null}
                    </div>
                  </article>
                ))}
                {sending ? (
                  <div className="flex justify-start">
                    <div className="rounded-xl border bg-card px-3.5 py-3 text-sm text-muted-foreground">Analizando datos canónicos y contexto del cargo…</div>
                  </div>
                ) : null}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          <footer className="border-t bg-background p-3">
            {error ? <div className="mb-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">{error}</div> : null}
            <form onSubmit={submit} className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                maxLength={12000}
                placeholder="Pregunta por una mina, sector, ley, sondaje, tendencia o decisión…"
                className="min-h-[54px] max-h-36 flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button type="submit" size="icon" disabled={!input.trim() || sending} aria-label="Enviar consulta">
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <p className="mt-2 text-[10px] leading-4 text-muted-foreground">Enter envía · Shift+Enter agrega línea. Las recomendaciones no sustituyen validación técnica en terreno.</p>
          </footer>
        </section>
      ) : null}
    </>
  );
}
