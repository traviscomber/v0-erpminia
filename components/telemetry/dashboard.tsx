'use client';

import { useRealtimeSensors, useRealtimeAlarms } from '@/hooks/use-realtime';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, TrendingUp, Gauge, Zap, Clock } from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface TelemetryDashboardProps {
  equipmentId: string;
  equipmentName: string;
}

const TELEMETRY_REALTIME_ENABLED = process.env.NEXT_PUBLIC_TELEMETRY_REALTIME === 'true';

export function TelemetryDashboard({ equipmentId, equipmentName }: TelemetryDashboardProps) {
  return TELEMETRY_REALTIME_ENABLED ? (
    <TelemetryDashboardLive equipmentId={equipmentId} equipmentName={equipmentName} />
  ) : (
    <TelemetryDashboardSafe equipmentName={equipmentName} />
  );
}

function TelemetryDashboardSafe({ equipmentName }: Pick<TelemetryDashboardProps, 'equipmentName'>) {
  return (
    <div className="space-y-4">
      <Card className="border-dashed border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="text-sm">Telemetria segura</CardTitle>
          <CardDescription>{equipmentName}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            El monitoreo realtime esta desactivado en este entorno para evitar bloqueos por CSP o redes locales.
          </p>
          <p>
            Cuando se active `NEXT_PUBLIC_TELEMETRY_REALTIME=true`, esta vista volvera a consumir lecturas vivas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function TelemetryDashboardLive({ equipmentId, equipmentName }: TelemetryDashboardProps) {
  const { readings, isConnected, error } = useRealtimeSensors(equipmentId);
  const { alarms, unreadCount, acknowledgeAlarm } = useRealtimeAlarms();

  // Format readings for charting
  const chartData = [...readings]
    .reverse()
    .map((r) => ({
      timestamp: new Date(r.timestamp).toLocaleTimeString('es-CL'),
      value: r.value,
      status: r.status,
    }))
    .slice(-20);

  const lastReading = readings[0];
  const isWarning = lastReading?.status === 'warning';
  const isCritical = lastReading?.status === 'critical';

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border overflow-hidden">
          <CardHeader className="pb-3 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Estado
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="flex items-center gap-2">
              <div
                className={`h-3 w-3 rounded-full ${
                  isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`}
              />
              <span className="font-semibold">
                {isConnected ? 'En vivo' : 'Desconectado'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {lastReading ? 'Datos actualizándose' : 'Esperando datos'}
            </p>
          </CardContent>
        </Card>

        <Card
          className={`border-border overflow-hidden ${
            isCritical ? 'bg-destructive/5' : isWarning ? 'bg-yellow-500/5' : ''
          }`}
        >
          <CardHeader className="pb-3 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Temperatura
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div
              className={`text-2xl font-bold ${
                isCritical ? 'text-destructive' : isWarning ? 'text-yellow-600' : ''
              }`}
            >
              {lastReading ? `${Math.round(lastReading.value)}°C` : '--'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">última lectura</p>
          </CardContent>
        </Card>

        <Card className="border-border overflow-hidden">
          <CardHeader className="pb-3 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              Alarmas
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold text-yellow-600">{unreadCount}</div>
            <p className="text-xs text-muted-foreground mt-1">sin reconocer</p>
          </CardContent>
        </Card>

        <Card className="border-border overflow-hidden">
          <CardHeader className="pb-3 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Actualización
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">En vivo</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {lastReading ? 'Hace segundos' : '--'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Telemetría en Vivo</CardTitle>
          <CardDescription>{equipmentName}</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    border: 'none',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorValue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Esperando datos...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alarms List */}
      {alarms.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">Alarmas Activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alarms.slice(0, 5).map((alarm: any) => (
                <div
                  key={alarm.id}
                  className="flex items-start justify-between gap-3 p-3 bg-background/50 rounded-lg border border-border/50"
                >
                  <div className="flex items-start gap-2 flex-1">
                    <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">{alarm.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {alarm.severity} - {new Date(alarm.created_at).toLocaleTimeString('es-CL')}
                      </p>
                    </div>
                  </div>
                  {!alarm.acknowledged_at && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => acknowledgeAlarm(alarm.id)}
                    >
                      OK
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
