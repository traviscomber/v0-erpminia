'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, Users, Trash2 } from 'lucide-react';
import useSWR from 'swr';
import { DemoDataBadge } from '@/components/sostenibilidad/demo-data-badge';
import { mockCalendarioData, addMockDataIfEmpty } from '@/lib/mock-data-sostenibilidad';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    tipo_evento: 'tarea',
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: '',
    ubicacion: '',
    descripcion: '',
    responsable: '',
    estado: 'programado',
  });

  const { data: events = [], mutate } = useSWR('/api/sostenibilidad/calendario', fetcher);
  const eventList = addMockDataIfEmpty(events.data || events, mockCalendarioData) as CalendarEvent[];

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/sostenibilidad/calendario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('Evento creado correctamente');
        setIsModalOpen(false);
        setFormData({
          titulo: '',
          tipo_evento: 'tarea',
          fecha_inicio: new Date().toISOString().split('T')[0],
          fecha_fin: '',
          ubicacion: '',
          descripcion: '',
          responsable: '',
          estado: 'programado',
        });
        mutate();
      } else {
        toast.error('Error al crear evento');
      }
    } catch (error) {
      console.error('[v0] Error creating calendar event:', error);
      toast.error('Error al crear evento');
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-foreground">Calendario de Eventos - Sostenibilidad</h1>
            {(!events || (events.data && events.data.length === 0) || (Array.isArray(events) && events.length === 0)) && <DemoDataBadge />}
          </div>
          <p className="text-muted-foreground">Centraliza inspecciones, capacitaciones, auditorías y tareas</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Evento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nuevo Evento</DialogTitle>
              <DialogDescription>
                Crea un nuevo evento en el calendario
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="titulo">Título</Label>
                <Input
                  id="titulo"
                  name="titulo"
                  value={formData.titulo}
                  onChange={handleInputChange}
                  placeholder="Ej: Inspección interna"
                  required
                />
              </div>
              <div>
                <Label htmlFor="tipo">Tipo de Evento</Label>
                <Select value={formData.tipo_evento} onValueChange={(value) => setFormData(prev => ({ ...prev, tipo_evento: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inspeccion_interna">Inspección Interna</SelectItem>
                    <SelectItem value="inspeccion_externa">Inspección Externa</SelectItem>
                    <SelectItem value="capacitacion">Capacitación</SelectItem>
                    <SelectItem value="tarea">Tarea</SelectItem>
                    <SelectItem value="auditoria">Auditoría</SelectItem>
                    <SelectItem value="otra">Otra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="fecha_inicio">Fecha Inicio</Label>
                <Input
                  id="fecha_inicio"
                  type="date"
                  name="fecha_inicio"
                  value={formData.fecha_inicio}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="fecha_fin">Fecha Fin (opcional)</Label>
                <Input
                  id="fecha_fin"
                  type="date"
                  name="fecha_fin"
                  value={formData.fecha_fin}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="ubicacion">Ubicación (opcional)</Label>
                <Input
                  id="ubicacion"
                  name="ubicacion"
                  value={formData.ubicacion}
                  onChange={handleInputChange}
                  placeholder="Ej: Sector operaciones"
                />
              </div>
              <div>
                <Label htmlFor="responsable">Responsable (opcional)</Label>
                <Input
                  id="responsable"
                  name="responsable"
                  value={formData.responsable}
                  onChange={handleInputChange}
                  placeholder="Ej: Juan Pérez"
                />
              </div>
              <div>
                <Label htmlFor="descripcion">Descripción</Label>
                <textarea
                  id="descripcion"
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleInputChange}
                  placeholder="Detalles del evento"
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                  rows={2}
                />
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Crear Evento
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
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
