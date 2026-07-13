'use client';

import useSWR from 'swr';
import { AlertCircle, Bell, Gauge, Signal, TriangleAlert, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TelemetryEquipment {
  id: string;
  name: string;
  type?: string | null;
  status?: string | null;
  availability?: number | string | null;
  activeAlarms?: number | string | null;
  source?: string | null;
}

interface TelemetryAlarm {
  id: string;
  message?: string | null;
  equipment?: string | null;
  time?: string | null;
  severity?: string | null;
}

interface TelemetrySummary {
  total_equipment?: number | string | null;
  operational_equipment?: number | string | null;
  availability_percentage?: number | string | null;
  active_alarms?: number | string | null;
  critical_alarms?: number | string | null;
  downtime_minutes?: number | string | null;
}

interface TelemetryDashboardResponse {
  summary?: TelemetrySummary;
  equipment?: TelemetryEquipment[];
  alarms?: TelemetryAlarm[];
}

const fetcher = async (url: string): Promise<TelemetryDashboardResponse> => {
  const response = await fetch(url, { credentials: 'include' });
  return response.json();
};

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatAlarmTime(value?: string | null) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return date.toLocaleString('es-CL');
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    operational: 'Operativo',
    warning: 'Alerta',
    critical: 'Critico',
    offline: 'Sin senal',
  };
  return labels[String(status || '').toLowerCase()] || status || 'Desconocido';
}

function normalizeStatus(value: string | null | undefined) {
  const status = String(value || '').toLowerCase();
  if (['operational', 'operativo', 'activo', 'active', 'running'].includes(status)) return 'operational';
  if (['warning', 'alerta', 'alarma'].includes(status)) return 'warning';
  if (['critical', 'critico', 'crítico', 'critica', 'crítica'].includes(status)) return 'critical';
  if (['offline', 'inactivo', 'inactive', 'fuera_servicio', 'fuera_de_servicio'].includes(status)) return 'offline';
  return 'operational';
}

export function TelemetryExecutiveSummary() {
  const { data, isLoading, error } = useSWR<TelemetryDashboardResponse>('/api/dashboard/produccion', fetcher, {
    revalidateOnFocus: false,
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Cargando resumen de telemetria...</div>;
  }

  if (error) {
    return <div className="text-sm text-destructive">No fue posible cargar el resumen de telemetria.</div>;
  }

  const summary = data?.summary || {};
  const equipment: TelemetryEquipment[] = Array.isArray(data?.equipment) ? data.equipment : [];
  const alarms: TelemetryAlarm[] = Array.isArray(data?.alarms) ? data.alarms : [];

  const criticalEquipment = equipment
    .map((item) => ({ ...item, normalizedStatus: normalizeStatus(item.status) }))
    .filter((item) => ['critical', 'warning', 'offline'].includes(item.normalizedStatus))
    .sort((a, b) => {
      const order = { critical: 0, warning: 1, offline: 2 };
      return (order[a.normalizedStatus as keyof typeof order] ?? 3) - (order[b.normalizedStatus as keyof typeof order] ?? 3);
    })
    .slice(0, 4);

  const sourceSummary = equipment.reduce<Record<string, number>>((acc, item) => {
    const source = String(item.source || 'production').toLowerCase();
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {});

  const cards = [
    { label: 'Equipos conectados', value: toNumber(summary.total_equipment), icon: Signal, tone: 'text-primary', hint: 'Base real de produccion' },
    { label: 'Operativos', value: toNumber(summary.operational_equipment), icon: Zap, tone: 'text-green-500', hint: 'Con datos vivos' },
    { label: 'Disponibilidad', value: `${toNumber(summary.availability_percentage).toFixed(1)}%`, icon: Gauge, tone: 'text-blue-500', hint: 'Promedio actual' },
    { label: 'Alarmas activas', value: toNumber(summary.active_alarms), icon: Bell, tone: 'text-orange-500', hint: 'Eventos sin cerrar' },
    { label: 'Alarmas criticas', value: toNumber(summary.critical_alarms), icon: TriangleAlert, tone: 'text-destructive', hint: 'Prioridad alta' },
    { label: 'Detencion estimada', value: `${toNumber(summary.downtime_minutes)} min`, icon: AlertCircle, tone: 'text-amber-500', hint: 'Acumulado actual' },
    { label: 'Origen produccion', value: sourceSummary.production || 0, icon: Signal, tone: 'text-cyan-500', hint: 'Equipos desde la red de produccion' },
    { label: 'Origen mantenimiento', value: sourceSummary.maintenance || 0, icon: Bell, tone: 'text-fuchsia-500', hint: 'Activos rescatados desde mantenimiento' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <card.icon className={`h-4 w-4 ${card.tone}`} />
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Focos de telemetria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {criticalEquipment.length > 0 ? (
              criticalEquipment.map((item) => (
                <div key={item.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.type || 'Equipo'}</p>
                    </div>
                    <Badge variant={item.normalizedStatus === 'critical' ? 'destructive' : 'outline'}>
                      {statusLabel(item.normalizedStatus)}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Disponibilidad</span>
                    <span>{Number(item.availability || 0).toFixed(1)}%</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Alarmas activas</span>
                    <span>{Number(item.activeAlarms || 0)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                No hay equipos criticos visibles en este momento.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ultimas alarmas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alarms.length > 0 ? (
              alarms.slice(0, 5).map((alarm) => (
                <div key={alarm.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{alarm.message || 'Alerta operacional'}</p>
                      <p className="text-xs text-muted-foreground">
                        {alarm.equipment || 'Sin equipo'} - {formatAlarmTime(alarm.time)}
                      </p>
                    </div>
                    <Badge variant={String(alarm.severity || '').toLowerCase() === 'critical' ? 'destructive' : 'outline'}>
                      {alarm.severity || 'media'}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                No hay alarmas activas para mostrar.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
