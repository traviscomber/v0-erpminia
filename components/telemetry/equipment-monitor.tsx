'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const TELEMETRY_REALTIME_ENABLED = process.env.NEXT_PUBLIC_TELEMETRY_REALTIME === 'true';

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

export function EquipmentMonitor() {
  const [supabase] = useState(() => {
    if (!TELEMETRY_REALTIME_ENABLED) {
      return null;
    }

    try {
      return createClient();
    } catch (error) {
      console.error('[telemetry] Supabase client unavailable:', error);
      return null;
    }
  });
  const [equipment, setEquipment] = useState<EquipmentStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEquipmentStatus = async () => {
      if (!supabase) {
        setEquipment([]);
        setLoading(false);
        return;
      }

      try {
        const { data: equipmentData, error: equipError } = await supabase
          .from('equipment')
          .select('id, name, type, status')
          .order('created_at', { ascending: false });

        if (equipError) throw equipError;

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
              .maybeSingle();

            return {
              id: eq.id,
              name: eq.name,
              type: eq.type,
              status: eq.status || 'operational',
              availability: deriveAvailability(eq.status || 'operational'),
              activeAlarms: alarmData?.length || 0,
              lastReading: readingData
                ? {
                    value: typeof readingData.value === 'number' ? readingData.value : Number(readingData.value) || 0,
                    unit: typeof readingData.unit === 'string' ? readingData.unit : '',
                    timestamp:
                      typeof readingData.timestamp === 'string'
                        ? readingData.timestamp
                        : new Date().toISOString(),
                  }
                : undefined,
            } as EquipmentStatus;
          })
        );

        setEquipment(enrichedEquipment);
      } catch (err) {
        console.error('[v0] Error al cargar el estado de equipos:', err);
      } finally {
        setLoading(false);
      }
    };

    if (!TELEMETRY_REALTIME_ENABLED) {
      fetchEquipmentStatus();
      return;
    }

    fetchEquipmentStatus();

    if (!supabase) {
      return;
    }

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
        return <Badge className="bg-destructive/10 text-destructive">Critico</Badge>;
      case 'offline':
        return <Badge className="bg-gray-600/10 text-gray-700">Sin senal</Badge>;
      default:
        return <Badge>Desconocido</Badge>;
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Cargando estado de equipos...</div>;
  }

  if (!supabase) {
    return (
      <Card className="border-dashed border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle>Monitoreo no disponible</CardTitle>
          <CardDescription>
            El realtime de telemetria esta desactivado en este entorno para evitar bloqueos por CSP o redes locales.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          La vista sigue funcionando, pero el monitoreo en tiempo real queda deshabilitado hasta activar `NEXT_PUBLIC_TELEMETRY_REALTIME=true`.
        </CardContent>
      </Card>
    );
  }

  if (equipment.length === 0) {
    return <div className="text-muted-foreground">No hay equipos con telemetria disponible.</div>;
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

  const orderedEquipment = [...equipment].sort((a, b) => {
    const order: Record<string, number> = { critical: 0, warning: 1, offline: 2, operational: 3 };
    return (order[a.status] ?? 4) - (order[b.status] ?? 4) || b.activeAlarms - a.activeAlarms;
  });

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
                  <p className="text-xs text-muted-foreground">Alarmas activas</p>
                  <p className="text-lg font-bold text-yellow-600">{eq.activeAlarms}</p>
                </div>
              </div>

              {eq.lastReading && (
                <div className="border-t border-border/50 pt-2">
                  <p className="text-xs text-muted-foreground">Ultima lectura</p>
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
