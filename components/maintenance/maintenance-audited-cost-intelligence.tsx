'use client';

import useSWR from 'swr';
import { AlertCircle, CheckCircle2, DatabaseZap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la inteligencia auditada de costos');
  return payload;
};

const number = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const amount = (value: unknown) => number(value).toLocaleString('es-CL', { maximumFractionDigits: 0 });

function RankingCard({ title, rows, label }: { title: string; rows: any[]; label: (row: any) => string }) {
  return <Card className="shadow-none">
    <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
    <CardContent className="space-y-2">
      {rows.length === 0 ? <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Sin cierres auditados para esta dimensión.</p> : rows.map((row, index) => <div key={`${title}-${index}`} className="flex items-center justify-between gap-4 rounded-lg border p-3">
        <div><p className="text-sm font-medium">{label(row)}</p><p className="text-xs text-muted-foreground">{number(row.audited_work_orders)} OT auditada(s)</p></div>
        <div className="text-right"><p className="font-medium tabular-nums">{amount(row.total_cost)}</p><p className="text-xs text-muted-foreground">costo registrado</p></div>
      </div>)}
    </CardContent>
  </Card>;
}

export function MaintenanceAuditedCostIntelligence() {
  const { data, error, isLoading } = useSWR('/api/maintenance/cost-intelligence', fetcher, { revalidateOnFocus: false });
  const summary = data?.summary || {};
  const audited = number(summary.audited_work_orders);
  const completed = number(summary.completed_work_orders);
  const withoutSnapshot = number(summary.completed_without_snapshot);
  const coverage = summary.audited_coverage_percent == null ? null : number(summary.audited_coverage_percent);

  if (isLoading) return <Card className="shadow-none"><CardContent className="p-6 text-sm text-muted-foreground">Cargando cierres auditados…</CardContent></Card>;
  if (error) return <Card className="border-destructive/30 shadow-none"><CardContent className="flex gap-2 p-6 text-sm text-destructive"><AlertCircle className="h-4 w-4" />{error.message}</CardContent></Card>;

  return <section className="space-y-4">
    <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
      <div><p className="text-sm font-medium text-muted-foreground">Fuente operacional · snapshots de cierre</p><h2 className="text-2xl font-semibold tracking-tight">Costo auditado de órdenes de trabajo</h2><p className="mt-1 max-w-3xl text-sm text-muted-foreground">Sólo usa el último snapshot trazable de cada OT cerrada. El ledger histórico importado se mantiene separado más abajo y no contamina estos resultados.</p></div>
      <Badge variant="outline" className="w-fit">Cobertura {coverage == null ? '—' : `${coverage.toFixed(1)}%`}</Badge>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="shadow-none"><CardHeader className="pb-2"><CardTitle className="text-sm">OT auditadas</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{audited}</p><p className="text-xs text-muted-foreground">de {completed} completadas</p></CardContent></Card>
      <Card className="shadow-none"><CardHeader className="pb-2"><CardTitle className="text-sm">Sin snapshot</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{withoutSnapshot}</p><p className="text-xs text-muted-foreground">legado no usado para ranking monetario</p></CardContent></Card>
      <Card className="shadow-none"><CardHeader className="pb-2"><CardTitle className="text-sm">Costo auditado</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold tabular-nums">{amount(summary.audited_total_cost)}</p><p className="text-xs text-muted-foreground">suma de cierres con evidencia</p></CardContent></Card>
      <Card className="shadow-none"><CardHeader className="pb-2"><CardTitle className="text-sm">Desglose</CardTitle></CardHeader><CardContent><p className="text-sm">Repuestos {amount(summary.parts_cost)}</p><p className="text-sm">Mano de obra {amount(summary.labor_cost)}</p><p className="text-sm">Servicios {amount(summary.external_cost)}</p></CardContent></Card>
    </div>

    {audited === 0 ? <Card className="shadow-none"><CardContent className="flex gap-3 p-6"><DatabaseZap className="mt-0.5 h-5 w-5 text-muted-foreground" /><div><p className="font-medium">Aún no hay cierres auditados con snapshot</p><p className="mt-1 text-sm text-muted-foreground">Las 21 OT históricas completadas pertenecen al legado y no tienen evidencia suficiente para afirmar costo real por activo, centro de costo o causa. La inteligencia empezará a poblarse automáticamente con los próximos cierres válidos.</p></div></CardContent></Card> : <>
      <div className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4" />Los rankings siguientes son sumas observadas, no benchmarks ni scores de desempeño.</div>
      <div className="grid gap-4 xl:grid-cols-2">
        <RankingCard title="Costo por activo" rows={data?.byAsset || []} label={(row) => row.asset_name || row.asset_code || 'Activo sin nombre'} />
        <RankingCard title="Costo por centro de costo" rows={data?.byCostCenter || []} label={(row) => [row.cost_center_code, row.cost_center_name].filter(Boolean).join(' · ') || 'Centro sin nombre'} />
        <RankingCard title="Costo por tipo de intervención" rows={data?.byWorkType || []} label={(row) => row.work_type || 'Sin tipo'} />
        <RankingCard title="Costo por causa registrada" rows={data?.byRootCause || []} label={(row) => row.root_cause || 'Sin causa'} />
      </div>
    </>}
  </section>;
}
