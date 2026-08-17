'use client';

import useSWR from 'swr';
import { Activity, BadgeDollarSign, Clock3, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatePanel } from '@/components/ui/state-panel';

type Diagnostic = {
  epp_catalog_id: string;
  epp_type: string;
  brand: string | null;
  model: string | null;
  certification: string | null;
  expected_life_days: number | null;
  reference_unit_cost: number | null;
  assignments_count: number;
  completed_cycles: number;
  avg_observed_life_days: number | null;
  median_observed_life_days: number | null;
  avg_unit_cost: number | null;
  avg_cost_per_observed_day: number | null;
  failure_replacements: number;
  loss_replacements: number;
};

type Payload = {
  rows: Diagnostic[];
  summary: {
    catalogItems: number;
    comparableItems: number;
    observedCycles: number;
    failureReplacements: number;
    lossReplacements: number;
  };
  bestByType: Diagnostic[];
  methodology: { note: string };
};

const fetcher = async (url: string): Promise<Payload> => {
  const response = await fetch(url, { credentials: 'include' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'No fue posible cargar el diagnóstico');
  return data;
};

const money = (value: number | null) => value == null ? 'Sin dato' : new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
const decimal = (value: number | null, suffix = '') => value == null ? 'Sin dato' : `${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 }).format(value)}${suffix}`;

export default function EppDiagnosticsPage() {
  const { data, error, isLoading } = useSWR('/api/hse/epp/diagnostics', fetcher);
  const rows = data?.rows || [];
  const bestIds = new Set((data?.bestByType || []).map((row) => row.epp_catalog_id));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Prevención de riesgos · EPP</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Diagnóstico de durabilidad y costo</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Compara productos por vida útil observada y costo por día protegido. Un EPP más caro puede ser más eficiente si reduce reposiciones sin comprometer certificación ni seguridad.
        </p>
      </div>

      {error ? <StatePanel tone="error" title="No fue posible cargar el diagnóstico EPP" description={error.message} /> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><ShieldCheck className="h-4 w-4" />Productos catalogados</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{isLoading ? '—' : data?.summary.catalogItems ?? 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Activity className="h-4 w-4" />Con evidencia comparable</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{isLoading ? '—' : data?.summary.comparableItems ?? 0}</p><p className="mt-1 text-xs text-muted-foreground">Requieren ciclos cerrados y costo observado.</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Clock3 className="h-4 w-4" />Ciclos observados</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{isLoading ? '—' : data?.summary.observedCycles ?? 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><TriangleAlert className="h-4 w-4" />Recambios por falla</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{isLoading ? '—' : data?.summary.failureReplacements ?? 0}</p></CardContent></Card>
      </section>

      {!isLoading && !error && rows.length === 0 ? (
        <StatePanel tone="neutral" title="Aún no hay evidencia suficiente" description="Registra marca/modelo, costo y cierre de ciclos de uso. El diagnóstico aparecerá cuando exista evidencia real; MOTIL no inventará una recomendación de compra." />
      ) : null}

      {rows.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Comparación de productos</CardTitle>
            <CardDescription>{data?.methodology.note}</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="border-b text-left text-xs uppercase tracking-[0.08em] text-muted-foreground">
                <tr><th className="pb-3 pr-4">EPP</th><th className="pb-3 pr-4">Producto</th><th className="pb-3 pr-4">Costo</th><th className="pb-3 pr-4">Vida observada</th><th className="pb-3 pr-4">Costo/día</th><th className="pb-3 pr-4">Ciclos</th><th className="pb-3 pr-4">Fallas</th><th className="pb-3">Certificación</th></tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row) => (
                  <tr key={row.epp_catalog_id} className="align-top">
                    <td className="py-4 pr-4 font-medium">{row.epp_type}{bestIds.has(row.epp_catalog_id) ? <Badge className="ml-2">Mejor costo observado</Badge> : null}</td>
                    <td className="py-4 pr-4">{[row.brand, row.model].filter(Boolean).join(' · ') || 'Sin marca/modelo'}</td>
                    <td className="py-4 pr-4">{money(row.avg_unit_cost ?? row.reference_unit_cost)}</td>
                    <td className="py-4 pr-4">{decimal(row.avg_observed_life_days, ' días')}<div className="text-xs text-muted-foreground">Esperada: {row.expected_life_days == null ? 'Sin dato' : `${row.expected_life_days} días`}</div></td>
                    <td className="py-4 pr-4 font-medium"><span className="inline-flex items-center gap-1"><BadgeDollarSign className="h-4 w-4" />{money(row.avg_cost_per_observed_day)}</span></td>
                    <td className="py-4 pr-4">{row.completed_cycles}</td>
                    <td className="py-4 pr-4">{row.failure_replacements}</td>
                    <td className="py-4">{row.certification || 'Sin dato'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
