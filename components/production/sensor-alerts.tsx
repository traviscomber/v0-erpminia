'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SensorReading {
  asset_id: string;
  temperature: number | null;
  pressure: number | null;
  vibration: number | null;
  rpm: number | null;
  status: 'normal' | 'alert';
  timestamp: string;
}

interface SensorAlertProps {
  equipmentId?: string;
}

type DashboardEquipment = {
  id: string;
  name: string;
};

type AlarmItem = {
  id: string;
  message?: string;
  severity?: string;
  created_at?: string;
};

async function fetchJson(url: string) {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || 'No se pudo cargar la informacion');
  }

  return payload;
}

export function SensorAlerts({ equipmentId }: SensorAlertProps) {
  const [sensors, setSensors] = useState<SensorReading[]>([]);
  const [alerts, setAlerts] = useState<AlarmItem[]>([]);
  const [resolvedEquipmentId, setResolvedEquipmentId] = useState<string | null>(equipmentId ?? null);
  const [equipmentName, setEquipmentName] = useState('Equipo');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setResolvedEquipmentId(equipmentId ?? null);
  }, [equipmentId]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        let targetId = resolvedEquipmentId;
        let targetName = 'Equipo';

        if (!targetId) {
          const dashboard = await fetchJson('/api/dashboard/produccion');
          const equipment = (dashboard?.equipment || []) as DashboardEquipment[];
          targetId = equipment[0]?.id || null;
          targetName = equipment[0]?.name || targetName;
          setResolvedEquipmentId(targetId);
        }

        if (!targetId) {
          setSensors([]);
          setAlerts([]);
          setLoading(false);
          return;
        }

        const data = await fetchJson(`/api/production/sensors?equipment_id=${encodeURIComponent(targetId)}`);

        setEquipmentName(data?.equipment_name || targetName);
        setSensors(data?.sensor_data ? [data.sensor_data] : []);
        setAlerts(Array.isArray(data?.alarms) ? data.alarms : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo cargar la telemetria');
        setSensors([]);
        setAlerts([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [resolvedEquipmentId]);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Cargando telemetria real...</div>;
  }

  if (error) {
    return <div className="text-sm text-destructive">Error al cargar telemetria: {error}</div>;
  }

  if (sensors.length === 0) {
    return <div className="text-sm text-muted-foreground">No hay telemetria disponible para mostrar.</div>;
  }

  const sensor = sensors[0];

  return (
    <div className="space-y-4">
      {alerts.length > 0 && (
        <Card className="border-red-500 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4" />
              Alerta activa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{alerts[0]?.message || 'El equipo requiere atencion inmediata.'}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-sm">
            <span>{equipmentName}</span>
            <Badge variant={sensor.status === 'alert' ? 'destructive' : 'outline'}>
              {sensor.status === 'alert' ? 'Alerta' : 'Normal'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Temperatura</p>
              <p className="text-lg font-semibold">{sensor.temperature ?? '--'} °C</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Presion</p>
              <p className="text-lg font-semibold">{sensor.pressure ?? '--'} PSI</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vibracion</p>
              <p className="text-lg font-semibold">{sensor.vibration ?? '--'} m/s2</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">RPM</p>
              <p className="text-lg font-semibold">{sensor.rpm ?? '--'}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Ultima lectura: {new Date(sensor.timestamp).toLocaleString('es-CL')}
          </p>
        </CardContent>
      </Card>

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.slice(0, 3).map((alarm) => (
            <div key={alarm.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-start gap-2">
                <Zap className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">{alarm.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {alarm.severity || 'media'} - {new Date(alarm.created_at || new Date().toISOString()).toLocaleTimeString('es-CL')}
                  </p>
                </div>
              </div>
              <Badge variant="outline">{alarm.severity || 'media'}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
