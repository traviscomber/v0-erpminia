'use client';

import useSWR from 'swr';
import { AlertTriangle, CheckCircle2, Gauge, TrendingUp } from 'lucide-react';
import { StatePanel } from '@/components/ui/state-panel';

type MineRow = {
  key: string;
  mineName: string;
  actualTons: number;
  plannedTons: number;
  expectedTonsToCutoff: number;
  observedVsExpectedPct: number | null;
};

type ProductionData = {
  periodStart: string | null;
  transportThrough: string | null;
  sourceCoverage: { elapsedTransportDays: number; totalPlanDays: number; transportPlanFraction: number };
  mines: MineRow[];
};

type HealthDomain = { key: string; status: 'healthy' | 'watch' | 'critical' | 'unknown' };
type HealthData = { domains: HealthDomain[] };

type ForecastRow = {
  key: string;
  mineName: string;
  actualTons: number;
  plannedTons: number;
  projectedTons: number | null;
  projectedVsPlanPct: number | null;
  gapToPlan: number | null;
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la proyección');
  return payload;
};

const n = (value: number, digits = 0) => value.toLocaleString('es-CL', { maximumFractionDigits: digits });
const pct = (value: number | null) => value === null ? '—' : `${n(value, 1)}%`;

export function ProductionForecastPanel() {
  const production = useSWR<ProductionData>('/api/produccion/inteligencia', fetcher, { revalidateOnFocus: false });
  const health = useSWR<HealthData>('/api/data-quality/health', fetcher, { revalidateOnFocus: false });

  if (production.error || health.error) {
    return <StatePanel tone="error" title="No fue posible calcular forecast" description="La proyección se omite si falta alguna fuente necesaria." />;
  }
  if (production.isLoading || health.isLoading || !production.data || !health.data) {
    return <StatePanel tone="neutral" title="Calculando forecast operacional" description="Validando plan, corte real y confianza de fuente." />;
  }

  const productionData = production.data;
  const healthData = health.data;
  const prodHealth = healthData.domains.find((domain) => domain.key === 'production');
  const confidence = prodHealth?.status || 'unknown';
  const canProject = confidence === 'healthy' && productionData.sourceCoverage.elapsedTransportDays >= 3;

  const rows: ForecastRow[] = productionData.mines
    .filter((mine) => mine.plannedTons > 0)
    .map((mine) => {
      if (!canProject || productionData.sourceCoverage.elapsedTransportDays <= 0) {
        return { key: mine.key, mineName: mine.mineName, actualTons: mine.actualTons, plannedTons: mine.plannedTons, projectedTons: null, projectedVsPlanPct: null, gapToPlan: null };
      }
      const dailyRate = mine.actualTons / productionData.sourceCoverage.elapsedTransportDays;
      const projectedTons = dailyRate * productionData.sourceCoverage.totalPlanDays;
      const projectedVsPlanPct = mine.plannedTons > 0 ? (projectedTons / mine.plannedTons) * 100 : null;
      const gapToPlan = projectedTons - mine.plannedTons;
      return { key: mine.key, mineName: mine.mineName, actualTons: mine.actualTons, plannedTons: mine.plannedTons, projectedTons, projectedVsPlanPct, gapToPlan };
    });

  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="flex flex-col gap-3 border-b px-4 py-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Forecast operacional V1</p>
          <h2 className="mt-1 text-lg font-medium">Proyección de cierre de mes</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Extrapolación lineal del ritmo observado. No usa ML ni supone causalidad; se habilita sólo con fuente de Producción saludable.</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {canProject ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <span className="font-medium">{canProject ? 'Proyección habilitada' : 'Proyección suspendida'}</span>
        </div>
      </div>

      {!canProject ? (
        <div className="flex gap-3 px-4 py-5">
          <Gauge className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Confianza insuficiente para proyectar</p>
            <p className="mt-1 text-sm text-muted-foreground">Data Health clasifica Producción como {confidence}. Actualiza Transporte, Planta y Sondaje antes de usar una cifra de cierre mensual como decisión operacional.</p>
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="px-4 py-5 text-sm text-muted-foreground">No existen líneas de mina con plan comparable para proyectar.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/30 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Mina</th>
                <th className="px-4 py-3 text-right">Observado</th>
                <th className="px-4 py-3 text-right">Proyección cierre</th>
                <th className="px-4 py-3 text-right">Plan mes</th>
                <th className="px-4 py-3 text-right">Proyección / plan</th>
                <th className="px-4 py-3 text-right">Brecha proyectada</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.key}>
                  <td className="px-4 py-3 font-medium">{row.mineName}</td>
                  <td className="px-4 py-3 text-right">{n(row.actualTons, 1)} t</td>
                  <td className="px-4 py-3 text-right">{row.projectedTons === null ? '—' : `${n(row.projectedTons, 1)} t`}</td>
                  <td className="px-4 py-3 text-right">{n(row.plannedTons, 1)} t</td>
                  <td className="px-4 py-3 text-right">{pct(row.projectedVsPlanPct)}</td>
                  <td className="px-4 py-3 text-right">{row.gapToPlan === null ? '—' : `${row.gapToPlan >= 0 ? '+' : ''}${n(row.gapToPlan, 1)} t`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex gap-2 border-t px-4 py-3 text-xs text-muted-foreground">
        <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>Regla: ritmo promedio observado = toneladas acumuladas / días cubiertos por TM; proyección = ritmo promedio × días del plan. Se suspende si Data Health no está en estado saludable.</p>
      </div>
    </section>
  );
}
