import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, AlertCircle, Clock, Zap } from 'lucide-react';

interface EquipmentStats {
  id: string;
  name: string;
  status: 'operational' | 'maintenance' | 'standby' | 'error';
  uptime_percentage: number;
  last_maintenance: Date;
  next_maintenance: Date;
  efficiency: number;
  temperature: number;
  power_consumption: number;
}

interface EquipmentStatsCardProps {
  equipment: EquipmentStats;
}

export function EquipmentStatsCard({ equipment }: EquipmentStatsCardProps) {
  const statusConfig = {
    operational: { color: 'bg-green-100 text-green-800', label: 'Operativo' },
    maintenance: { color: 'bg-yellow-100 text-yellow-800', label: 'Mantenimiento' },
    standby: { color: 'bg-blue-100 text-blue-800', label: 'En Standby' },
    error: { color: 'bg-red-100 text-red-800', label: 'Error' },
  };

  const config = statusConfig[equipment.status];

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{equipment.name}</CardTitle>
          <Badge className={config.color}>{config.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Eficiencia</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${equipment.efficiency}%` }}
              />
            </div>
            <p className="text-sm font-semibold mt-1">{equipment.efficiency}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Disponibilidad</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${equipment.uptime_percentage}%` }}
              />
            </div>
            <p className="text-sm font-semibold mt-1">{equipment.uptime_percentage}%</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            <span>{equipment.temperature}°C</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-600" />
            <span>{equipment.power_consumption}kW</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-600" />
            <span>{new Date(equipment.last_maintenance).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-600" />
            <span>{new Date(equipment.next_maintenance).toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
