'use client';

import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar aprendizaje de adjudicaciones');
  return payload;
};

type Outcome = {
  decision_id: string;
  order_number?: string | null;
  primary_reason: string;
  is_lowest_price?: boolean | null;
  is_fastest_delivery?: boolean | null;
  delivered_on_time?: boolean | null;
  delivery_variance_days?: number | null;
  acceptance_rate_pct?: number | null;
  clean_invoice_rate_pct?: number | null;
  outcome_state: string;
};

const reasonLabel: Record<string, string> = {
  price: 'Precio',
  lead_time: 'Plazo',
  performance: 'Desempeño histórico',
  urgency: 'Urgencia operacional',
  commercial_terms: 'Condiciones comerciales',
  continuity: 'Continuidad',
  other: 'Otro',
};

export function AwardOutcomeLearning() {
  const { data, error, isLoading } = useSWR('/api/procurement/award-outcomes', fetcher);
  const outcomes: Outcome[] = data?.outcomes || [];

  return <Card className="shadow-none">
    <CardHeader>
      <CardTitle>Aprendizaje de adjudicaciones</CardTitle>
      <CardDescription>Compara la decisión registrada con el resultado real. Motil no convierte estos resultados en un score de “acierto”.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-3">
      {isLoading ? <p className="text-sm text-muted-foreground">Cargando resultados...</p> : null}
      {error ? <p className="text-sm text-destructive">{error.message}</p> : null}
      {!isLoading && !error && outcomes.length === 0 ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Aún no hay adjudicaciones operativas con resultado para analizar.</p> : null}
      {outcomes.map((row) => <div key={row.decision_id} className="rounded-lg border p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div><p className="font-medium">{row.order_number || 'OC pendiente'}</p><p className="text-xs text-muted-foreground">Motivo: {reasonLabel[row.primary_reason] || row.primary_reason}</p></div>
          <Badge variant="outline">{row.outcome_state === 'closed' ? 'Cerrada' : row.outcome_state === 'in_progress' ? 'En progreso' : 'Esperando resultado'}</Badge>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div><p className="text-xs text-muted-foreground">Precio elegido</p><p className="font-medium">{row.is_lowest_price == null ? 'No comparable' : row.is_lowest_price ? 'Menor precio' : 'No fue el menor'}</p></div>
          <div><p className="text-xs text-muted-foreground">Plazo elegido</p><p className="font-medium">{row.is_fastest_delivery == null ? 'Sin comparación' : row.is_fastest_delivery ? 'Menor plazo' : 'No fue el menor'}</p></div>
          <div><p className="text-xs text-muted-foreground">Entrega real</p><p className="font-medium">{row.delivered_on_time == null ? 'Sin resultado' : row.delivered_on_time ? 'A tiempo' : `${Math.max(0, Number(row.delivery_variance_days || 0))} día(s) tarde`}</p></div>
          <div><p className="text-xs text-muted-foreground">Recepción / factura</p><p className="font-medium">{row.acceptance_rate_pct == null ? '—' : `${Number(row.acceptance_rate_pct).toFixed(0)}% aceptado`} · {row.clean_invoice_rate_pct == null ? '—' : `${Number(row.clean_invoice_rate_pct).toFixed(0)}% match limpio`}</p></div>
        </div>
      </div>)}
    </CardContent>
  </Card>;
}
