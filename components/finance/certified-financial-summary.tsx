'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { Card, CardContent } from '@/components/ui/card';

type Entity = 'asset' | 'product' | 'supplier' | 'cost-center';

type Summary = {
  recognized_event_count?: number | string | null;
  committed_event_count?: number | string | null;
  recognized_clp?: number | string | null;
  committed_clp?: number | string | null;
  first_event_at?: string | null;
  last_event_at?: string | null;
};

type Response = {
  data?: Summary;
};

const fetcher = async (url: string): Promise<Response> => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar el resumen financiero');
  return payload;
};

const money = (value: unknown) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const number = (value: unknown) => new Intl.NumberFormat('es-CL').format(Number(value || 0));

export function CertifiedFinancialSummary({ entity, id }: { entity: Entity; id: string }) {
  const { data, error, isLoading } = useSWR<Response>(
    id ? `/api/finance/certified/${entity}/${encodeURIComponent(id)}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando cifras certificadas...</p>;
  }

  if (error) {
    return <p className="text-sm text-destructive">No fue posible cargar las cifras certificadas.</p>;
  }

  const summary = data?.data || {};
  const eventCount = Number(summary.recognized_event_count || 0) + Number(summary.committed_event_count || 0);

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-semibold">Resumen financiero certificado</h2>
          <p className="text-sm text-muted-foreground">Origen canónico · CLP · reconocido y comprometido separados.</p>
        </div>
        <Link href="/dashboard/finanzas/trazabilidad" className="text-sm font-medium hover:underline">
          Ver registros de origen
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="shadow-none">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Costo reconocido</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{money(summary.recognized_clp)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Compromisos de compra</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{money(summary.committed_clp)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Eventos certificados</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{number(eventCount)}</p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
