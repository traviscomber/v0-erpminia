'use client';

import useSWR from 'swr';
import { AlertTriangle, CheckCircle2, Clock3, Link2, Wrench } from 'lucide-react';
import { StatePanel } from '@/components/ui/state-panel';

type FreshnessStatus = 'fresh' | 'watch' | 'stale' | 'missing';
type Freshness = { through: string | null; ageDays: number | null; status: FreshnessStatus };
type Signal = {
  sourceReportId: string;
  assetCode: string | null;
  assetName: string | null;
  operationDate: string | null;
  equipmentStatusRaw: string | null;
  machineObservations: string | null;
  severity: 'critical' | 'warning';
  hasLinkedWorkOrder: boolean;
  activeWorkOrders: { id: string; number: string | null; status: string | null; priority: string | null; flowStatus: string | null }[];
  availability: null | { date: string | null; pct: number | null; unplannedDowntimeMinutes: number | null; validationStatus: string | null };
  action: string;
};
type Data = {
  freshness: { transport: Freshness; plant: Freshness; drilling: Freshness };
  sourcePolicy: Record<string, string>;
  drillingMaintenance: {
    pendingReviews: number;
    withoutWorkOrder: number;
    criticalWithoutWorkOrder: number;
    signals: Signal[];
    policy: string;
  };
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar confianza operacional');
  return payload;
};
const date = (value: string | null | undefined) => value ? new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' }).format(new Date(`${value}T12:00:00`)) : 'N/D';
const pct = (value: number | null | undefined) => value == null ? 'N/D' : `${Number(value).toLocaleString('es-CL', { maximumFractionDigits: 1 })}%`;

export function ProductionConfidencePanel() {
  const { data, error, isLoading } = useSWR<Data>('/api/produccion/inteligencia/confidence', fetcher, { revalidateOnFocus: false });
  if (error) return <StatePanel tone="warning" title="Confianza operacional no disponible" description={error.message} />;
  if (isLoading || !data) return <StatePanel tone="loading" title="Evaluando frescura y Mantención" description="Contrastando cortes de fuente y activos canónicos de Sondaje." />;

  const sources = [
    ['Transporte', data.freshness.transport],
    ['Planta', data.freshness.plant],
    ['Sondaje', data.freshness.drilling],
  ] as const;

  return <div className="space-y-4">
    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="border-b px-4 py-3"><h2 className="font-medium">Confianza de fuentes</h2><p className="mt-1 text-xs text-muted-foreground">La inteligencia distingue atraso de fuente de desviación operacional.</p></div>
      <div className="grid gap-px bg-border md:grid-cols-3">
        {sources.map(([label, source]) => <div key={label} className="bg-card p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-base font-medium">{date(source.through)}</p></div><FreshnessIcon status={source.status}/></div><p className="mt-2 text-xs text-muted-foreground">{source.ageDays == null ? 'Sin corte disponible' : `${source.ageDays} días desde el último dato · ${freshnessLabel(source.status)}`}</p></div>)}
      </div>
    </section>

    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="flex items-end justify-between gap-4 border-b px-4 py-3"><div><h2 className="font-medium">Sondaje × Mantención</h2><p className="mt-1 text-xs text-muted-foreground">Observaciones de equipos vinculadas por activo canónico, no por nombre.</p></div><div className="text-right"><p className="text-sm font-medium">{data.drillingMaintenance.pendingReviews} pendientes</p><p className="text-xs text-muted-foreground">{data.drillingMaintenance.withoutWorkOrder} sin OT</p></div></div>
      {data.drillingMaintenance.signals.length === 0 ? <div className="flex items-center gap-3 px-4 py-4"><CheckCircle2 className="h-5 w-5 text-muted-foreground"/><div><p className="text-sm font-medium">Sin observaciones pendientes</p><p className="text-xs text-muted-foreground">No hay señales de Sondaje esperando decisión de Mantención.</p></div></div> : <div className="divide-y">{data.drillingMaintenance.signals.map(signal => <div key={signal.sourceReportId} className="grid gap-3 px-4 py-4 lg:grid-cols-[220px_1fr_1fr]"><div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"/><div><p className="text-sm font-medium">{signal.assetName || signal.assetCode || 'Equipo'}</p><p className="mt-1 text-xs text-muted-foreground">{signal.equipmentStatusRaw || 'Estado no informado'} · {date(signal.operationDate)}</p></div></div><div><p className="text-sm text-muted-foreground">{signal.machineObservations || 'Observación operacional sin detalle adicional.'}</p><p className="mt-2 text-xs text-muted-foreground">Disponibilidad reciente: {signal.availability ? `${pct(signal.availability.pct)} (${date(signal.availability.date)})` : 'sin evidencia diaria'}</p></div><div><p className="text-sm"><span className="font-medium">Acción: </span>{signal.action}</p><p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">{signal.hasLinkedWorkOrder ? <><Link2 className="h-3.5 w-3.5"/>OT vinculada/activa</> : <><Wrench className="h-3.5 w-3.5"/>Sin OT vinculada</>}</p></div></div>)}</div>}
      <div className="border-t px-4 py-3 text-xs text-muted-foreground">{data.drillingMaintenance.policy}</div>
    </section>
  </div>;
}

function FreshnessIcon({ status }: { status: FreshnessStatus }) {
  if (status === 'fresh') return <CheckCircle2 className="h-5 w-5 text-muted-foreground"/>;
  if (status === 'watch') return <Clock3 className="h-5 w-5 text-muted-foreground"/>;
  return <AlertTriangle className="h-5 w-5 text-muted-foreground"/>;
}
function freshnessLabel(status: FreshnessStatus) {
  return status === 'fresh' ? 'actual' : status === 'watch' ? 'usar con cautela' : status === 'stale' ? 'atrasada' : 'sin fuente';
}
