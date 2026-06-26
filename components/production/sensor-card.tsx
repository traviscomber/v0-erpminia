import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp } from 'lucide-react';

interface SensorData {
  id: string;
  name: string;
  value: number;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  min: number;
  max: number;
}

interface SensorCardProps {
  sensor: SensorData;
}

export function SensorCard({ sensor }: SensorCardProps) {
  const statusColor = {
    normal: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    critical: 'bg-red-100 text-red-800',
  };

  const statusLabel = {
    normal: 'Normal',
    warning: 'Advertencia',
    critical: 'Critico',
  };

  return (
    <Card
      className={`border-2 ${
        sensor.status === 'normal' ? 'border-green-200' : sensor.status === 'warning' ? 'border-yellow-200' : 'border-red-200'
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{sensor.name}</CardTitle>
          <Badge className={statusColor[sensor.status]}>{statusLabel[sensor.status]}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{sensor.value.toFixed(1)}</div>
        <p className="mt-1 text-xs text-muted-foreground">
          {sensor.unit} | Min: {sensor.min} | Max: {sensor.max}
        </p>
        <div className="mt-2 flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          <span className="text-xs capitalize">{sensor.trend}</span>
        </div>
      </CardContent>
    </Card>
  );
}
