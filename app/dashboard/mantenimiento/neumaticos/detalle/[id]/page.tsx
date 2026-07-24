'use client';
import { useEffect, useState } from 'react';
import { TireTimeline } from '@/components/maintenance/tire-timeline';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle } from 'lucide-react';

interface TireDetail {
  id: string;
  tire_code: string;
  tire_name: string;
  brand: string;
  model: string;
  size: string;
  current_lifecycle_status: string;
  current_location: string;
  repair_count: number;
  total_hours_used: number;
  purchase_price: number;
  installed_on_equipment: string;
}

interface TimelineEvent {
  id: string;
  event_type: string;
  event_timestamp: string;
  created_by: string;
  location: string;
  notes: string;
}

export default function TireDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [tireId, setTireId] = useState('');
  const [tire, setTire] = useState<TireDetail | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { id } = await params;
      setTireId(id);

      try {
        const response = await fetch(`/api/maintenance/tires/${id}`);
        if (!response.ok) throw new Error('Error loading tire details');

        const data = await response.json();
        setTire(data.tire);
        setEvents(data.events || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading tire');
      } finally {
        setLoading(false);
      }
    })();
  }, [params]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !tire) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <Card className="p-6 border-destructive bg-destructive/10">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <h3 className="font-semibold">Error</h3>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    in_stock: 'bg-gray-500',
    installed: 'bg-green-600',
    in_repair: 'bg-yellow-600',
    waiting_repair: 'bg-orange-600',
    awaiting_transport: 'bg-blue-600',
    retired: 'bg-red-600',
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{tire.tire_name}</h1>
            <p className="text-muted-foreground mt-2">Código: {tire.tire_code}</p>
          </div>
          <Badge className={`${statusColors[tire.current_lifecycle_status] || 'bg-gray-500'} text-white`}>
            {tire.current_lifecycle_status.replace(/_/g, ' ').toUpperCase()}
          </Badge>
        </div>

        {/* Tire Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 bg-card border-border">
            <div className="text-sm text-muted-foreground">Marca/Modelo</div>
            <div className="font-semibold mt-2 text-foreground">{tire.brand} {tire.model}</div>
          </Card>
          <Card className="p-4 bg-card border-border">
            <div className="text-sm text-muted-foreground">Tamaño</div>
            <div className="font-semibold mt-2 text-foreground">{tire.size}</div>
          </Card>
          <Card className="p-4 bg-card border-border">
            <div className="text-sm text-muted-foreground">Reparaciones</div>
            <div className="font-semibold mt-2 text-foreground">{tire.repair_count}</div>
          </Card>
          <Card className="p-4 bg-card border-border">
            <div className="text-sm text-muted-foreground">Horas en Uso</div>
            <div className="font-semibold mt-2 text-foreground">{tire.total_hours_used.toFixed(1)}h</div>
          </Card>
        </div>

        {/* Location and Equipment */}
        <Card className="p-4 bg-card border-border space-y-3">
          <h3 className="font-semibold">Ubicación Actual</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Ubicación</div>
              <div className="font-semibold mt-1 text-foreground">{tire.current_location}</div>
            </div>
            {tire.installed_on_equipment && (
              <div>
                <div className="text-sm text-muted-foreground">Equipo Instalado</div>
                <div className="font-semibold mt-1 text-foreground">{tire.installed_on_equipment}</div>
              </div>
            )}
          </div>
        </Card>

        {/* Timeline */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Historial de Eventos</h2>
          <TireTimeline events={events} />
        </div>

        {/* Info */}
        <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>Trazabilidad Completa:</strong> Cada evento, ubicación, técnico y fotografía está registrado. 
            Use este historial para auditorías y análisis de rendimiento.
          </p>
        </Card>
      </div>
    </div>
  );
}
