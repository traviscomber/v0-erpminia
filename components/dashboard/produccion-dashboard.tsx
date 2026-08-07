'use client';

import Link from 'next/link';
import { Activity, ArrowRight, RefreshCw, Upload } from 'lucide-react';
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
import { useProductionKPI } from '@/hooks/use-module-apis';
import {
  LineChart,
  Line,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from 'recharts';
import { SensorAlerts } from '@/components/production/sensor-alerts';
import { EquipmentMonitor } from '@/components/telemetry/equipment-monitor';

export function ProduccionDashboard() {
  const { kpis, isLoading, error, mutate } = useProductionKPI();

  const latestKPI = kpis[0];
  const averageProduction = kpis.length
    ? kpis.reduce((sum, item) => sum + (item.production_tons || 0), 0) / kpis.length
    : 0;
  const chartData = kpis.slice().reverse();

  const metrics = [
    {
      label: 'Producción registrada',
      value: latestKPI ? `${latestKPI.production_tons?.toFixed(0) || 0} ton` : 'Sin registro',
      detail: kpis.length ? `Promedio del período: ${averageProduction.toFixed(1)} ton` : 'Sin información disponible',
    },
    {
      label: 'Disponibilidad',
      value: latestKPI ? `${latestKPI.equipment_uptime?.toFixed(1) || 0}%` : 'Sin registro',
      detail: 'Equipos disponibles para operar',
    },
    {
      label: 'Incidentes',
      value: latestKPI?.safety_incidents ?? 'Sin registro',
      detail: 'Último registro disponible',
    },
    {
      label: 'Cumplimiento ambiental',
      value: latestKPI ? `${latestKPI.environmental_compliance?.toFixed(1) || 0}%` : 'Sin registro',
      detail: 'Última medición disponible',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Operaciones</PageHeaderEyebrow>
          <PageHeaderTitle>Producción</PageHeaderTitle>
          <PageHeaderDescription>
            Resultado productivo, disponibilidad, seguridad y desempeño ambiental en una vista de seguimiento.
          </PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
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
          <Button onClick={() => void mutate()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </PageHeaderActions>
      </PageHeader>

      {error ? (
        <StatePanel
          tone="error"
          title="No fue posible cargar la producción"
          description="Reintenta la consulta. Los registros existentes no serán modificados."
          actions={<Button variant="outline" onClick={() => void mutate()}>Reintentar</Button>}
          className="min-h-0 py-6"
        />
      ) : null}

      <section aria-label="Resumen de producción" className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="bg-card px-5 py-5">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{metric.label}</p>
            <p className="mt-4 text-2xl font-semibold tracking-[-0.03em]">{isLoading ? '—' : metric.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p>
          </div>
        ))}
      </section>

      {isLoading ? (
        <StatePanel tone="loading" title="Cargando producción" description="Consultando los registros operacionales." />
      ) : !error && kpis.length === 0 ? (
        <StatePanel
          tone="neutral"
          title="No hay registros de producción"
          description="La información aparecerá cuando la fuente operacional entregue nuevos registros."
        />
      ) : !error ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle className="text-base">Producción del período</CardTitle>
              <CardDescription>Toneladas registradas por fecha.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="h-[300px] min-w-[520px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ left: -12, right: 8 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="production_tons" stroke="var(--primary)" strokeWidth={2} dot={false} name="Toneladas" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle className="text-base">Desempeño operacional</CardTitle>
              <CardDescription>Disponibilidad de equipos y eficiencia registrada.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="h-[300px] min-w-[520px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ left: -12, right: 8 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="equipment_uptime" fill="var(--secondary)" name="Disponibilidad %" />
                    <Bar dataKey="workforce_efficiency" fill="var(--primary)" opacity={0.55} name="Eficiencia %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
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
              <CardDescription>Lecturas que requieren revisión.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SensorAlerts />
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard/telemetria">Abrir monitoreo completo</Link>
              </Button>
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
