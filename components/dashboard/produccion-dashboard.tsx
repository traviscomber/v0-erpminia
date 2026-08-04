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
      <div className="space-y-6" aria-busy="true" aria-label="Cargando producción">
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="font-medium">No fue posible cargar los datos de producción.</p>
              <p className="text-sm text-muted-foreground">Reintenta la consulta sin modificar los registros existentes.</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => mutate()} className="gap-2 sm:self-auto">
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
      <section className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Operaciones · Producción</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Control de producción</h1>
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
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardDescription>Producción registrada</CardDescription></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{latestKPI?.production_tons?.toFixed(0) || 0} ton</p><p className="mt-1 text-xs text-muted-foreground">Promedio del período: {averageProduction.toFixed(1)} ton</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Disponibilidad</CardDescription></CardHeader>
          <CardContent><p className="text-3xl font-semibold text-secondary">{latestKPI?.equipment_uptime?.toFixed(1) || 0}%</p><p className="mt-1 text-xs text-muted-foreground">Equipos operativos</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Incidentes</CardDescription></CardHeader>
          <CardContent><p className="text-3xl font-semibold text-destructive">{latestKPI?.safety_incidents || 0}</p><p className="mt-1 text-xs text-muted-foreground">Último registro disponible</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Cumplimiento ambiental</CardDescription></CardHeader>
          <CardContent><p className="text-3xl font-semibold text-secondary">{latestKPI?.environmental_compliance?.toFixed(1) || 0}%</p><p className="mt-1 text-xs text-muted-foreground">Estándar operacional</p></CardContent>
        </Card>
      </div>

      {kpis.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="font-medium">No existen registros de producción para mostrar.</p>
            <p className="mt-1 text-sm text-muted-foreground">La pantalla se actualizará cuando la fuente entregue información.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="min-w-0">
            <CardHeader><CardTitle className="text-base">Producción del período</CardTitle><CardDescription>Toneladas registradas por fecha.</CardDescription></CardHeader>
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
            <CardHeader><CardTitle className="text-base">Desempeño operacional</CardTitle><CardDescription>Disponibilidad y eficiencia de la fuerza de trabajo.</CardDescription></CardHeader>
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

        <Card className="min-w-0 lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Equipos conectados</CardTitle><CardDescription>Disponibilidad, alarmas y última lectura registrada.</CardDescription></CardHeader>
          <CardContent className="overflow-x-auto"><EquipmentMonitor /></CardContent>
        </Card>
      </div>
    </div>
  );
}