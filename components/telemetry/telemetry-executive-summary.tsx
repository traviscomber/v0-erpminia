'use client';

import useSWR from 'swr';
import { AlertCircle, Bell, Gauge, Signal, TriangleAlert, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    operational: 'Operativo',
    warning: 'Alerta',
    critical: 'Critico',
    offline: 'Sin senal',
  };
  return labels[status] || status || 'Desconocido';
}

export function TelemetryExecutiveSummary() {
  const { data, isLoading, error } = useSWR('/api/dashboard/produccion', fetcher, {
    revalidateOnFocus: false,
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Cargando resumen de telemetria...</div>;
  }

  if (error) {
    return <div className="text-sm text-destructive">No fue posible cargar el resumen de telemetria.</div>;
  }

  const summary = data?.summary || {};
  const equipment = Array.isArray(data?.equipment) ? data.equipment : [];
  const alarms = Array.isArray(data?.alarms) ? data.alarms : [];

  const criticalEquipment = equipment
    .filter((item: any) => ['critical', 'warning', 'offline'].includes(String(item.status || '').toLowerCase()))
    .sort((a: any, b: any) => {
      const order = { critical: 0, warning: 1, offline: 2 };
      return (order[String(a.status || '').toLowerCase() as keyof typeof order] ?? 3) - (order[String(b.status || '').toLowerCase() as keyof typeof order] ?? 3);
    })
    .slice(0, 4);

  const cards = [
    { label: 'Equipos conectados', value: toNumber(summary.total_equipment), icon: Signal, tone: 'text-primary', hint: 'Base real de produccion' },
    { label: 'Operativos', value: toNumber(summary.operational_equipment), icon: Zap, tone: 'text-green-500', hint: 'Con datos vivos' },
    { label: 'Disponibilidad', value: `${toNumber(summary.availability_percentage).toFixed(1)}%`, icon: Gauge, tone: 'text-blue-500', hint: 'Promedio actual' },
    { label: 'Alarmas activas', value: toNumber(summary.active_alarms), icon: Bell, tone: 'text-orange-500', hint: 'Eventos sin cerrar' },
    { label: 'Alarmas criticas', value: toNumber(summary.critical_alarms), icon: TriangleAlert, tone: 'text-destructive', hint: 'Prioridad alta' },
    { label: 'Detencion estimada', value: `${toNumber(summary.downtime_minutes)} min`, icon: AlertCircle, tone: 'text-amber-500', hint: 'Acumulado actual' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
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
              criticalEquipment.map((item: any) => (
                <div key={item.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.type || 'Equipo'}</p>
                    </div>
                    <Badge variant={String(item.status || '').toLowerCase() === 'critical' ? 'destructive' : 'outline'}>
                      {statusLabel(String(item.status || ''))}
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
              alarms.slice(0, 5).map((alarm: any) => (
                <div key={alarm.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{alarm.message || 'Alerta operacional'}</p>
                      <p className="text-xs text-muted-foreground">
                        {alarm.equipment || 'Sin equipo'} - {alarm.time ? new Date(alarm.time).toLocaleString('es-CL') : 'Sin fecha'}
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
