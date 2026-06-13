'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BrandCard } from '@/components/ui/brand-card';
import { useProductionData } from '@/hooks/use-mock-data';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART_COLORS_LIGHT } from '@/lib/theme-colors';

function formatMetric(value: number | null, suffix = '') {
  if (typeof value !== 'number' || Number.isNaN(value)) return '--';
  return `${Math.round(value * 10) / 10}${suffix}`;
}

function getStatusColor(status: string) {
  switch (status) {
    case 'operational':
      return 'bg-[var(--brand-verde)]/20 text-[var(--brand-verde)]';
    case 'warning':
      return 'bg-[var(--secondary)]/20 text-[var(--secondary)]';
    case 'maintenance':
      return 'bg-[var(--secondary)]/20 text-[var(--secondary)]';
    case 'offline':
      return 'bg-[var(--brand-rojo)]/20 text-[var(--brand-rojo)]';
    default:
      return 'bg-muted/20 text-gray-700';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'operational':
      return <CheckCircle2 className="h-4 w-4" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4" />;
    case 'offline':
      return <XCircle className="h-4 w-4" />;
    default:
      return <Activity className="h-4 w-4" />;
  }
}

function getSourceLabel(source: string) {
  if (source === 'production') return 'Produccion';
  if (source === 'maintenance') return 'Mantencion';
  return 'Operacion';
}

export default function ProduccionPage() {
  const { data, error, isLoading, mutate } = useProductionData();

  const equipment = data.equipment || [];
  const readings = data.readings || [];
  const alarms = data.alarms || [];
  const summary = data.summary || {};

  const sensorData = readings.map((reading: any) => ({
    timestamp: reading.timestamp
      ? new Date(reading.timestamp).toLocaleTimeString('es-CL', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
    temp: reading.temperature ?? null,
    pressure: reading.pressure ?? null,
    vibration: reading.vibration ?? null,
  }));

  if (error) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold">Produccion en Tiempo Real</h1>
          <p className="text-muted-foreground">Monitoreo operacional conectado a datos reales</p>
        </div>
        <Card className="border-destructive/30">
          <CardContent className="pt-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-sm">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span>No fue posible cargar el modulo de produccion.</span>
            </div>
            <Button variant="outline" onClick={() => mutate()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return <div className="text-gray-500">Cargando telemetria operacional...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Produccion en Tiempo Real</h1>
          <p className="text-muted-foreground">
            Monitoreo integral de equipos operacionales, alertas y tendencias de sensores
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => mutate()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <BrandCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Equipos Operacionales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {summary.operational_equipment || 0}/{summary.total_equipment || 0}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatMetric(summary.availability_percentage, '%')} disponibilidad promedio
            </p>
          </CardContent>
        </BrandCard>

        <BrandCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Alarmas Activas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[var(--brand-naranja)]">
              {summary.active_alarms || 0}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.critical_alarms || 0} criticas
            </p>
          </CardContent>
        </BrandCard>

        <BrandCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Produccion Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.production_today ?? '--'}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.production_target_percentage != null
                ? `${summary.production_target_percentage}% de meta`
                : 'Sin meta configurada'}
            </p>
          </CardContent>
        </BrandCard>

        <BrandCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Downtime Acumulado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.downtime_minutes || 0} min</div>
            <p className="mt-1 text-xs text-muted-foreground">Consolidado desde detenciones y OT</p>
          </CardContent>
        </BrandCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <h2 className="text-lg font-semibold">Equipos en Operacion</h2>
          {equipment.length === 0 && (
            <Card>
              <CardContent className="p-6 text-muted-foreground">
                No hay equipos o activos disponibles todavia para mostrar en produccion.
              </CardContent>
            </Card>
          )}

          {equipment.map((eq: any) => (
            <Card key={eq.id} className="transition-shadow hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-3">
                      <h3 className="font-semibold">{eq.name}</h3>
                      <Badge className={getStatusColor(eq.status)}>
                        <span className="mr-1">{getStatusIcon(eq.status)}</span>
                        {eq.status}
                      </Badge>
                      <Badge variant="outline">{getSourceLabel(eq.source)}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Disponibilidad</p>
                        <p className="font-semibold">{formatMetric(eq.availability, '%')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Temperatura</p>
                        <p className="font-semibold">{formatMetric(eq.temperature, ' C')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Presion</p>
                        <p className="font-semibold">{formatMetric(eq.pressure, ' bar')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Vibracion</p>
                        <p className="font-semibold">{formatMetric(eq.vibration, ' mm/s')}</p>
                      </div>
                    </div>
                    {(eq.type || eq.location || eq.criticality) && (
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {eq.type && <span>Tipo: {eq.type}</span>}
                        {eq.location && <span>Ubicacion: {eq.location}</span>}
                        {eq.criticality && <span>Criticidad: {eq.criticality}</span>}
                      </div>
                    )}
                  </div>
                  {eq.alarms > 0 && (
                    <div className="rounded-lg bg-[var(--brand-naranja)]/20 px-3 py-2 text-center text-[var(--brand-naranja)]">
                      <AlertCircle className="mx-auto mb-1 h-5 w-5" />
                      <p className="text-xs font-semibold">
                        {eq.alarms} alerta{eq.alarms > 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Alertas Activas</h2>
          <div className="space-y-2">
            {alarms.length === 0 && (
              <Card>
                <CardContent className="p-4 text-sm text-muted-foreground">
                  No hay alertas operacionales activas.
                </CardContent>
              </Card>
            )}
            {alarms.map((alert: any, index: number) => (
              <Card
                key={alert.id || index}
                className={
                  alert.severity === 'critical'
                    ? 'border-[var(--brand-rojo)]/50 bg-[var(--brand-rojo)]/5'
                    : 'border-[var(--brand-naranja)]/50 bg-[var(--brand-naranja)]/5'
                }
              >
                <CardContent className="p-3">
                  <div className="flex gap-3">
                    {alert.severity === 'critical' ? (
                      <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--brand-rojo)]" />
                    ) : (
                      <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--brand-naranja)]" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{alert.equipment}</p>
                      <p className="text-xs text-muted-foreground">{alert.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{alert.time}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tendencias de Sensores</CardTitle>
          <CardDescription>Temperatura, presion y vibracion segun lecturas disponibles</CardDescription>
        </CardHeader>
        <CardContent>
          {sensorData.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No hay lecturas de sensores disponibles todavia.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={sensorData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="temp" stroke={CHART_COLORS_LIGHT[0]} name="Temp (C)" />
                <Line type="monotone" dataKey="pressure" stroke={CHART_COLORS_LIGHT[1]} name="Presion (bar)" />
                <Line
                  type="monotone"
                  dataKey="vibration"
                  stroke={CHART_COLORS_LIGHT[2]}
                  name="Vibracion (mm/s)"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
