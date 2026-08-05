'use client';

import useSWR from 'swr';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la trazabilidad');
  return payload;
};

const money = (value: unknown) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(value || 0));
const date = (value: string | null) => value ? new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' }).format(new Date(value)) : 'Sin fecha';

type LedgerEvent = {
  event_id: string;
  event_at: string | null;
  origin: 'CANONICAL' | 'ERP';
  event_type: string;
  recognition_status: string;
  source_table: string;
  source_record_id: string;
  cost_center_code?: string | null;
  amount?: number | string | null;
  currency?: string | null;
  description?: string | null;
};

export default function FinanceTraceabilityPage() {
  const { data, error, isLoading } = useSWR('/api/finance/event-ledger', fetcher);
  const events: LedgerEvent[] = data?.events || [];
  const overview = data?.overview || {};

  return (
    <div className="space-y-6">
      <section className="border-b border-border/70 pb-6">
        <p className="text-sm font-medium text-muted-foreground">Finanzas · Evidencia unificada</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Libro de eventos</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Separa histórico canónico, compromisos y operación ERP sin modificar la data importada.</p>
      </section>

      {error ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error.message}</div> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="shadow-none"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Reconocido</p><p className="mt-1 text-2xl font-semibold">{money(overview.recognized)}</p></CardContent></Card>
        <Card className="shadow-none"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Comprometido</p><p className="mt-1 text-2xl font-semibold">{money(overview.committed)}</p></CardContent></Card>
        <Card className="shadow-none"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Pendiente</p><p className="mt-1 text-2xl font-semibold">{money(overview.pending)}</p></CardContent></Card>
        <Card className="shadow-none"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Eventos visibles</p><p className="mt-1 text-2xl font-semibold">{events.length}</p></CardContent></Card>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <div className="hidden grid-cols-[110px_120px_1fr_150px_130px] gap-4 border-b bg-muted/40 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground lg:grid">
          <span>Fecha</span><span>Origen</span><span>Evento</span><span>Monto</span><span>Estado</span>
        </div>
        {isLoading ? <p className="p-6 text-sm text-muted-foreground">Cargando eventos...</p> : null}
        {!isLoading && !events.length ? <p className="p-8 text-center text-sm text-muted-foreground">No hay eventos para mostrar.</p> : null}
        {events.map((event) => (
          <div key={event.event_id} className="grid gap-2 border-b px-4 py-4 last:border-0 lg:grid-cols-[110px_120px_1fr_150px_130px] lg:items-center lg:gap-4">
            <p className="text-sm">{date(event.event_at)}</p>
            <Badge variant={event.origin === 'CANONICAL' ? 'secondary' : 'outline'}>{event.origin}</Badge>
            <div><p className="font-medium">{event.description || event.event_type}</p><p className="text-xs text-muted-foreground">{event.source_table} · {event.cost_center_code || 'Sin centro'}</p></div>
            <p className="text-sm font-medium">{money(event.amount)}</p>
            <Badge variant="outline">{event.recognition_status}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
