'use client';

import { FormEvent, KeyboardEvent, useState } from 'react';
import { Database, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function MaintenanceAiMark() {
  return (
    <svg
      viewBox="0 0 96 96"
      aria-hidden="true"
      className="h-[76px] w-[76px] overflow-visible text-primary"
    >
      <g
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="origin-center motion-safe:animate-[spin_18s_linear_infinite] motion-reduce:animate-none"
      >
        <path d="M18 44A31 31 0 0 1 44 17" stroke="var(--primary)" strokeWidth="5" />
        <path d="M51 17A31 31 0 0 1 73 29" stroke="var(--secondary)" strokeWidth="5" />
        <path d="M77 39A31 31 0 0 1 72 68" stroke="var(--primary)" strokeWidth="5" />
        <path d="M64 75A31 31 0 0 1 31 75" stroke="var(--secondary)" strokeWidth="5" />
        <path d="M24 68A31 31 0 0 1 17 52" stroke="var(--primary)" strokeWidth="5" />
      </g>

      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path
          d="M58.5 27.5a14 14 0 0 0-17.2 17.2L28.7 57.3a7.2 7.2 0 1 0 10.2 10.2l12.6-12.6a14 14 0 0 0 17.2-17.2l-8.2 8.2-7.6-2-2-7.6 7.6-8.8Z"
          stroke="var(--secondary)"
          strokeWidth="4"
        />
        <circle cx="33.7" cy="62.4" r="2.6" stroke="var(--secondary)" strokeWidth="3" />
        <path
          d="M51 57.5h16.5a5.5 5.5 0 0 1 5.5 5.5v12l-7-4H51a5.5 5.5 0 0 1-5.5-5.5V63a5.5 5.5 0 0 1 5.5-5.5Z"
          stroke="var(--primary)"
          strokeWidth="3.5"
        />
      </g>

      <circle
        cx="78"
        cy="30"
        r="4.2"
        fill="var(--secondary)"
        className="motion-safe:animate-[pulse_3.6s_ease-in-out_infinite] motion-reduce:animate-none"
      />
      <circle cx="54" cy="64.5" r="2.2" fill="var(--primary)" />
      <circle cx="60.5" cy="64.5" r="2.2" fill="var(--primary)" />
      <circle cx="67" cy="64.5" r="2.2" fill="var(--primary)" />
    </svg>
  );
}

const starters = [
  '¿Qué equipos requieren atención primero y por qué?',
  '¿Qué señales parecen mecánicas y cuáles operacionales?',
  '¿Qué preventivos están vencidos y con qué evidencia?',
  '¿Qué dato faltante tendría más valor para decidir mejor?',
];

export function MaintenanceSeniorAssistant() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const question = message.trim();
    if (!question || loading) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/maintenance/senior-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: question }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No fue posible consultar al asistente.');
      setAnswer(payload?.answer || 'Sin respuesta utilizable.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible consultar al asistente.');
    } finally {
      setLoading(false);
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  };

  return <>
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={cn(
        'group fixed bottom-5 right-5 z-50 grid h-[88px] w-[88px] place-items-center rounded-full bg-transparent p-0 transition-transform duration-300 hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        open && 'pointer-events-none scale-95 opacity-0',
      )}
      aria-label="Abrir Asistente Senior de Mantenimiento"
      title="Asistente Senior de Mantenimiento"
    >
      <span
        aria-hidden="true"
        className="absolute inset-[9px] rounded-full border border-primary/20 opacity-50 motion-safe:animate-[pulse_4.8s_ease-in-out_infinite] motion-reduce:animate-none"
      />
      <MaintenanceAiMark />
    </button>

    {open ? <section className="fixed bottom-4 right-4 z-50 flex h-[min(640px,calc(100vh-2rem))] w-[min(430px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border bg-background shadow-none" aria-label="Asistente Senior de Mantenimiento">
      <header className="border-b bg-card px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Asistente Senior de Mantenimiento</p>
            <p className="mt-1 text-xs text-muted-foreground">Evidencia canónica MOTIL · decisión humana</p>
            <span className="mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] text-muted-foreground"><Database className="h-3 w-3"/>Canónico</span>
          </div>
          <Button size="icon-sm" variant="ghost" onClick={() => setOpen(false)} aria-label="Cerrar asistente"><X className="h-4 w-4"/></Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
        <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border bg-muted/10 p-4 text-sm leading-relaxed whitespace-pre-wrap">
          {answer || 'Pregunta qué requiere atención, qué evidencia lo respalda, qué contradice la señal y cuál es la próxima acción de mayor valor.'}
          {error ? <p className="mt-3 text-destructive">{error}</p> : null}
        </div>

        {!answer ? <div className="grid gap-2">
          {starters.map((starter) => <button key={starter} type="button" className="min-h-10 rounded-md border px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setMessage(starter)}>{starter}</button>)}
        </div> : null}

        <form onSubmit={submit} className="flex items-end gap-2">
          <label className="sr-only" htmlFor="maintenance-assistant-question">Consulta de mantenimiento</label>
          <textarea id="maintenance-assistant-question" value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={onKeyDown} rows={3} maxLength={12000} placeholder="Consulta de mantenimiento..." className="min-h-[76px] flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"/>
          <Button type="submit" size="icon" disabled={loading || !message.trim()} aria-label="Enviar consulta"><Send className="h-4 w-4"/></Button>
        </form>
      </div>
    </section> : null}
  </>;
}
