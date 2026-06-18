'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Zap } from 'lucide-react';

interface SensorReading {
  asset_id: string;
  temperature: number;
  pressure: number;
  vibration: number;
  rpm: number;
  status: 'normal' | 'alert';
  timestamp: string;
}

export function SensorAlerts() {
  const [sensors, setSensors] = useState<SensorReading[]>([]);
  const [alerts, setAlerts] = useState<number>(0);

  useEffect(() => {
    const fetchSensors = async () => {
      try {
        const res = await fetch('/api/production/sensorsasset_id=SIM-001');
        if (res.ok) {
          const { sensor_data } = await res.json();
          setSensors([sensor_data]);
          if (sensor_data.status === 'alert') setAlerts(1);
          else setAlerts(0);
        }
      } catch (err) {
        console.error('[v0] Sensors fetch error:', err);
      }
    };

    fetchSensors();
    const interval = setInterval(fetchSensors, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      {alerts > 0 && (
        <Card className="border-red-500 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" /> Active Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Equipment requires attention. Work order auto-created.</p>
          </CardContent>
        </Card>
      )}

      {sensors.map(sensor => (
        <Card key={sensor.asset_id}>
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Equipment {sensor.asset_id}</span>
              <Badge variant={sensor.status === 'alert' ? 'destructive' : 'outline'}>
                {sensor.status === 'alert' ? 'Alert' : 'Normal'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Temperature</p>
                <p className="text-lg font-semibold">{sensor.temperature}°C</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pressure</p>
                <p className="text-lg font-semibold">{sensor.pressure} PSI</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Vibration</p>
                <p className="text-lg font-semibold">{sensor.vibration} m/s²</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">RPM</p>
                <p className="text-lg font-semibold">{sensor.rpm}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
