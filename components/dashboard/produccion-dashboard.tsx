'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { Activity, AlertTriangle, ArrowRight, Factory, Truck, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader, PageHeaderActions, PageHeaderContent, PageHeaderDescription, PageHeaderEyebrow, PageHeaderTitle } from '@/components/ui/page-header';
import { StatePanel } from '@/components/ui/state-panel';

type CanonicalOverview = {
  batches: Array<{ id: string; source_type: string; source_file: string; period_start: string | null; period_end: string | null; status: string; normalization_rule_version: string | null; created_at: string }>;
  counts: { materialMovements: number; plantShifts: number; metallurgyResults: number; metallurgyAssayed: number; metallurgyPartial: number; metallurgyNoAssay: number; concentrateShipments: number; reconciliationPending: number };
  freshness: { latestMaterialMovementDate: string | null; latestPlantOperationDate: string | null };
  dispatch: { status: 'available' | 'pending_reconciliation'; note: string };
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

const domains = [
  { href: '/dashboard/produccion/transporte-mineral', title: 'Transporte de Mineral', description: 'Movimientos mina → planta y trazabilidad.' },
  { href: '/dashboard/produccion/planta-metalurgia', title: 'Planta / Metalurgia', description: 'Turnos, tratamiento, leyes y recuperación.' },
  { href: '/dashboard/produccion/geologia', title: 'Geología', description: 'Sectores, muestreo y continuidad geológica.' },
  { href: '/dashboard/produccion/topografia', title: 'Topografía', description: 'Levantamientos, frentes y avances.' },
  { href: '/dashboard/produccion/quimica', title: 'Química', description: 'Muestras y resultados analíticos.' },
  { href: '/dashboard/produccion/sondaje', title: 'Sondaje', description: 'Exploración y Producción.' },
];

export function ProduccionDashboard() {
  const { data, error, isLoading, mutate } = useSWR('/api/produccion/canonical-overview', fetcher);
  const counts = data?.counts ?? { materialMovements: 0, plantShifts: 0, metallurgyResults: 0, metallurgyAssayed: 0, metallurgyPartial: 0, metallurgyNoAssay: 0, concentrateShipments: 0, reconciliationPending: 0 };
  const hasCanonicalData = counts.materialMovements > 0 || counts.plantShifts > 0;
  const metrics = [
    { label: 'Transporte de Mineral', value: counts.materialMovements.toLocaleString('es-CL'), detail: formatDate(data?.freshness.latestMaterialMovementDate ?? null), icon: Truck },
    { label: 'Turnos de planta', value: counts.plantShifts.toLocaleString('es-CL'), detail: formatDate(data?.freshness.latestPlantOperationDate ?? null), icon: Factory },
    { label: 'Metalurgia', value: counts.metallurgyResults.toLocaleString('es-CL'), detail: `${counts.metallurgyAssayed.toLocaleString('es-CL')} con ensayo`, icon: Activity },
    { label: 'Pendientes', value: counts.reconciliationPending.toLocaleString('es-CL'), detail: 'Requieren revisión', icon: AlertTriangle },
  ];

  return <div className="space-y-6">
    <PageHeader><PageHeaderContent><PageHeaderEyebrow>Operaciones</PageHeaderEyebrow><PageHeaderTitle>Producción</PageHeaderTitle><PageHeaderDescription>Consulta el estado productivo y entra al área que necesitas trabajar.</PageHeaderDescription></PageHeaderContent><PageHeaderActions><Button asChild><Link href="/dashboard/produccion/ingreso-datos"><Upload className="h-4 w-4" />Ingresar datos</Link></Button></PageHeaderActions></PageHeader>

    <section aria-label="Áreas de Producción" className="divide-y rounded-lg border bg-card">
      {domains.map((domain) => <Link key={domain.href} href={domain.href} className="flex items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"><div><p className="font-medium">{domain.title}</p><p className="mt-1 text-sm text-muted-foreground">{domain.description}</p></div><ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" /></Link>)}
    </section>

    {error ? <StatePanel tone="error" title="No fue posible cargar Producción" description="Reintenta la consulta." actions={<Button variant="outline" onClick={() => void mutate()}>Reintentar</Button>} className="min-h-0 py-5" /> : null}
    {!error && !isLoading && !hasCanonicalData ? <StatePanel tone="neutral" title="Sin datos productivos cargados" description="MOTIL mostrará información cuando exista una fuente operacional validada." /> : null}

    <section aria-label="Resumen de producción" className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => { const Icon = metric.icon; return <div key={metric.label} className="bg-card px-5 py-4"><div className="flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{metric.label}</p><Icon className="h-4 w-4 text-muted-foreground" /></div><p className="mt-2 text-2xl font-semibold tracking-tight">{isLoading ? '—' : metric.value}</p><p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p></div>; })}
    </section>

    {!error ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 text-sm"><div><span className="font-medium">Despachos de concentrado:</span> <span className="text-muted-foreground">{isLoading ? '—' : counts.concentrateShipments.toLocaleString('es-CL')} · {data?.dispatch.note ?? 'Sin información adicional.'}</span></div><Link href="/dashboard/produccion/importacion-maestra" className="text-sm font-medium text-primary hover:underline">Importación histórica</Link></div> : null}
  </div>;
}
