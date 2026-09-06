'use client';

import { FormEvent, useState } from 'react';
import { Bot, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function MaintenanceSeniorAssistant() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
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

  return <>
    {!open ? <Button onClick={() => setOpen(true)} className="fixed bottom-6 right-6 z-50 shadow-lg"><Bot className="h-4 w-4"/>Asistente Senior</Button> : null}
    {open ? <Card className="fixed bottom-6 right-6 z-50 flex h-[min(620px,calc(100vh-3rem))] w-[min(460px,calc(100vw-3rem))] flex-col shadow-2xl">
      <CardHeader className="flex flex-row items-center justify-between border-b py-4"><div><CardTitle className="text-base">Asistente Senior de Mantenimiento</CardTitle><p className="mt-1 text-xs text-muted-foreground">Grounded en evidencia canónica MOTIL. La decisión final es humana.</p></div><Button size="icon-sm" variant="ghost" onClick={() => setOpen(false)} aria-label="Cerrar asistente"><X className="h-4 w-4"/></Button></CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-4">
        <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border bg-muted/10 p-4 text-sm leading-relaxed whitespace-pre-wrap">
          {answer || 'Pregunta qué equipo requiere atención, por qué, qué evidencia lo respalda, qué contradice la señal o qué dato conviene capturar antes de intervenir.'}
          {error ? <p className="mt-3 text-destructive">{error}</p> : null}
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button type="button" className="rounded-md border p-2 text-left hover:bg-muted" onClick={() => setMessage('¿Qué equipos requieren atención primero y por qué?')}>Prioridad de equipos</button>
          <button type="button" className="rounded-md border p-2 text-left hover:bg-muted" onClick={() => setMessage('¿Qué señales parecen mecánicas y cuáles pueden deberse a agua, energía o dotación?')}>Mecánico vs. operacional</button>
          <button type="button" className="rounded-md border p-2 text-left hover:bg-muted" onClick={() => setMessage('¿Qué preventivos están vencidos y cuál es la evidencia de horómetro?')}>Preventivos vencidos</button>
          <button type="button" className="rounded-md border p-2 text-left hover:bg-muted" onClick={() => setMessage('¿Qué dato faltante tendría más valor para mejorar la decisión de mantenimiento?')}>Próxima mejor evidencia</button>
        </div>
        <form onSubmit={submit} className="flex gap-2">
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={3} maxLength={12000} placeholder="Consulta de mantenimiento..." className="min-h-[76px] flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"/>
          <Button type="submit" size="icon" disabled={loading || !message.trim()} aria-label="Enviar consulta"><Send className="h-4 w-4"/></Button>
        </form>
      </CardContent>
    </Card> : null}
  </>;
}
