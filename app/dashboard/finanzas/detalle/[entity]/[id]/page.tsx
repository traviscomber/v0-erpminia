'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar el detalle financiero');
  return payload;
};

const money = (value: unknown) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(value || 0));
const number = (value: unknown) => new Intl.NumberFormat('es-CL').format(Number(value || 0));
const date = (value: unknown) => value ? new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' }).format(new Date(String(value))) : 'Sin fecha';

const labels: Record<string, string> = {
  asset: 'Activo',
  product: 'Producto',
  supplier: 'Proveedor',
  'cost-center': 'Centro de costo',
};

export default function CertifiedFinanceDetailPage() {
  const params = useParams<{ entity: string; id: string }>();
  const entity = params.entity;
  const id = decodeURIComponent(params.id);
  const { data, error, isLoading } = useSWR(`/api/finance/certified/${entity}/${encodeURIComponent(id)}`, fetcher);
  const summary = data?.data || {};

  return (
    <div className="space-y-6">
      <section className="border-b pb-5">
        <p className="text-sm text-muted-foreground">Finanzas · {labels[entity] || 'Entidad'}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{id}</h1>
        <div className="mt-3 flex items-center gap-2">
          <Badge variant="secondary">CANONICAL</Badge>
          <Badge variant="outline">CLP</Badge>
        </div>
      </section>

      {error ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error.message}</div> : null}
      {isLoading ? <p className="text-sm text-muted-foreground">Cargando detalle...</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-none"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Costo reconocido</p><p className="mt-1 text-xl font-semibold">{money(summary.recognized_clp)}</p></CardContent></Card>
        <Card className="shadow-none"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Comprometido</p><p className="mt-1 text-xl font-semibold">{money(summary.committed_clp)}</p></CardContent></Card>
        <Card className="shadow-none"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Eventos</p><p className="mt-1 text-xl font-semibold">{number(Number(summary.recognized_event_count || 0) + Number(summary.committed_event_count || 0))}</p></CardContent></Card>
        <Card className="shadow-none"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Período</p><p className="mt-1 text-sm font-medium">{date(summary.first_event_at)}</p><p className="text-xs text-muted-foreground">hasta {date(summary.last_event_at)}</p></CardContent></Card>
      </div>

      <div className="rounded-lg border p-4 text-sm">
        <p className="font-medium">Lectura correcta</p>
        <p className="mt-1 text-muted-foreground">El costo reconocido y el compromiso de compra son conceptos separados y nunca se suman automáticamente.</p>
      </div>

      <Link href={`/dashboard/finanzas/trazabilidad?q=${encodeURIComponent(id)}`} className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium hover:bg-muted">Ver registros de origen</Link>
    </div>
  );
}
