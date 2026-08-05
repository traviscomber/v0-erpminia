'use client';

import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la trazabilidad');
  return payload;
};

const money = (value: unknown) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(value || 0));
const date = (value: unknown) => value ? new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' }).format(new Date(String(value))) : 'Sin fecha';

type LedgerEvent = {
  event_id: string;
  event_at: string | null;
  recognition_status: string;
  source_table: string;
  source_record_id: string;
  amount?: number | string | null;
  description?: string | null;
};

export default function FinanceTraceabilityPage() {
  const params = useSearchParams();
  const q = params.get('q') || '';
  const status = params.get('status') || 'all';
  const url = `/api/finance/event-ledger?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}`;
  const { data, error, isLoading } = useSWR(url, fetcher);
  const events: LedgerEvent[] = data?.events || [];

  return (
    <div className="space-y-6">
      <section className="border-b pb-5">
        <p className="text-sm text-muted-foreground">Finanzas · Evidencia canónica</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Trazabilidad</h1>
        <p className="mt-2 text-sm text-muted-foreground">Cada monto está en CLP y conserva su tabla y registro de origen.</p>
        <div className="mt-3 flex gap-2"><Badge variant="secondary">CANONICAL</Badge><Badge variant="outline">CLP</Badge></div>
      </section>

      {q ? <div className="rounded-lg border p-3 text-sm">Filtro activo: <span className="font-medium">{q}</span></div> : null}
      {error ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error.message}</div> : null}
      {isLoading ? <p className="text-sm text-muted-foreground">Cargando registros...</p> : null}

      <div className="overflow-hidden rounded-lg border">
        <div className="hidden grid-cols-[110px_130px_1fr_150px] gap-4 border-b bg-muted/40 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground lg:grid">
          <span>Fecha</span><span>Estado</span><span>Origen</span><span>Monto</span>
        </div>
        {!isLoading && !events.length ? <p className="p-8 text-center text-sm text-muted-foreground">No hay registros para mostrar.</p> : null}
        {events.map((event) => (
          <div key={event.event_id} className="grid gap-2 border-b px-4 py-4 last:border-0 lg:grid-cols-[110px_130px_1fr_150px] lg:items-center lg:gap-4">
            <p className="text-sm">{date(event.event_at)}</p>
            <Badge variant="outline" className="w-fit">{event.recognition_status === 'recognized' ? 'Reconocido' : 'Comprometido'}</Badge>
            <div className="min-w-0"><p className="truncate text-sm font-medium">{event.description || 'Evento financiero'}</p><p className="text-xs text-muted-foreground">{event.source_table} · fila {event.source_record_id}</p></div>
            <p className="text-sm font-semibold tabular-nums lg:text-right">{money(event.amount)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
