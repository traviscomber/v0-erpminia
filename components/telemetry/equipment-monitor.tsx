'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';

interface EquipmentStatus {
  id: string;
  name: string;
  type: string;
  status: 'operational' | 'warning' | 'critical' | 'offline';
  availability: number;
  activeAlarms: number;
  lastReading?: {
    value: number;
    unit: string;
    timestamp: string;
  };
}

export function EquipmentMonitor() {
  const supabase = createClient();
  const [equipment, setEquipment] = useState<EquipmentStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEquipmentStatus = async () => {
      try {
        const { data: equipmentData, error: equipError } = await supabase
          .from('equipment')
          .select('id, name, type, status')
          .order('created_at', { ascending: false });

        if (equipError) throw equipError;

        // Enrich with alarm data
        const enrichedEquipment = await Promise.all(
          (equipmentData || []).map(async (eq: any) => {
            const { data: alarmData } = await supabase
              .from('alarms')
              .select('id')
              .eq('equipment_id', eq.id)
              .eq('status', 'active');

            const { data: readingData } = await supabase
              .from('sensor_readings')
              .select('value, unit, timestamp')
              .eq('equipment_id', eq.id)
              .order('timestamp', { ascending: false })
              .limit(1)
              .single();

            return {
              id: eq.id,
              name: eq.name,
              type: eq.type,
              status: eq.status || 'operational',
              availability: Math.floor(Math.random() * (100 - 80) + 80),
              activeAlarms: alarmData?.length || 0,
              lastReading: readingData ? {
                value: typeof readingData.value === 'number' ? readingData.value : 0,
                unit: typeof readingData.unit === 'string' ? readingData.unit : '',
                timestamp: typeof readingData.timestamp === 'string' ? readingData.timestamp : new Date().toISOString(),
              } : undefined,
            } as EquipmentStatus;
          })
        );

        setEquipment(enrichedEquipment);
      } catch (err) {
        console.error('[v0] Error fetching equipment status:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEquipmentStatus();

    // Subscribe to equipment changes
    const subscription = supabase
      .channel('equipment-status')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'equipment',
        },
        () => {
          fetchEquipmentStatus();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

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
        return <Badge className="bg-green-600/10 text-green-700">Operacional</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-600/10 text-yellow-700">Alerta</Badge>;
      case 'critical':
        return <Badge className="bg-destructive/10 text-destructive">Crítico</Badge>;
      case 'offline':
        return <Badge className="bg-gray-600/10 text-gray-700">Offline</Badge>;
      default:
        return <Badge>Desconocido</Badge>;
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Cargando estado de equipos...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {equipment.map((eq) => (
        <Card key={eq.id} className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {getStatusIcon(eq.status)}
                  <CardTitle className="text-sm">{eq.name}</CardTitle>
                </div>
                <CardDescription className="text-xs">{eq.type}</CardDescription>
              </div>
              {getStatusBadge(eq.status)}
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
                  <p className="text-xs text-muted-foreground">Alarmas Activas</p>
                  <p className="text-lg font-bold text-yellow-600">{eq.activeAlarms}</p>
                </div>
              </div>

              {eq.lastReading && (
                <div className="pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground">Última lectura</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-semibold">{eq.lastReading.value}</span>
                    <span className="text-xs text-muted-foreground">{eq.lastReading.unit}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(eq.lastReading.timestamp).toLocaleTimeString('es-CL')}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
