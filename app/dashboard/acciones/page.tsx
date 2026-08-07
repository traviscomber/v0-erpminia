'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ArrowRight, Check, Clock3, Inbox, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Decision = { id: string; severity: 'critical' | 'warning' | 'info'; title: string; description: string; responsibleArea: string; href: string; dueDate: string | null };
type StateRow = { source_key: string; status: 'pending' | 'read' | 'snoozed'; snoozed_until?: string | null };

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar');
  return payload || {};
};

export default function AccionesPage() {
  const decisions = useSWR('/api/dashboard/ia-operacional', fetcher, { refreshInterval: 60000, revalidateOnFocus: false });
  const states = useSWR('/api/actions/state', fetcher, { revalidateOnFocus: false });
  const stateMap = new Map<string, StateRow>((states.data?.states || []).map((row: StateRow) => [row.source_key, row]));
  const now = Date.now();
  const items: Decision[] = (decisions.data?.decisions || []).filter((item: Decision) => {
    const state = stateMap.get(item.id);
    if (state?.status === 'snoozed' && state.snoozed_until && new Date(state.snoozed_until).getTime() > now) return false;
    return true;
  });

  async function setState(sourceKey: string, status: 'pending' | 'read' | 'snoozed') {
    await fetch('/api/actions/state', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sourceKey, status }) });
    await states.mutate();
  }

  return <div className="space-y-6">
    <section className="flex flex-col gap-4 border-b border-border/70 pb-6 md:flex-row md:items-end md:justify-between">
      <div><p className="text-sm font-medium text-muted-foreground">Trabajo pendiente</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Mis acciones</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Una bandeja personal sobre las excepciones reales del sistema. La información sigue viviendo en su registro original.</p></div>
      <Button variant="outline" onClick={() => { void decisions.mutate(); void states.mutate(); }}><RefreshCw className="mr-2 h-4 w-4" /> Actualizar</Button>
    </section>

    <div className="grid grid-cols-3 gap-3">
      <Card className="shadow-none"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Visibles</p><p className="mt-1 text-2xl font-semibold">{items.length}</p></CardContent></Card>
      <Card className="shadow-none"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Críticas</p><p className="mt-1 text-2xl font-semibold">{items.filter(i => i.severity === 'critical').length}</p></CardContent></Card>
      <Card className="shadow-none"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Leídas</p><p className="mt-1 text-2xl font-semibold">{items.filter(i => stateMap.get(i.id)?.status === 'read').length}</p></CardContent></Card>
    </div>

    <Card className="shadow-none"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Inbox className="h-5 w-5" /> Acciones requeridas</CardTitle></CardHeader><CardContent className="p-0">
      {decisions.error || states.error ? <div className="p-8 text-center text-sm text-muted-foreground">No se pudo cargar la bandeja. Intenta nuevamente.</div> : decisions.isLoading || states.isLoading ? <div className="p-8 text-sm text-muted-foreground">Cargando acciones…</div> : items.length === 0 ? <div className="p-10 text-center"><Check className="mx-auto h-6 w-6" /><p className="mt-3 font-medium">No tienes acciones visibles</p><p className="mt-1 text-sm text-muted-foreground">No hay excepciones abiertas o las existentes están pospuestas.</p></div> : <div className="divide-y border-t">{items.map(item => {
        const state = stateMap.get(item.id);
        return <div key={item.id} className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"><div><div className="flex gap-2"><Badge variant={item.severity === 'critical' ? 'destructive' : 'outline'}>{item.severity === 'critical' ? 'Crítica' : item.severity === 'warning' ? 'Atención' : 'Seguimiento'}</Badge>{state?.status === 'read' && <Badge variant="secondary">Leída</Badge>}</div><p className="mt-2 font-medium">{item.title}</p><p className="mt-1 text-sm text-muted-foreground">{item.description}</p><p className="mt-1 text-xs text-muted-foreground">Responsable: {item.responsibleArea}</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="ghost" onClick={() => void setState(item.id, state?.status === 'read' ? 'pending' : 'read')}><Check className="mr-2 h-4 w-4" /> {state?.status === 'read' ? 'Marcar pendiente' : 'Leída'}</Button><Button size="sm" variant="ghost" onClick={() => void setState(item.id, 'snoozed')}><Clock3 className="mr-2 h-4 w-4" /> Mañana</Button><Button asChild size="sm"><Link href={item.href}>Resolver <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div></div>;
      })}</div>}
    </CardContent></Card>
  </div>;
}
