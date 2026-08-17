'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { Activity, AlertTriangle, ArrowRight, Database, Factory, RefreshCw, Truck, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader, PageHeaderActions, PageHeaderContent, PageHeaderDescription, PageHeaderEyebrow, PageHeaderTitle } from '@/components/ui/page-header';
import { StatePanel } from '@/components/ui/state-panel';
import { SensorAlerts } from '@/components/production/sensor-alerts';
import { EquipmentMonitor } from '@/components/telemetry/equipment-monitor';

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
  { href: '/dashboard/produccion/transporte-mineral', title: 'Transporte de Mineral', description: 'Movimientos mina → planta, tonelaje, transportista y trazabilidad.' },
  { href: '/dashboard/produccion/planta-metalurgia', title: 'Planta / Metalurgia', description: 'Turnos, tratamiento, leyes, recuperación y balances determinísticos.' },
  { href: '/dashboard/produccion/geologia', title: 'Geología', description: 'Sectores, muestreo, mineralización y continuidad geológica.' },
  { href: '/dashboard/produccion/topografia', title: 'Topografía', description: 'Levantamientos, coordenadas, cotas, frentes y avances.' },
  { href: '/dashboard/produccion/quimica', title: 'Química', description: 'Muestras, métodos, resultados químicos y control analítico.' },
  { href: '/dashboard/produccion/sondaje', title: 'Sondaje', description: 'Exploración y Producción como flujos operacionales separados.' },
];

export function ProduccionDashboard() {
  const { data, error, isLoading, mutate } = useSWR('/api/produccion/canonical-overview', fetcher);
  const counts = data?.counts ?? { materialMovements: 0, plantShifts: 0, metallurgyResults: 0, metallurgyAssayed: 0, metallurgyPartial: 0, metallurgyNoAssay: 0, concentrateShipments: 0, reconciliationPending: 0 };
  const hasCanonicalData = counts.materialMovements > 0 || counts.plantShifts > 0;
  const freshnessGap = data?.freshness.latestMaterialMovementDate && data?.freshness.latestPlantOperationDate
    ? Math.max(0, Math.round((new Date(data.freshness.latestMaterialMovementDate).getTime() - new Date(data.freshness.latestPlantOperationDate).getTime()) / 86_400_000))
    : null;

  const metrics = [
    { label: 'Transporte de Mineral', value: counts.materialMovements.toLocaleString('es-CL'), detail: `Último movimiento: ${formatDate(data?.freshness.latestMaterialMovementDate ?? null)}`, icon: Truck },
    { label: 'Turnos de planta', value: counts.plantShifts.toLocaleString('es-CL'), detail: `Último turno: ${formatDate(data?.freshness.latestPlantOperationDate ?? null)}`, icon: Factory },
    { label: 'Metalurgia determinística', value: counts.metallurgyResults.toLocaleString('es-CL'), detail: `${counts.metallurgyAssayed.toLocaleString('es-CL')} con ensayo · ${counts.metallurgyPartial.toLocaleString('es-CL')} parciales · ${counts.metallurgyNoAssay.toLocaleString('es-CL')} sin ensayo`, icon: Activity },
    { label: 'Pendientes de reconciliación', value: counts.reconciliationPending.toLocaleString('es-CL'), detail: 'Alias o entidades que requieren revisión humana', icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Operaciones · Fuente canónica</PageHeaderEyebrow>
          <PageHeaderTitle>Producción</PageHeaderTitle>
          <PageHeaderDescription>
            Producción integra Transporte de Mineral, Planta/Metalurgia, Geología, Topografía, Química y Sondaje. Dato observado, calculado y pendiente se mantienen separados.
          </PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button asChild variant="outline"><Link href="/dashboard/produccion/importacion-maestra"><Database className="h-4 w-4" />Importación histórica</Link></Button>
          <Button asChild><Link href="/dashboard/produccion/ingreso-datos"><Upload className="h-4 w-4" />Ingreso de datos</Link></Button>
          <Button asChild variant="outline"><Link href="/dashboard/telemetria">Monitoreo de equipos<ArrowRight className="h-4 w-4" /></Link></Button>
          <Button variant="outline" onClick={() => void mutate()} disabled={isLoading}><RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />Actualizar</Button>
        </PageHeaderActions>
      </PageHeader>

      <section aria-label="Áreas de Producción" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {domains.map((domain) => (
          <Link key={domain.href} href={domain.href} className="block">
            <Card className="h-full transition-colors hover:border-primary/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">{domain.title}<ArrowRight className="h-4 w-4 text-muted-foreground" /></CardTitle>
                <CardDescription>{domain.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </section>

      {error ? <StatePanel tone="error" title="No fue posible cargar Producción canónica" description="La vista no sustituirá el error con datos legacy. Reintenta la consulta." actions={<Button variant="outline" onClick={() => void mutate()}>Reintentar</Button>} className="min-h-0 py-6" /> : null}
      {!error && !isLoading && !hasCanonicalData ? <StatePanel tone="neutral" title="Modelo canónico disponible, datos aún no cargados" description="Los dominios están disponibles, pero MOTIL sólo mostrará información cuando exista una fuente operacional real y validada." /> : null}

      <section aria-label="Resumen canónico de producción" className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => { const Icon = metric.icon; return (
          <div key={metric.label} className="bg-card px-5 py-5">
            <div className="flex items-center justify-between gap-3"><p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{metric.label}</p><Icon className="h-4 w-4 text-muted-foreground" /></div>
            <p className="mt-4 text-2xl font-semibold tracking-[-0.03em]">{isLoading ? '—' : metric.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p>
          </div>
        ); })}
      </section>

      {!error ? (
        <div className="grid gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Database className="h-4 w-4" />Estado de la fuente</CardTitle><CardDescription>Control de cobertura, latencia y procedencia antes de interpretar desempeño.</CardDescription></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-md bg-muted/40 p-4"><p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Lotes fuente registrados</p><p className="mt-2 text-xl font-semibold">{data?.batches.length ?? 0}</p><p className="mt-1 text-xs text-muted-foreground">Transporte y planta/leyes con período y versión de normalización.</p></div>
              <div className="rounded-md bg-muted/40 p-4"><p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Latencia transporte → planta</p><p className="mt-2 text-xl font-semibold">{freshnessGap == null ? 'Sin dato' : `${freshnessGap} día${freshnessGap === 1 ? '' : 's'}`}</p><p className="mt-1 text-xs text-muted-foreground">Una diferencia de fecha se interpreta como latencia de evidencia, no como falla productiva.</p></div>
              <div className="rounded-md bg-muted/40 p-4 sm:col-span-2"><p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Cobertura metalúrgica</p><p className="mt-2 text-sm text-foreground">Los {counts.plantShifts.toLocaleString('es-CL')} turnos de planta están representados en la vista determinística. Los turnos sin ensayo permanecen explícitamente sin ensayo; no se convierten a cero.</p></div>
            </CardContent>
          </Card>
          <Card><CardHeader><CardTitle className="text-base">Despachos de concentrado</CardTitle><CardDescription>{data?.dispatch.status === 'available' ? 'Registros canónicos disponibles.' : 'Pendiente de conciliación histórica.'}</CardDescription></CardHeader><CardContent><p className="text-3xl font-semibold">{isLoading ? '—' : counts.concentrateShipments.toLocaleString('es-CL')}</p><p className="mt-2 text-xs text-muted-foreground">{data?.dispatch.note ?? 'La interfaz no mostrará despachos simulados.'}</p></CardContent></Card>
        </div>
      ) : null}

      {!error ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4" />Alertas de equipos</CardTitle><CardDescription>Telemetría complementaria; no reemplaza la fuente productiva.</CardDescription></CardHeader><CardContent className="space-y-4"><SensorAlerts /><Button asChild variant="outline" className="w-full"><Link href="/dashboard/telemetria">Abrir monitoreo completo</Link></Button></CardContent></Card>
          <Card className="min-w-0 lg:col-span-2"><CardHeader><CardTitle className="text-base">Equipos conectados</CardTitle><CardDescription>Disponibilidad, alarmas y última lectura registrada.</CardDescription></CardHeader><CardContent className="overflow-x-auto"><EquipmentMonitor /></CardContent></Card>
        </div>
      ) : null}
    </div>
  );
}
