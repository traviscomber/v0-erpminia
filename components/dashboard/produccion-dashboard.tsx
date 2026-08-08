'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { Activity, AlertTriangle, ArrowRight, Database, Factory, RefreshCw, Truck, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderTitle,
} from '@/components/ui/page-header';
import { StatePanel } from '@/components/ui/state-panel';
import { SensorAlerts } from '@/components/production/sensor-alerts';
import { EquipmentMonitor } from '@/components/telemetry/equipment-monitor';

type CanonicalOverview = {
  batches: Array<{
    id: string;
    source_type: string;
    source_file: string;
    period_start: string | null;
    period_end: string | null;
    status: string;
    normalization_rule_version: string | null;
    created_at: string;
  }>;
  counts: {
    materialMovements: number;
    plantShifts: number;
    metallurgyResults: number;
    concentrateShipments: number;
    reconciliationPending: number;
  };
  freshness: {
    latestMaterialMovementDate: string | null;
    latestPlantOperationDate: string | null;
  };
  legacy: {
    produccionKpiIsCanonical: boolean;
    note: string;
  };
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

export function ProduccionDashboard() {
  const { data, error, isLoading, mutate } = useSWR('/api/produccion/canonical-overview', fetcher);

  const counts = data?.counts ?? {
    materialMovements: 0,
    plantShifts: 0,
    metallurgyResults: 0,
    concentrateShipments: 0,
    reconciliationPending: 0,
  };

  const hasCanonicalData = counts.materialMovements > 0 || counts.plantShifts > 0;
  const freshnessGap = data?.freshness.latestMaterialMovementDate && data?.freshness.latestPlantOperationDate
    ? Math.max(
        0,
        Math.round(
          (new Date(data.freshness.latestMaterialMovementDate).getTime() - new Date(data.freshness.latestPlantOperationDate).getTime()) /
            86_400_000,
        ),
      )
    : null;

  const metrics = [
    {
      label: 'Movimientos mina → planta',
      value: counts.materialMovements.toLocaleString('es-CL'),
      detail: `Último movimiento: ${formatDate(data?.freshness.latestMaterialMovementDate ?? null)}`,
      icon: Truck,
    },
    {
      label: 'Turnos de planta',
      value: counts.plantShifts.toLocaleString('es-CL'),
      detail: `Último turno: ${formatDate(data?.freshness.latestPlantOperationDate ?? null)}`,
      icon: Factory,
    },
    {
      label: 'Resultados metalúrgicos',
      value: counts.metallurgyResults.toLocaleString('es-CL'),
      detail: 'Leyes, recuperación y finos trazables por turno',
      icon: Activity,
    },
    {
      label: 'Pendientes de reconciliación',
      value: counts.reconciliationPending.toLocaleString('es-CL'),
      detail: 'Alias o entidades que requieren revisión humana',
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Operaciones · Fuente canónica</PageHeaderEyebrow>
          <PageHeaderTitle>Producción</PageHeaderTitle>
          <PageHeaderDescription>
            Trazabilidad operacional desde el movimiento mina→planta hasta turno, metalurgia, concentrado y despacho. Los KPI legacy no se usan como fuente de verdad.
          </PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button asChild variant="outline">
            <Link href="/dashboard/produccion/importacion-maestra">
              <Database className="h-4 w-4" />
              Importación histórica
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/produccion/ingreso-datos">
              <Upload className="h-4 w-4" />
              Ingreso de datos
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/telemetria">
              Monitoreo de equipos
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" onClick={() => void mutate()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </PageHeaderActions>
      </PageHeader>

      {error ? (
        <StatePanel
          tone="error"
          title="No fue posible cargar Producción canónica"
          description="La vista no sustituirá el error con datos legacy. Reintenta la consulta."
          actions={<Button variant="outline" onClick={() => void mutate()}>Reintentar</Button>}
          className="min-h-0 py-6"
        />
      ) : null}

      {!error && !isLoading && !hasCanonicalData ? (
        <StatePanel
          tone="neutral"
          title="Modelo canónico disponible, datos aún no cargados"
          description="Los lotes fuente están registrados, pero movimientos y turnos todavía no han sido materializados en las tablas canónicas. Usa Importación histórica para cargar el master Motil validado o Ingreso de datos para operación corriente. Motil no mostrará KPI legacy como si fueran producción oficial."
        />
      ) : null}

      <section aria-label="Resumen canónico de producción" className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="bg-card px-5 py-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{metric.label}</p>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-4 text-2xl font-semibold tracking-[-0.03em]">{isLoading ? '—' : metric.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p>
            </div>
          );
        })}
      </section>

      {!error ? (
        <div className="grid gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Database className="h-4 w-4" />Estado de la fuente</CardTitle>
              <CardDescription>Control de cobertura, latencia y procedencia antes de interpretar desempeño.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-md bg-muted/40 p-4">
                <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Lotes fuente registrados</p>
                <p className="mt-2 text-xl font-semibold">{data?.batches.length ?? 0}</p>
                <p className="mt-1 text-xs text-muted-foreground">TM y planta/leyes con período y versión de normalización.</p>
              </div>
              <div className="rounded-md bg-muted/40 p-4">
                <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Latencia movimiento → planta</p>
                <p className="mt-2 text-xl font-semibold">{freshnessGap == null ? 'Sin dato' : `${freshnessGap} día${freshnessGap === 1 ? '' : 's'}`}</p>
                <p className="mt-1 text-xs text-muted-foreground">Una diferencia de fecha se interpreta como latencia de evidencia, no como falla productiva.</p>
              </div>
              <div className="rounded-md bg-muted/40 p-4 sm:col-span-2">
                <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Regla de integridad</p>
                <p className="mt-2 text-sm text-foreground">Dato observado, dato calculado y dato pendiente se mantienen separados. Las entidades históricas no se crean automáticamente desde texto libre y los KPI ejecutivos deben derivarse del modelo canónico.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Despachos de concentrado</CardTitle>
              <CardDescription>Registros canónicos disponibles.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{isLoading ? '—' : counts.concentrateShipments.toLocaleString('es-CL')}</p>
              <p className="mt-2 text-xs text-muted-foreground">Separados de la operación de turno para preservar el grano físico del proceso.</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {!error ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4" />
                Alertas de equipos
              </CardTitle>
              <CardDescription>Telemetría complementaria; no reemplaza la fuente productiva.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SensorAlerts />
              <Button asChild variant="outline" className="w-full"><Link href="/dashboard/telemetria">Abrir monitoreo completo</Link></Button>
            </CardContent>
          </Card>

          <Card className="min-w-0 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Equipos conectados</CardTitle>
              <CardDescription>Disponibilidad, alarmas y última lectura registrada.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto"><EquipmentMonitor /></CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}