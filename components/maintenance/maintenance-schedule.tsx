'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';

interface Schedule {
  id: string;
  assetName: string;
  taskName: string;
  nextScheduledDate: string;
  priority: 'low' | 'medium' | 'high';
  daysUntil: number;
}

interface MaintenanceScheduleProps {
  schedules: Schedule[];
  onMarkComplete?: (scheduleId: string) => void;
}

const priorityColors = {
  low: 'bg-secondary/20 text-secondary',
  medium: 'bg-primary/20 text-primary',
  high: 'bg-yellow-500/20 text-yellow-700',
};

const getUrgency = (daysUntil: number | undefined) => {
  if (daysUntil === undefined || daysUntil === null) {
    return { color: 'text-muted-foreground', label: 'Pendiente de programacion' };
  }
  if (daysUntil <= 0) return { color: 'text-destructive', label: 'Vencido' };
  if (daysUntil <= 1) return { color: 'text-yellow-700', label: 'Hoy' };
  if (daysUntil <= 3) return { color: 'text-yellow-600', label: 'Pronto' };
  return { color: 'text-foreground', label: `En ${daysUntil} dias` };
};

export function MaintenanceSchedule({ schedules, onMarkComplete }: MaintenanceScheduleProps) {
  return (
    <div className="space-y-3">
      {schedules.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay mantenimientos programados en los proximos 7 dias
          </CardContent>
        </Card>
      ) : (
        schedules.map((schedule) => {
          const urgency = getUrgency(schedule.daysUntil);
          return (
            <Card key={schedule.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold">{schedule.taskName}</h4>
                    <p className="text-sm text-muted-foreground">{schedule.assetName}</p>
                    <div className="mt-2 flex gap-2">
                      <Badge className={priorityColors[schedule.priority]}>{schedule.priority}</Badge>
                      <span className={`text-sm ${urgency.color}`}>
                        <Calendar className="mr-1 inline h-3 w-3" />
                        {urgency.label}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={(schedule.daysUntil ?? 999) <= 0 ? 'default' : 'outline'}
                    onClick={() => onMarkComplete?.(schedule.id)}
                  >
                    Marcar como completado
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
