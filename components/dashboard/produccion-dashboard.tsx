'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { Activity, AlertTriangle, ArrowRight, Drill, Factory, PackageCheck, Truck, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader, PageHeaderActions, PageHeaderContent, PageHeaderDescription, PageHeaderEyebrow, PageHeaderTitle } from '@/components/ui/page-header';
import { StatePanel } from '@/components/ui/state-panel';

type CanonicalOverview = {
  batches: Array<{ id: string; source_type: string; source_file: string; period_start: string | null; period_end: string | null; status: string; normalization_rule_version: string | null; created_at: string }>;
  counts: { materialMovements: number; plantShifts: number; metallurgyResults: number; metallurgyAssayed: number; metallurgyPartial: number; metallurgyNoAssay: number; concentrateShipments: number; concentrateAllocations: number; reconciliationPending: number; drillingReports: number; drillingHoles: number };
  freshness: { latestMaterialMovementDate: string | null; latestPlantOperationDate: string | null; latestShipmentDate: string | null; latestDrillingDate: string | null };
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
function formatTons(value: number) { return `${value.toLocaleString('es-CL', { maximumFractionDigits: 2 })} t`; }

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
  const hasCanonicalData = counts.materialMovements > 0 || counts.plantShifts > 0 || counts.drillingReports > 0;
  const metrics = [
    { label: 'Transporte de Mineral', value: counts.materialMovements.toLocaleString('es-CL'), detail: formatDate(data?.freshness.latestMaterialMovementDate ?? null), icon: Truck },
    { label: 'Turnos de planta', value: counts.plantShifts.toLocaleString('es-CL'), detail: formatDate(data?.freshness.latestPlantOperationDate ?? null), icon: Factory },
    { label: 'Metalurgia', value: counts.metallurgyResults.toLocaleString('es-CL'), detail: `${counts.metallurgyAssayed.toLocaleString('es-CL')} con ensayo`, icon: Activity },
    { label: 'Sondaje', value: data?.drilling ? `${data.drilling.meters.toLocaleString('es-CL',{maximumFractionDigits:0})} m` : '—', detail: `${counts.drillingHoles.toLocaleString('es-CL')} pozos · ${formatDate(data?.freshness.latestDrillingDate ?? null)}`, icon: Drill },
    { label: 'Despachos de concentrado', value: counts.concentrateShipments.toLocaleString('es-CL'), detail: data ? formatTons(data.dispatch.wetMetricTons) : '—', icon: PackageCheck },
  ];

  return <div className="space-y-6">
    <PageHeader><PageHeaderContent><PageHeaderEyebrow>Operaciones</PageHeaderEyebrow><PageHeaderTitle>Producción</PageHeaderTitle><PageHeaderDescription>Estado productivo canónico: mina, planta, metalurgia, sondajes y despachos.</PageHeaderDescription></PageHeaderContent><PageHeaderActions><Button asChild><Link href="/dashboard/produccion/ingreso-datos"><Upload className="h-4 w-4" />Ingresar datos</Link></Button></PageHeaderActions></PageHeader>
    <section aria-label="Áreas de Producción" className="divide-y rounded-lg border bg-card">{domains.map((domain) => <Link key={domain.href} href={domain.href} className="flex items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"><div><p className="font-medium">{domain.title}</p><p className="mt-1 text-sm text-muted-foreground">{domain.description}</p></div><ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" /></Link>)}</section>
    {error ? <StatePanel tone="error" title="No fue posible cargar Producción" description="Reintenta la consulta." actions={<Button variant="outline" onClick={() => void mutate()}>Reintentar</Button>} className="min-h-0 py-5" /> : null}
    {!error && !isLoading && !hasCanonicalData ? <StatePanel tone="neutral" title="Sin datos productivos cargados" description="MOTIL mostrará información cuando exista una fuente operacional validada." /> : null}
    <section aria-label="Resumen de producción" className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-5">{metrics.map((metric) => { const Icon = metric.icon; return <div key={metric.label} className="bg-card px-5 py-4"><div className="flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{metric.label}</p><Icon className="h-4 w-4 text-muted-foreground" /></div><p className="mt-2 text-2xl font-semibold tracking-tight">{isLoading ? '—' : metric.value}</p><p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p></div>; })}</section>
    {!error && data ? <section aria-label="Estado de despachos" className="grid gap-px overflow-hidden rounded-lg border bg-border md:grid-cols-4"><div className="bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Despachos</p><p className="mt-1 font-medium">{counts.concentrateShipments.toLocaleString('es-CL')}</p></div><div className="bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Toneladas húmedas</p><p className="mt-1 font-medium">{formatTons(data.dispatch.wetMetricTons)}</p></div><div className="bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Allocations</p><p className="mt-1 font-medium">{counts.concentrateAllocations.toLocaleString('es-CL')}</p></div><div className="bg-card px-4 py-3"><p className="text-xs text-muted-foreground">Cobertura de linaje</p><p className="mt-1 font-medium">{data.dispatch.allocationCoveragePct.toLocaleString('es-CL', { maximumFractionDigits: 1 })}%</p></div></section> : null}
    {!error ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 text-sm"><div className="flex items-center gap-2">{counts.reconciliationPending > 0 ? <AlertTriangle className="h-4 w-4 text-muted-foreground" /> : null}<span className="text-muted-foreground">{isLoading ? 'Cargando despachos…' : data?.dispatch.note ?? 'Sin información adicional.'}</span></div><Link href="/dashboard/produccion/importacion-maestra" className="text-sm font-medium text-primary hover:underline">Importación histórica</Link></div> : null}
  </div>;
}
