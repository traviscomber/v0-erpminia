'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { Activity, AlertTriangle, ArrowRight, Drill, Factory, Gauge, PackageCheck, Target, Truck, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader, PageHeaderActions, PageHeaderContent, PageHeaderDescription, PageHeaderEyebrow, PageHeaderTitle } from '@/components/ui/page-header';
import { StatePanel } from '@/components/ui/state-panel';

type CanonicalOverview = {
  batches: Array<{ id: string; source_type: string; source_file: string; period_start: string | null; period_end: string | null; status: string; normalization_rule_version: string | null; created_at: string }>;
  counts: { materialMovements: number; plantShifts: number; metallurgyResults: number; metallurgyAssayed: number; metallurgyPartial: number; metallurgyNoAssay: number; concentrateShipments: number; concentrateAllocations: number; reconciliationPending: number; drillingReports: number; drillingHoles: number };
  freshness: { latestMaterialMovementDate: string | null; latestPlantOperationDate: string | null; latestShipmentDate: string | null; latestDrillingDate: string | null };
  currentPeriod: null | {
    periodStart: string;
    dataThrough: string;
    movementRows: number;
    movementTons: number;
    plantShifts: number;
    treatedTons: number;
    avgHeadGradePct: number | null;
    avgRecoveryPct: number | null;
    fineMetalTons: number;
    plan: null | {
      code: string;
      periodStart: string;
      periodEnd: string;
      mineralToPlantTons: number;
      targetCuGradePct: number;
      plannedDrillingM: number;
      plannedAdvanceM: number;
      mineralProgressPct: number | null;
    };
  };
  drilling: null | { meters:number; rigs:number; operators:number; outOfServiceReports:number; meterCapturePct:number };
  dispatch: { status: 'available' | 'pending_reconciliation'; wetMetricTons: number; allocatedWetMetricTons: number; allocationCoveragePct: number; note: string };
  legacy: { produccionKpiIsCanonical: boolean; note: string };
};

const fetcher = async (url: string): Promise<CanonicalOverview> => {
  const response = await fetch(url, { credentials: 'include' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'No fue posible cargar Producción canónica');
  return data;
};

function formatDate(value: string | null) {
  if (!value) return 'Sin dato';
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' }).format(new Date(`${value}T12:00:00`));
}
function formatTons(value: number, digits = 0) { return `${value.toLocaleString('es-CL', { maximumFractionDigits: digits })} t`; }
function formatPct(value: number | null | undefined, digits = 1) { return value === null || value === undefined ? '—' : `${value.toLocaleString('es-CL', { maximumFractionDigits: digits })}%`; }
function periodLabel(value: string | undefined) {
  if (!value) return 'Período actual';
  return new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
}

const domains = [
  { href: '/dashboard/produccion/transporte-mineral', title: 'Transporte de Mineral', description: 'Movimientos mina → planta y trazabilidad.' },
  { href: '/dashboard/produccion/planta-metalurgia', title: 'Planta / Metalurgia', description: 'Turnos, tratamiento, leyes y recuperación.' },
  { href: '/dashboard/produccion/geologia', title: 'Geología', description: 'Sectores, muestreo y continuidad geológica.' },
  { href: '/dashboard/produccion/topografia', title: 'Topografía', description: 'Levantamientos, frentes y avances.' },
  { href: '/dashboard/produccion/quimica', title: 'Química', description: 'Muestras y resultados analíticos.' },
  { href: '/dashboard/produccion/sondaje', title: 'Sondaje', description: 'Metros, equipos, operadores, disponibilidad y plan.' },
];

export function ProduccionDashboard() {
  const { data, error, isLoading, mutate } = useSWR('/api/produccion/canonical-overview', fetcher);
  const counts = data?.counts ?? { materialMovements: 0, plantShifts: 0, metallurgyResults: 0, metallurgyAssayed: 0, metallurgyPartial: 0, metallurgyNoAssay: 0, concentrateShipments: 0, concentrateAllocations: 0, reconciliationPending: 0, drillingReports: 0, drillingHoles: 0 };
  const period = data?.currentPeriod;
  const plan = period?.plan;
  const hasCanonicalData = counts.materialMovements > 0 || counts.plantShifts > 0 || counts.drillingReports > 0;

  const executiveMetrics = [
    { label: 'Mineral transportado', value: period ? formatTons(period.movementTons, 1) : '—', detail: plan ? `${formatPct(plan.mineralProgressPct)} del plan mensual` : `${period?.movementRows ?? 0} movimientos`, icon: Truck },
    { label: 'Tratado en planta', value: period ? formatTons(period.treatedTons, 1) : '—', detail: `${period?.plantShifts ?? 0} turnos registrados`, icon: Factory },
    { label: 'Ley cabeza Cu', value: formatPct(period?.avgHeadGradePct, 3), detail: plan ? `Plan ${formatPct(plan.targetCuGradePct, 2)}` : 'Sin meta mensual cargada', icon: Gauge },
    { label: 'Recuperación', value: formatPct(period?.avgRecoveryPct, 1), detail: 'Promedio de registros con dato', icon: Activity },
    { label: 'Sondaje planificado', value: plan ? `${plan.plannedDrillingM.toLocaleString('es-CL', { maximumFractionDigits: 0 })} m` : '—', detail: data?.freshness.latestDrillingDate ? `Actual histórico hasta ${formatDate(data.freshness.latestDrillingDate)}` : 'Sin actual de sondaje', icon: Drill },
  ];

  return <div className="space-y-6">
    <PageHeader>
      <PageHeaderContent>
        <PageHeaderEyebrow>Operaciones · {periodLabel(period?.periodStart)}</PageHeaderEyebrow>
        <PageHeaderTitle>Producción</PageHeaderTitle>
        <PageHeaderDescription>{period ? `Actual acumulado con datos hasta ${formatDate(period.dataThrough)}. PLAN y ACTUAL se mantienen separados.` : 'Estado productivo canónico: mina, planta, metalurgia, sondajes y despachos.'}</PageHeaderDescription>
      </PageHeaderContent>
      <PageHeaderActions><Button asChild><Link href="/dashboard/produccion/ingreso-datos"><Upload className="h-4 w-4" />Ingresar datos</Link></Button></PageHeaderActions>
    </PageHeader>

    {error ? <StatePanel tone="error" title="No fue posible cargar Producción" description="Reintenta la consulta." actions={<Button variant="outline" onClick={() => void mutate()}>Reintentar</Button>} className="min-h-0 py-5" /> : null}
    {!error && !isLoading && !hasCanonicalData ? <StatePanel tone="neutral" title="Sin datos productivos cargados" description="MOTIL mostrará información cuando exista una fuente operacional validada." /> : null}

    <section aria-label="Resumen ejecutivo de producción" className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-5">
      {executiveMetrics.map((metric) => { const Icon = metric.icon; return <div key={metric.label} className="bg-card px-5 py-4"><div className="flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{metric.label}</p><Icon className="h-4 w-4 text-muted-foreground" /></div><p className="mt-2 text-2xl font-semibold tracking-tight">{isLoading ? '—' : metric.value}</p><p className="mt-1 text-xs text-muted-foreground">{isLoading ? 'Cargando…' : metric.detail}</p></div>; })}
    </section>

    {plan ? <section aria-label="Actual versus plan" className="grid gap-px overflow-hidden rounded-lg border bg-border md:grid-cols-4">
      <div className="bg-card px-4 py-4"><div className="flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">Plan mineral a planta</p><Target className="h-4 w-4 text-muted-foreground" /></div><p className="mt-2 text-xl font-semibold">{formatTons(plan.mineralToPlantTons)}</p><p className="mt-1 text-xs text-muted-foreground">{plan.code}</p></div>
      <div className="bg-card px-4 py-4"><p className="text-xs text-muted-foreground">Actual transportado</p><p className="mt-2 text-xl font-semibold">{formatTons(period?.movementTons ?? 0, 1)}</p><p className="mt-1 text-xs text-muted-foreground">{formatPct(plan.mineralProgressPct)} del plan</p></div>
      <div className="bg-card px-4 py-4"><p className="text-xs text-muted-foreground">Ley objetivo Cu</p><p className="mt-2 text-xl font-semibold">{formatPct(plan.targetCuGradePct, 2)}</p><p className="mt-1 text-xs text-muted-foreground">Actual {formatPct(period?.avgHeadGradePct, 3)}</p></div>
      <div className="bg-card px-4 py-4"><p className="text-xs text-muted-foreground">Avance programado</p><p className="mt-2 text-xl font-semibold">{plan.plannedAdvanceM.toLocaleString('es-CL')} m</p><p className="mt-1 text-xs text-muted-foreground">Período {formatDate(plan.periodStart)} – {formatDate(plan.periodEnd)}</p></div>
    </section> : null}

    {data?.freshness.latestDrillingDate && period?.dataThrough && data.freshness.latestDrillingDate < period.periodStart ? <div className="flex items-start gap-3 rounded-lg border bg-card px-4 py-3 text-sm"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><div><p className="font-medium">Sondaje actual no corresponde al período vigente</p><p className="mt-1 text-muted-foreground">El último registro operacional de sondaje es {formatDate(data.freshness.latestDrillingDate)}. El plan vigente sí corresponde a {periodLabel(period.periodStart)}.</p></div></div> : null}

    <section aria-label="Áreas de Producción" className="divide-y rounded-lg border bg-card">{domains.map((domain) => <Link key={domain.href} href={domain.href} className="flex items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"><div><p className="font-medium">{domain.title}</p><p className="mt-1 text-sm text-muted-foreground">{domain.description}</p></div><ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" /></Link>)}</section>

    {!error && data ? <section aria-label="Cobertura histórica" className="grid gap-px overflow-hidden rounded-lg border bg-border md:grid-cols-5">
      <div className="bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Movimientos históricos</p><p className="mt-1 font-medium">{counts.materialMovements.toLocaleString('es-CL')}</p></div>
      <div className="bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Turnos históricos</p><p className="mt-1 font-medium">{counts.plantShifts.toLocaleString('es-CL')}</p></div>
      <div className="bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Metalurgia con ensayo</p><p className="mt-1 font-medium">{counts.metallurgyAssayed.toLocaleString('es-CL')}</p></div>
      <div className="bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Despachos históricos</p><p className="mt-1 font-medium">{counts.concentrateShipments.toLocaleString('es-CL')}</p></div>
      <div className="bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Reconciliaciones pendientes</p><p className="mt-1 font-medium">{counts.reconciliationPending.toLocaleString('es-CL')}</p></div>
    </section> : null}

    {!error && data ? <section aria-label="Estado de despachos" className="grid gap-px overflow-hidden rounded-lg border bg-border md:grid-cols-3"><div className="bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Concentrado despachado</p><p className="mt-1 font-medium">{formatTons(data.dispatch.wetMetricTons, 2)}</p></div><div className="bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Cobertura de linaje</p><p className="mt-1 font-medium">{formatPct(data.dispatch.allocationCoveragePct, 1)}</p></div><div className="bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Asignaciones</p><p className="mt-1 font-medium">{counts.concentrateAllocations.toLocaleString('es-CL')}</p></div></section> : null}

    {!error ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 text-sm"><div className="flex items-center gap-2">{counts.reconciliationPending > 0 ? <AlertTriangle className="h-4 w-4 text-muted-foreground" /> : <PackageCheck className="h-4 w-4 text-muted-foreground" />}<span className="text-muted-foreground">{isLoading ? 'Cargando estado…' : data?.dispatch.note ?? 'Sin información adicional.'}</span></div><Link href="/dashboard/produccion/importacion-maestra" className="text-sm font-medium text-primary hover:underline">Importación histórica</Link></div> : null}
  </div>;
}
