'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, Users, Trash2 } from 'lucide-react';
import useSWR from 'swr';

interface CalendarEvent {
  id: string;
  titulo: string;
  tipo_evento: string;
  fecha_inicio: string;
  fecha_fin?: string;
  ubicacion?: string;
  descripcion?: string;
  responsable?: string;
  estado: 'programado' | 'completado' | 'cancelado';
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function CalendarioSostenibilidadPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2024, 4)); // May 2024
  const [viewMode, setViewMode] = useState<'mes' | 'semana' | 'lista'>('mes');

  const { data: events = [] } = useSWR('/api/sostenibilidad/calendario', fetcher);
  const eventList = (events.data || []) as CalendarEvent[];

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const monthName = currentDate.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Brandbook: primary (naranja), secondary (verde), destructive (rojo), muted (gris)
  const eventTypeColors = {
    inspeccion_interna: 'bg-muted text-muted-foreground',
    inspeccion_externa: 'bg-primary/10 text-primary',
    capacitacion: 'bg-secondary/10 text-secondary',
    tarea: 'bg-primary/10 text-primary',
    auditoria: 'bg-destructive/10 text-destructive',
    otra: 'bg-muted text-muted-foreground',
  };

  const getEventsForDay = (day: number) => {
    return eventList.filter((event) => {
      const eventDate = new Date(event.fecha_inicio);
      return (
        eventDate.getDate() === day &&
        eventDate.getMonth() === currentDate.getMonth() &&
        eventDate.getFullYear() === currentDate.getFullYear()
      );
    });
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Calendario de Eventos - Sostenibilidad</h1>
          <p className="text-muted-foreground">Centraliza inspecciones, capacitaciones, auditorías y tareas</p>
        </div>
        <Button className="bg-[var(--brand-naranja)] text-white hover:bg-[var(--brand-naranja)]/90">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Evento
        </Button>
      </div>

      {/* View Mode Selector */}
      <div className="mb-6 flex gap-2">
        <Button
          variant={viewMode === 'mes' ? 'default' : 'outline'}
          onClick={() => setViewMode('mes')}
        >
          Vista Mes
        </Button>
        <Button
          variant={viewMode === 'semana' ? 'default' : 'outline'}
          onClick={() => setViewMode('semana')}
        >
          Vista Semana
        </Button>
        <Button
          variant={viewMode === 'lista' ? 'default' : 'outline'}
          onClick={() => setViewMode('lista')}
        >
          Vista Lista
        </Button>
      </div>

      {viewMode === 'mes' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={previousMonth}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <h2 className="text-xl font-bold capitalize">{monthName}</h2>
                <Button variant="outline" size="icon" onClick={nextMonth}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                {eventList.length} eventos este mes
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sab', 'Dom'].map((day) => (
                <div key={day} className="text-center font-semibold text-sm text-muted-foreground py-2">
                  {day}
                </div>
              ))}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-white/5 rounded-lg min-h-24"></div>
              ))}
              {days.map((day) => {
                const dayEvents = getEventsForDay(day);
                return (
                  <div
                    key={day}
                    className="bg-white/5 rounded-lg p-2 min-h-24 border border-white/10 hover:border-white/20 transition"
                  >
                    <div className="font-bold text-sm mb-1">{day}</div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className={`text-xs px-2 py-1 rounded truncate ${
                            eventTypeColors[event.tipo_evento as keyof typeof eventTypeColors] ||
                            eventTypeColors.otra
                          }`}
                        >
                          {event.titulo}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-xs text-muted-foreground px-2">
                          +{dayEvents.length - 2} más
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {viewMode === 'lista' && (
        <Card>
          <CardHeader>
            <CardTitle>Próximos Eventos</CardTitle>
            <CardDescription>Listado de todos los eventos programados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {eventList
                .filter((e) => e.estado === 'programado')
                .sort((a, b) => new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime())
                .map((event) => (
                  <div
                    key={event.id}
                    className="border border-white/10 rounded-lg p-4 hover:bg-white/5 transition"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3 flex-1">
                        <Badge
                          className={
                            eventTypeColors[event.tipo_evento as keyof typeof eventTypeColors] ||
                            eventTypeColors.otra
                          }
                        >
                          {event.tipo_evento}
                        </Badge>
                        <h3 className="font-bold">{event.titulo}</h3>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        {new Date(event.fecha_inicio).toLocaleDateString('es-CL')}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {new Date(event.fecha_inicio).toLocaleTimeString('es-CL', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      {event.ubicacion && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {event.ubicacion}
                        </div>
                      )}
                      {event.responsable && (
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          {event.responsable}
                        </div>
                      )}
                    </div>
                    {event.descripcion && (
                      <p className="text-sm text-muted-foreground mt-2">{event.descripcion}</p>
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
