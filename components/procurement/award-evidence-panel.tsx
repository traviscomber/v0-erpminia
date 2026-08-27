'use client';

import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar evidencia de adjudicación');
  return payload;
};

const money = (value: unknown, currency = 'CLP') => {
  try {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency, maximumFractionDigits: currency === 'CLP' ? 0 : 2 }).format(Number(value || 0));
  } catch {
    return `${currency} ${Number(value || 0).toLocaleString('es-CL')}`;
  }
};

type EvidenceRow = {
  id: string;
  quotation_number: string;
  request_id: string;
  currency: string;
  total_amount: number;
  lead_time_days?: number | null;
  payment_terms?: string | null;
  supplier?: { id: string; tax_id: string; legal_name: string; trade_name?: string | null } | null;
  request?: { request_number?: string | null; priority?: string | null; required_date?: string | null } | null;
  performance?: {
    operational_score?: number | null;
    evidence_dimensions?: number | null;
    delivery_score?: number | null;
    delivery_scored_orders?: number | null;
    quality_score?: number | null;
    quantity_received?: number | null;
    invoice_score?: number | null;
    invoice_scored_count?: number | null;
    returns_count?: number | null;
  } | null;
};

export function AwardEvidencePanel() {
  const { data, error, isLoading } = useSWR('/api/procurement/award-evidence', fetcher);
  const rows: EvidenceRow[] = data?.evidence || [];

  const groups = new Map<string, EvidenceRow[]>();
  for (const row of rows) {
    const current = groups.get(row.request_id) || [];
    current.push(row);
    groups.set(row.request_id, current);
  }

  if (isLoading) return <Card className="shadow-none"><CardContent className="p-5 text-sm text-muted-foreground">Cargando evidencia para adjudicación…</CardContent></Card>;
  if (error) return <Card className="shadow-none"><CardContent className="p-5 text-sm text-destructive">{error.message}</CardContent></Card>;
  if (!rows.length) return null;

  return <Card className="shadow-none">
    <CardHeader>
      <CardTitle>Decisión de adjudicación</CardTitle>
      <CardDescription>Precio, plazo y desempeño se muestran por separado. Motil no combina estos factores en un ranking oculto ni adjudica automáticamente.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-5">
      {Array.from(groups.entries()).map(([requestId, quotes]) => {
        const request = quotes[0]?.request;
        const currencies = new Set(quotes.map((row) => row.currency || 'CLP'));
        const comparablePrice = currencies.size === 1;
        const minPrice = comparablePrice ? Math.min(...quotes.map((row) => Number(row.total_amount || 0))) : null;
        const leadTimes = quotes.map((row) => row.lead_time_days).filter((value): value is number => Number.isFinite(value));
        const minLead = leadTimes.length ? Math.min(...leadTimes) : null;

        return <section key={requestId} className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><p className="font-medium">{request?.request_number || 'Solicitud'}</p><p className="text-xs text-muted-foreground">{quotes.length} cotización(es) recibida(s){request?.required_date ? ` · requerida ${request.required_date}` : ''}</p></div>
            {!comparablePrice ? <Badge variant="outline">Monedas distintas: no comparar precio directo</Badge> : null}
          </div>
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {quotes.map((quote) => {
              const p = quote.performance;
              const supplierName = quote.supplier?.trade_name || quote.supplier?.legal_name || 'Proveedor';
              return <article key={quote.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3"><div><p className="font-medium">{supplierName}</p><p className="text-xs text-muted-foreground">{quote.quotation_number} · {quote.supplier?.tax_id || ''}</p></div><div className="flex flex-wrap justify-end gap-1">{minPrice != null && Number(quote.total_amount || 0) === minPrice ? <Badge variant="secondary">Menor precio</Badge> : null}{minLead != null && Number(quote.lead_time_days) === minLead ? <Badge variant="secondary">Menor plazo</Badge> : null}</div></div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-muted-foreground">Precio</p><p className="font-medium">{money(quote.total_amount, quote.currency)}</p></div><div><p className="text-xs text-muted-foreground">Plazo</p><p className="font-medium">{quote.lead_time_days == null ? 'Sin dato' : `${quote.lead_time_days} días`}</p></div><div><p className="text-xs text-muted-foreground">Score operacional</p><p className="font-medium">{p?.operational_score == null ? 'Sin evidencia' : `${Number(p.operational_score).toFixed(0)}/100`}</p></div><div><p className="text-xs text-muted-foreground">Evidencia</p><p className="font-medium">{Number(p?.evidence_dimensions || 0)}/3 dimensiones</p></div></div>
                <div className="mt-3 border-t pt-3 text-xs text-muted-foreground"><p>Entrega: {p?.delivery_score == null ? '—' : `${Number(p.delivery_score).toFixed(0)}%`} · {Number(p?.delivery_scored_orders || 0)} OC</p><p>Calidad: {p?.quality_score == null ? '—' : `${Number(p.quality_score).toFixed(0)}%`} · {Number(p?.quantity_received || 0)} unidades recibidas</p><p>Factura: {p?.invoice_score == null ? '—' : `${Number(p.invoice_score).toFixed(0)}%`} · {Number(p?.invoice_scored_count || 0)} factura(s)</p><p>Devoluciones: {Number(p?.returns_count || 0)}</p></div>
                {quote.payment_terms ? <p className="mt-3 text-xs text-muted-foreground">Pago: {quote.payment_terms}</p> : null}
              </article>;
            })}
          </div>
        </section>;
      })}
    </CardContent>
  </Card>;
}
