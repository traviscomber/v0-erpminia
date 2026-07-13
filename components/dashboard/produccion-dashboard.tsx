'use client';

import Link from 'next/link';
import { Activity, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useProductionKPI } from '@/hooks/use-module-apis';
import {
  LineChart,
  Line,
  CartesianGrid,
  Tooltip,
  Legend,
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

  if (error) return <div className="text-red-500">Error al cargar datos de produccion</div>;
  if (isLoading) return <div>Cargando...</div>;

  const latestKPI = kpis[0] || {};
  const avgProduction = (
    kpis.reduce((sum, k) => sum + (k.production_tons || 0), 0) / Math.max(kpis.length, 1)
  ).toFixed(1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Produccion en tiempo real</h1>
          <p className="text-muted-foreground">Monitoreo integral de KPIs operacionales y telemetria real.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/dashboard/telemetria">
              Telemetria
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/dashboard/mantenimiento">
              Mantenimiento
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="sm" onClick={() => mutate()} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Produccion de hoy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestKPI.production_tons?.toFixed(0) || 0} ton</div>
            <p className="text-xs text-muted-foreground">Promedio: {avgProduction} ton</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Disponibilidad</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestKPI.equipment_uptime?.toFixed(1) || 0}%</div>
            <p className="text-xs text-muted-foreground">Equipos operativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Incidentes hoy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{latestKPI.safety_incidents || 0}</div>
            <p className="text-xs text-muted-foreground">Seguridad</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Cumplimiento ambiental</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestKPI.environmental_compliance?.toFixed(1) || 0}%</div>
            <p className="text-xs text-muted-foreground">Estandares</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Produccion - Ultimos 30 dias</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={kpis.slice().reverse()}>
              <CartesianGrid />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="production_tons" stroke="#ff7300" name="Toneladas" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Metricas operacionales</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={kpis.slice().reverse()}>
              <CartesianGrid />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="equipment_uptime" fill="#82ca9d" name="Tiempo activo %" />
              <Bar dataKey="workforce_efficiency" fill="#ffc658" name="Eficiencia %" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1 border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-[var(--brand-naranja)]" />
              Telemetria de sensores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Lecturas reales desde sensores, alertas activas y acceso directo a la orden de trabajo sugerida.
            </p>
            <SensorAlerts />
            <Link href="/dashboard/telemetria">
              <Button variant="outline" className="w-full">
                Ver modulo de telemetria
              </Button>
            </Link>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base">Estado de equipos conectados</CardTitle>
            </CardHeader>
            <CardContent>
              <EquipmentMonitor />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
