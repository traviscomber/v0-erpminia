'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, CircleDollarSign, FileSearch, Landmark, PackageSearch, ShieldCheck, Truck } from 'lucide-react';

type Row = Record<string, string | number | null>;
type Response = {
  overview?: Row | null;
  topAssets?: Row[];
  topProducts?: Row[];
  topSuppliers?: Row[];
  topCostCenters?: Row[];
  validation?: Row | null;
  recentEvents?: Row[];
  certification?: { origin: string; currency: string; sources: string[] };
};

const fetcher = async (url: string): Promise<Response> => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar Finanzas');
  return payload;
};

const money = (value: unknown) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(value || 0));
const number = (value: unknown) => new Intl.NumberFormat('es-CL').format(Number(value || 0));

function Ranking({ title, rows, labelKey, amountKey }: { title: string; rows: Row[]; labelKey: string; amountKey: string }) {
  const total = rows.reduce((sum, row) => sum + Number(row[amountKey] || 0), 0);
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {!rows.length ? <p className="text-sm text-muted-foreground">Sin datos canónicos vinculados.</p> : rows.map((row, index) => {
          const amount = Number(row[amountKey] || 0);
          const pct = total > 0 ? (amount / total) * 100 : 0;
          return (
            <div key={`${String(row[labelKey])}-${index}`} className="space-y-1.5">
              <div className="flex items-start justify-between gap-4 text-sm">
                <span className="min-w-0 truncate">{String(row[labelKey] || 'Sin identificar')}</span>
                <span className="shrink-0 font-medium tabular-nums">{money(amount)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-foreground/70" style={{ width: `${Math.max(2, pct)}%` }} /></div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default function FinanzasPage() {
  const { data, error, isLoading } = useSWR<Response>('/api/finance/executive', fetcher);
  const overview = data?.overview || {};
  const validationPassed = String(data?.validation?.status || '').toLowerCase() === 'passed';

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b border-border/70 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Finanzas · Fuente canónica certificada</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Control financiero</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Costos realizados y compromisos de compra separados, en CLP y trazables hasta el XLS de origen.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/finanzas/trazabilidad" className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-muted"><FileSearch className="h-4 w-4" />Trazabilidad</Link>
          <Link href="/dashboard/finanzas/centros" className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-muted"><Landmark className="h-4 w-4" />Centros</Link>
        </div>
      </section>

      {error ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error.message}</div> : null}
      {isLoading ? <p className="text-sm text-muted-foreground">Validando información financiera...</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="shadow-none"><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">Costo reconocido</p><p className="mt-1 text-2xl font-semibold">{money(overview.recognized_clp)}</p><p className="mt-1 text-xs text-muted-foreground">No incluye compromisos</p></div><CircleDollarSign className="h-5 w-5 text-muted-foreground" /></CardContent></Card>
        <Card className="shadow-none"><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">Compromisos OC</p><p className="mt-1 text-2xl font-semibold">{money(overview.committed_clp)}</p><p className="mt-1 text-xs text-muted-foreground">No se reconoce como gasto</p></div><Truck className="h-5 w-5 text-muted-foreground" /></CardContent></Card>
        <Card className="shadow-none"><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">Eventos certificados</p><p className="mt-1 text-2xl font-semibold">{number(overview.event_count)}</p><p className="mt-1 text-xs text-muted-foreground">100% canónicos</p></div><ShieldCheck className="h-5 w-5 text-muted-foreground" /></CardContent></Card>
        <Card className="shadow-none"><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">Validación</p><div className="mt-2"><Badge variant={validationPassed ? 'secondary' : 'outline'}>{validationPassed ? 'Aprobada' : 'Revisar'}</Badge></div><p className="mt-2 text-xs text-muted-foreground">CLP · origen · montos · duplicados</p></div>{validationPassed ? <CheckCircle2 className="h-5 w-5 text-muted-foreground" /> : <PackageSearch className="h-5 w-5 text-muted-foreground" />}</CardContent></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Ranking title="Activos con mayor costo reconocido" rows={data?.topAssets || []} labelKey="asset_name" amountKey="recognized_clp" />
        <Ranking title="Productos con mayor compromiso" rows={data?.topProducts || []} labelKey="product_name" amountKey="committed_clp" />
        <Ranking title="Proveedores con mayor compromiso" rows={data?.topSuppliers || []} labelKey="supplier_name" amountKey="committed_clp" />
        <Ranking title="Centros de costo con mayor compromiso" rows={data?.topCostCenters || []} labelKey="cost_center_code" amountKey="committed_clp" />
      </div>

      <Card className="shadow-none">
        <CardHeader className="pb-3"><CardTitle className="text-base">Auditoría reciente</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {(data?.recentEvents || []).slice(0, 10).map((event) => (
            <div key={String(event.event_id)} className="grid gap-1 border-b py-3 last:border-0 md:grid-cols-[120px_1fr_180px_140px] md:items-center">
              <Badge variant="outline" className="w-fit">{String(event.recognition_status) === 'recognized' ? 'Reconocido' : 'Comprometido'}</Badge>
              <div className="min-w-0"><p className="truncate text-sm font-medium">{String(event.description || 'Evento financiero')}</p><p className="text-xs text-muted-foreground">{String(event.source_table)} · fila {String(event.source_record_id)}</p></div>
              <p className="text-sm text-muted-foreground">{String(event.cost_center_code || 'Sin centro')}</p>
              <p className="text-right text-sm font-semibold tabular-nums">{money(event.amount)}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
