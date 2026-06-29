'use client';

import useSWR from 'swr';
import { AlertCircle, Clock, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface TelemetryDashboardProps {
  equipmentId: string;
  equipmentName: string;
}

type TelemetryAlarm = {
  id: string;
  message?: string | null;
  severity?: string | null;
  created_at?: string | null;
  timestamp?: string | null;
};

type TelemetrySnapshot = {
  equipment_name?: string;
  sensor_data?: {
    temperature?: number | null;
    pressure?: number | null;
    vibration?: number | null;
    rpm?: number | null;
    status?: 'normal' | 'alert' | null;
    timestamp?: string | null;
  } | null;
  availability_percentage?: number | null;
  alarms?: TelemetryAlarm[];
  error?: string;
};

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

function formatStatus(value?: string | null) {
  const status = String(value || '').toLowerCase();
  if (status === 'alert') return 'Alerta';
  return 'Operativo';
}

export function TelemetryDashboard({ equipmentId, equipmentName }: TelemetryDashboardProps) {
  const { data, error, isLoading } = useSWR<TelemetrySnapshot>(
    equipmentId ? `/api/production/sensors?equipment_id=${encodeURIComponent(equipmentId)}` : null,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 30000 }
  );

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Cargando telemetria segura...</div>;
  }

  if (error) {
    return (
      <Card className="border-dashed border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="text-sm">Telemetria segura</CardTitle>
          <CardDescription>{equipmentName}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>No se pudo cargar la lectura del equipo desde la API.</p>
          <p>Este panel no abre WebSockets ni realtime, por lo que no se cae por CSP.</p>
        </CardContent>
      </Card>
    );
  }

  const sensor = data?.sensor_data || null;
  const alarms = Array.isArray(data?.alarms) ? data.alarms : [];
  const availability = Number.isFinite(Number(data?.availability_percentage))
    ? Number(data?.availability_percentage)
    : sensor?.status === 'alert'
      ? 75
      : 96;
  const temperature = sensor?.temperature ?? null;
  const pressure = sensor?.pressure ?? null;
  const vibration = sensor?.vibration ?? null;
  const rpm = sensor?.rpm ?? null;
  const statusText = formatStatus(sensor?.status);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="border-border overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${sensor?.status === 'alert' ? 'bg-yellow-500' : 'bg-green-500'}`} />
              <span className="font-semibold">{statusText}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{sensor ? 'Lectura API actualizada' : 'Esperando datos'}</p>
          </CardContent>
        </Card>

        <Card className={`border-border overflow-hidden ${sensor?.status === 'alert' ? 'bg-yellow-500/5' : ''}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Temperatura</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{temperature !== null ? `${Math.round(temperature)} C` : '--'}</div>
            <p className="mt-1 text-xs text-muted-foreground">Ultima lectura</p>
          </CardContent>
        </Card>

        <Card className="border-border overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              Alarmas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{alarms.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">activas</p>
          </CardContent>
        </Card>

        <Card className="border-border overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Actualizacion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">API</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{sensor?.timestamp ? 'Hace segundos' : '--'}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>Telemetria segura</CardTitle>
          <CardDescription>{data?.equipment_name || equipmentName}</CardDescription>
        </CardHeader>
        <CardContent>
          {sensor ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Temperatura</p>
                <p className="text-lg font-semibold">{temperature !== null ? `${Math.round(temperature)} C` : '--'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Presion</p>
                <p className="text-lg font-semibold">{pressure !== null ? `${Math.round(pressure)} PSI` : '--'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Vibracion</p>
                <p className="text-lg font-semibold">{vibration !== null ? `${Number(vibration).toFixed(1)} m/s2` : '--'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">RPM</p>
                <p className="text-lg font-semibold">{rpm !== null ? Math.round(rpm) : '--'}</p>
              </div>
              <div className="md:col-span-4 rounded-lg border border-border/60 bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Disponibilidad</p>
                <p className="text-2xl font-bold">{Math.round(availability)}%</p>
              </div>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              Esperando lectura de API...
            </div>
          )}
        </CardContent>
      </Card>

      {alarms.length > 0 ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">Alarmas Activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alarms.slice(0, 5).map((alarm) => (
                <div
                  key={alarm.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border/50 bg-background/50 p-3"
                >
                  <div className="flex flex-1 items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                    <div>
                      <p className="text-sm font-medium">{alarm.message || 'Alerta operacional'}</p>
                      <p className="text-xs text-muted-foreground">
                        {alarm.severity || 'media'} -{' '}
                        {new Date(alarm.created_at || alarm.timestamp || new Date().toISOString()).toLocaleTimeString('es-CL')}
                      </p>
                    </div>
                  </div>
                  <Badge variant={String(alarm.severity || '').toLowerCase() === 'critical' ? 'destructive' : 'outline'}>
                    {alarm.severity || 'media'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4 text-[var(--brand-naranja)]" />
            Sin WebSocket
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Este panel funciona solo con API y no depende de realtime. Eso lo hace seguro para la red local y para CSP
          estrictas en produccion.
        </CardContent>
      </Card>
    </div>
  );
}
