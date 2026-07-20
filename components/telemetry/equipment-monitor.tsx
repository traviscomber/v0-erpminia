'use client';

import useSWR from 'swr';
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type DashboardEquipment = {
  id: string;
  name: string;
  type: string;
  status: string;
  source?: string | null;
  availability?: number;
  alarms?: number;
  temperature?: number | null;
  pressure?: number | null;
  vibration?: number | null;
};

type DashboardReading = {
  equipment_id?: string | null;
  timestamp?: string | null;
  temperature?: number | null;
  pressure?: number | null;
  vibration?: number | null;
};

type DashboardPayload = {
  equipment?: DashboardEquipment[];
  readings?: DashboardReading[];
};

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

function deriveUnit(reading: DashboardReading) {
  if (reading.temperature !== null && reading.temperature !== undefined) return 'C';
  if (reading.pressure !== null && reading.pressure !== undefined) return 'PSI';
  if (reading.vibration !== null && reading.vibration !== undefined) return 'm/s2';
  return '';
}

function deriveValue(reading: DashboardReading) {
  const value = reading.temperature ?? reading.pressure ?? reading.vibration ?? 0;
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function deriveAvailability(status: string) {
  switch (status) {
    case 'operational':
      return 100;
    case 'warning':
      return 85;
    case 'critical':
      return 60;
    case 'offline':
      return 0;
    default:
      return 90;
  }
}

function normalizeStatus(status: string | null | undefined) {
  const value = String(status || '').trim().toLowerCase();
  if (['operational', 'operativo', 'activo', 'active', 'running'].includes(value)) return 'operational';
  if (['warning', 'alerta', 'alarma'].includes(value)) return 'warning';
  if (['critical', 'critico', 'crítico', 'critica', 'crítica'].includes(value)) return 'critical';
  if (['offline', 'inactivo', 'inactive', 'fuera_servicio', 'fuera_de_servicio'].includes(value)) return 'offline';
  return 'operational';
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

export function EquipmentMonitor() {
  const { data, error, isLoading } = useSWR<DashboardPayload>('/api/dashboard/produccion', fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: false,
  });

  if (isLoading) {
    return <div className="text-muted-foreground">Cargando estado de equipos...</div>;
  }

  if (error) {
    return (
      <Card className="border-dashed border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle>Monitoreo no disponible</CardTitle>
          <CardDescription>No se pudo leer el resumen de produccion para mostrar el estado de equipos.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          La vista sigue estable y reintentará automáticamente la lectura por API.
        </CardContent>
      </Card>
    );
  }

  const equipmentSource = Array.isArray(data?.equipment) ? data.equipment : [];
  const readings = Array.isArray(data?.readings) ? data.readings : [];
  const latestReadingByEquipment = new Map<string, DashboardReading>();

  for (const reading of readings) {
    const equipmentId = reading.equipment_id || null;
    if (!equipmentId || latestReadingByEquipment.has(equipmentId)) continue;
    latestReadingByEquipment.set(equipmentId, reading);
  }

  const equipment = equipmentSource.map((item) => {
    const normalizedStatus = normalizeStatus(item.status);
    const latestReading = latestReadingByEquipment.get(item.id);

    return {
      id: item.id,
      name: item.name,
      type: item.type,
      status: normalizedStatus,
      source: String(item.source || 'production').toLowerCase(),
      availability: Number.isFinite(Number(item.availability))
        ? Number(item.availability)
        : deriveAvailability(normalizedStatus),
      activeAlarms: Number(item.alarms || 0),
      lastReading: latestReading
        ? {
            value: deriveValue(latestReading),
            unit: deriveUnit(latestReading),
            timestamp: latestReading.timestamp || new Date().toISOString(),
          }
        : undefined,
    };
  });

  if (equipment.length === 0) {
    return <div className="text-muted-foreground">No hay equipos con telemetría disponible.</div>;
  }

  const summary = equipment.reduce(
    (acc, item) => {
      acc.total += 1;
      acc.operational += item.status === 'operational' ? 1 : 0;
      acc.warning += item.status === 'warning' ? 1 : 0;
      acc.critical += item.status === 'critical' ? 1 : 0;
      acc.offline += item.status === 'offline' ? 1 : 0;
      acc.availability += item.availability;
      return acc;
    },
    { total: 0, operational: 0, warning: 0, critical: 0, offline: 0, availability: 0 },
  );

  const sourceSummary = equipment.reduce<Record<string, number>>((acc, item) => {
    const source = item.source || 'production';
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {});

  const orderedEquipment = [...equipment].sort((a, b) => {
    const order: Record<string, number> = { critical: 0, warning: 1, offline: 2, operational: 3 };
    return (order[a.status] ?? 4) - (order[b.status] ?? 4) || b.activeAlarms - a.activeAlarms;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'offline':
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <CheckCircle2 className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'operational':
        return <Badge className="bg-green-600/10 text-green-700">Operativo</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-600/10 text-yellow-700">Alerta</Badge>;
      case 'critical':
        return <Badge className="bg-destructive/10 text-destructive">Critico</Badge>;
      case 'offline':
        return <Badge className="bg-gray-600/10 text-gray-700">Sin senal</Badge>;
      default:
        return <Badge>Desconocido</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <Card className="border-border/70">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{summary.total}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Operativos</p>
            <p className="text-2xl font-bold text-green-600">{summary.operational}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Alertas</p>
            <p className="text-2xl font-bold text-yellow-600">{summary.warning}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Criticos</p>
            <p className="text-2xl font-bold text-destructive">{summary.critical}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Sin senal</p>
            <p className="text-2xl font-bold text-slate-500">{summary.offline}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Disponibilidad</p>
            <p className="text-2xl font-bold">{summary.total > 0 ? Math.round(summary.availability / summary.total) : 0}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span className="rounded-full border border-border px-2 py-1">Produccion: {sourceSummary.production || 0}</span>
        <span className="rounded-full border border-border px-2 py-1">Mantenimiento: {sourceSummary.maintenance || 0}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {orderedEquipment.map((eq) => (
          <Card key={eq.id} className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    {getStatusIcon(eq.status)}
                    <CardTitle className="text-sm">{eq.name}</CardTitle>
                  </div>
                  <CardDescription className="text-xs">{eq.type}</CardDescription>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {getStatusBadge(eq.status)}
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                    {eq.source === 'maintenance' ? 'Mantenimiento' : 'Produccion'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Disponibilidad</p>
                    <p className="text-lg font-bold">{eq.availability}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Alarmas activas</p>
                    <p className="text-lg font-bold text-yellow-600">{eq.activeAlarms}</p>
                  </div>
                </div>

                {eq.lastReading && (
                  <div className="border-t border-border/50 pt-2">
                    <p className="text-xs text-muted-foreground">Última lectura</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-semibold">{eq.lastReading.value}</span>
                      <span className="text-xs text-muted-foreground">{eq.lastReading.unit}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(eq.lastReading.timestamp).toLocaleTimeString('es-CL')}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
