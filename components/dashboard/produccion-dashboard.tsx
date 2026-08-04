'use client';

import Link from 'next/link';
import { Activity, AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-28 animate-pulse rounded-2xl bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium">No fue posible cargar los datos de producción.</p>
              <p className="text-sm text-muted-foreground">Reintenta la consulta sin modificar los registros existentes.</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => mutate()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  const latestKPI = kpis[0];
  const averageProduction = kpis.length
    ? kpis.reduce((sum, item) => sum + (item.production_tons || 0), 0) / kpis.length
    : 0;
  const chartData = kpis.slice().reverse();

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/70 bg-card p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Operaciones · Producción</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Control de producción</h1>
            <p className="mt-2 text-sm text-muted-foreground md:text-base">
              Seguimiento de producción, disponibilidad, seguridad y desempeño ambiental con datos operacionales existentes.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="gap-2">
              <Link href="/dashboard/telemetria">
                Abrir telemetría
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button onClick={() => mutate()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardDescription>Producción registrada</CardDescription></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{latestKPI?.production_tons?.toFixed(0) || 0} ton</p><p className="mt-1 text-xs text-muted-foreground">Promedio del período: {averageProduction.toFixed(1)} ton</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Disponibilidad</CardDescription></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{latestKPI?.equipment_uptime?.toFixed(1) || 0}%</p><p className="mt-1 text-xs text-muted-foreground">Equipos operativos</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Incidentes</CardDescription></CardHeader>
          <CardContent><p className="text-3xl font-semibold text-destructive">{latestKPI?.safety_incidents || 0}</p><p className="mt-1 text-xs text-muted-foreground">Último registro disponible</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Cumplimiento ambiental</CardDescription></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{latestKPI?.environmental_compliance?.toFixed(1) || 0}%</p><p className="mt-1 text-xs text-muted-foreground">Estándar operacional</p></CardContent>
        </Card>
      </div>

      {kpis.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="font-medium">No existen registros de producción para mostrar.</p>
            <p className="mt-1 text-sm text-muted-foreground">La pantalla se actualizará cuando la fuente actual entregue información.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Producción del período</CardTitle><CardDescription>Toneladas registradas por fecha.</CardDescription></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ left: -12, right: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="production_tons" stroke="currentColor" strokeWidth={2} dot={false} name="Toneladas" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Desempeño operacional</CardTitle><CardDescription>Disponibilidad y eficiencia de la fuerza de trabajo.</CardDescription></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ left: -12, right: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="equipment_uptime" fill="currentColor" opacity={0.8} name="Disponibilidad %" />
                  <Bar dataKey="workforce_efficiency" fill="currentColor" opacity={0.35} name="Eficiencia %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4" />Alertas de sensores</CardTitle>
            <CardDescription>Lecturas que requieren revisión operacional.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SensorAlerts />
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/telemetria">Ver telemetría completa</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Equipos conectados</CardTitle><CardDescription>Disponibilidad, alarmas y última lectura registrada.</CardDescription></CardHeader>
          <CardContent><EquipmentMonitor /></CardContent>
        </Card>
      </div>
    </div>
  );
}
