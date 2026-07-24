'use client';
import { Card } from '@/components/ui/card';
import { AlertCircle, Truck, Wrench, CheckCircle, Clock } from 'lucide-react';

interface TimelineEvent {
  id: string;
  event_type: string;
  event_timestamp: string;
  created_by: string;
  location: string;
  notes: string;
}

interface TireTimelineProps {
  events: TimelineEvent[];
  photos?: Record<string, string[]>;
}

const eventIcons: Record<string, React.ReactNode> = {
  damage_reported: <AlertCircle className="h-5 w-5 text-destructive" />,
  in_transport: <Truck className="h-5 w-5 text-yellow-500" />,
  received_workshop: <Truck className="h-5 w-5 text-blue-500" />,
  repair_started: <Wrench className="h-5 w-5 text-orange-500" />,
  repair_completed: <Wrench className="h-5 w-5 text-green-600" />,
  installed: <CheckCircle className="h-5 w-5 text-green-700" />,
};

const eventLabels: Record<string, string> = {
  damage_reported: 'Daño Reportado',
  in_transport: 'En Transporte',
  received_workshop: 'Recibido en Taller',
  repair_started: 'Reparación Iniciada',
  repair_completed: 'Reparación Completada',
  installed: 'Reinstalado',
};

export function TireTimeline({ events, photos }: TireTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <Card className="p-4 text-center text-muted-foreground">
        Sin eventos registrados aún
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event, idx) => (
        <Card key={event.id} className="p-3 border-l-4 border-l-blue-500">
          <div className="flex gap-3">
            <div className="pt-1">{eventIcons[event.event_type] || <Clock className="h-5 w-5" />}</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">
                {eventLabels[event.event_type] || event.event_type}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {new Date(event.event_timestamp).toLocaleString()}
              </div>
              {event.location && (
                <div className="text-xs text-muted-foreground">
                  📍 {event.location}
                </div>
              )}
              {event.notes && (
                <div className="text-xs mt-1 text-foreground">
                  {event.notes}
                </div>
              )}
              {event.created_by && (
                <div className="text-xs text-muted-foreground mt-1">
                  Reportado por: {event.created_by}
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
