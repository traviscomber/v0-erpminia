'use client';

import { useMemo, useState, type ChangeEvent, type ElementType, type FormEvent } from 'react';
import useSWR from 'swr';
import {
  AlertTriangle,
  BarChart2,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Coffee,
  Filter,
  GraduationCap,
  Gavel,
  Leaf,
  MapPin,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type CalendarEvent = {
  id: string;
  titulo: string;
  tipo_evento: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  ubicacion: string;
  descripcion: string;
  responsable: string;
  estado: 'programado' | 'completado' | 'cancelado' | 'en_progreso';
  prioridad: 'alta' | 'media' | 'baja';
};

const EVENT_TYPES: Record<
  string,
  { label: string; color: string; dot: string; icon: ElementType }
> = {
  inspeccion_interna: {
    label: 'Inspección interna',
    color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    dot: 'bg-blue-400',
    icon: ClipboardCheck,
  },
  inspeccion_externa: {
    label: 'Inspección externa',
    color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    dot: 'bg-cyan-400',
    icon: ClipboardCheck,
  },
  capacitacion: {
    label: 'Capacitación',
    color: 'bg-green-500/15 text-green-400 border-green-500/30',
    dot: 'bg-green-400',
    icon: GraduationCap,
  },
  auditoria: {
    label: 'Auditoría',
    color: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    dot: 'bg-purple-400',
    icon: ShieldAlert,
  },
  monitoreo: {
    label: 'Monitoreo ambiental',
    color: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
    dot: 'bg-teal-400',
    icon: Leaf,
  },
  legal: {
    label: 'Vencimiento legal',
    color: 'bg-red-500/15 text-red-400 border-red-500/30',
    dot: 'bg-red-400',
    icon: Gavel,
  },
  reunion: {
    label: 'Reunión',
    color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    dot: 'bg-amber-400',
    icon: Coffee,
  },
  tarea: {
    label: 'Tarea',
    color: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    dot: 'bg-slate-400',
    icon: BarChart2,
  },
};

const PRIORITY_BADGE: Record<string, string> = {
  alta: 'bg-red-500/15 text-red-400 border border-red-500/30',
  media: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  baja: 'bg-slate-500/15 text-slate-400 border border-slate-500/30',
};

const STATUS_BADGE: Record<string, string> = {
  programado: 'bg-blue-500/15 text-blue-400',
  en_progreso: 'bg-amber-500/15 text-amber-400',
  completado: 'bg-green-500/15 text-green-400',
  cancelado: 'bg-slate-500/15 text-slate-400',
};

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const BLANK_FORM = {
  titulo: '',
  tipo_evento: 'inspeccion_interna',
  fecha_inicio: new Date().toISOString().split('T')[0],
  fecha_fin: '',
  ubicacion: '',
  descripcion: '',
  responsable: '',
  estado: 'programado',
  prioridad: 'media',
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || 'No se pudieron cargar los eventos del calendario');
  }
  return payload;
};

export default function CalendarioPage() {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth()));
  const [view, setView] = useState<'mes' | 'lista'>('mes');
  const [filterType, setFilterType] = useState('todos');
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [formData, setFormData] = useState({ ...BLANK_FORM });

  const { data: res, mutate, error } = useSWR('/api/sostenibilidad/calendario', fetcher);
  const allEvents: CalendarEvent[] = res?.data || [];

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayRaw = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const firstDay = (firstDayRaw + 6) % 7;
  const monthLabel = currentDate.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });

  const eventsThisMonth = useMemo(
    () =>
      allEvents.filter((event) => {
        const date = new Date(`${event.fecha_inicio}T12:00:00`);
        return (
          date.getMonth() === currentDate.getMonth() &&
          date.getFullYear() === currentDate.getFullYear()
        );
      }),
    [allEvents, currentDate]
  );

  const filteredEvents = useMemo(
    () =>
      allEvents
        .filter((event) => filterType === 'todos' || event.tipo_evento === filterType)
        .filter(
          (event) =>
            !search ||
            event.titulo.toLowerCase().includes(search.toLowerCase()) ||
            (event.responsable || '').toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime()),
    [allEvents, filterType, search]
  );

  const getEventsForDay = (day: number) =>
    eventsThisMonth.filter((event) => new Date(`${event.fecha_inicio}T12:00:00`).getDate() === day);

  const stats = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return {
      total: allEvents.length,
      thisMonth: eventsThisMonth.length,
      upcoming7: allEvents.filter((event) => {
        const date = new Date(`${event.fecha_inicio}T12:00:00`);
        date.setHours(0, 0, 0, 0);
        const diff = (date.getTime() - now.getTime()) / 86400000;
        return diff >= 0 && diff <= 7 && event.estado === 'programado';
      }).length,
      alta: allEvents.filter((event) => event.prioridad === 'alta' && event.estado === 'programado').length,
      overdue: allEvents.filter((event) => {
        const date = new Date(`${event.fecha_inicio}T12:00:00`);
        date.setHours(0, 0, 0, 0);
        return date < now && event.estado === 'programado';
      }).length,
    };
  }, [allEvents, eventsThisMonth]);

  const handleInput = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    try {
      const response = await fetch('/api/sostenibilidad/calendario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo crear el evento');
      }

      toast.success('Evento creado');
      setIsOpen(false);
      setFormData({ ...BLANK_FORM });
      await mutate();
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : 'No se pudo crear el evento');
    }
  };

  const handleDelete = async (id: string, titulo: string) => {
    if (!confirm(`¿Eliminar "${titulo}"?`)) return;

    try {
      const response = await fetch(`/api/sostenibilidad/calendario?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('No se pudo eliminar el evento');
      }

      toast.success('Evento eliminado');
      await mutate();
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar el evento');
    }
  };

  const openOnDay = (day: number) => {
    const dateValue = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setFormData((prev) => ({ ...prev, fecha_inicio: dateValue }));
    setIsOpen(true);
  };

  return (
    <div className="min-h-screen space-y-6 bg-background p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendario de Sostenibilidad</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Inspecciones, auditorías, capacitaciones y vencimientos legales.
          </p>
        </div>

        <Dialog
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) setFormData({ ...BLANK_FORM });
          }}
        >
          <DialogTrigger asChild>
            <Button className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo evento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nuevo evento</DialogTitle>
              <DialogDescription>Agrega un evento al calendario de sostenibilidad.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="mt-2 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label htmlFor="titulo">Título *</Label>
                  <Input
                    id="titulo"
                    name="titulo"
                    value={formData.titulo}
                    onChange={handleInput}
                    placeholder="Ej: Inspección EPP sector norte"
                    required
                  />
                </div>
                <div>
                  <Label>Tipo de evento</Label>
                  <Select
                    value={formData.tipo_evento}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, tipo_evento: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(EVENT_TYPES).map(([value, config]) => (
                        <SelectItem key={value} value={value}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Prioridad</Label>
                  <Select
                    value={formData.prioridad}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, prioridad: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                      <SelectItem value="baja">Baja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="fecha_inicio">Fecha *</Label>
                  <Input
                    id="fecha_inicio"
                    type="date"
                    name="fecha_inicio"
                    value={formData.fecha_inicio}
                    onChange={handleInput}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="fecha_fin">Próxima fecha</Label>
                  <Input
                    id="fecha_fin"
                    type="date"
                    name="fecha_fin"
                    value={formData.fecha_fin}
                    onChange={handleInput}
                  />
                </div>
                <div>
                  <Label htmlFor="ubicacion">Ubicación</Label>
                  <Input
                    id="ubicacion"
                    name="ubicacion"
                    value={formData.ubicacion}
                    onChange={handleInput}
                    placeholder="Sector / Sala"
                  />
                </div>
                <div>
                  <Label htmlFor="responsable">Responsable</Label>
                  <Input
                    id="responsable"
                    name="responsable"
                    value={formData.responsable}
                    onChange={handleInput}
                    placeholder="Nombre responsable"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="descripcion">Descripción</Label>
                  <textarea
                    id="descripcion"
                    name="descripcion"
                    value={formData.descripcion}
                    onChange={handleInput}
                    className="min-h-24 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Detalles del evento..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Crear evento
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: 'Total eventos', value: stats.total, color: 'text-foreground' },
          { label: 'Este mes', value: stats.thisMonth, color: 'text-blue-400' },
          { label: 'Próximos 7 días', value: stats.upcoming7, color: 'text-amber-400' },
          { label: 'Prioridad alta', value: stats.alta, color: 'text-red-400' },
          { label: 'Vencidos', value: stats.overdue, color: 'text-red-400' },
        ].map((item) => (
          <Card key={item.label} className="rounded-xl border py-3 shadow-none">
            <CardContent className="px-4 py-0 text-center">
              <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex shrink-0 gap-1 rounded-lg border border-border p-1">
          {(['mes', 'lista'] as const).map((item) => (
            <Button
              key={item}
              size="sm"
              variant={view === item ? 'default' : 'ghost'}
              className={view === item ? 'bg-primary text-primary-foreground' : ''}
              onClick={() => setView(item)}
            >
              {item === 'mes' ? 'Vista mes' : 'Vista lista'}
            </Button>
          ))}
        </div>

        <div className="flex flex-1 flex-wrap gap-2">
          <div className="relative min-w-48 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 pl-9"
              placeholder="Buscar evento o responsable..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-9 w-52">
              <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los tipos</SelectItem>
              {Object.entries(EVENT_TYPES).map(([value, config]) => (
                <SelectItem key={value} value={value}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error ? (
        <Card className="border-destructive/30">
          <CardContent className="flex items-center justify-between gap-4 pt-6">
            <div className="flex items-center gap-3 text-sm">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span>No se pudieron cargar los eventos del calendario.</span>
            </div>
            <Button variant="outline" onClick={() => mutate()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {view === 'mes' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card className="rounded-xl border shadow-none">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h2 className="w-44 text-center text-lg font-bold capitalize">{monthLabel}</h2>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <span className="text-sm text-muted-foreground">{eventsThisMonth.length} eventos</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-1 grid grid-cols-7">
                  {WEEKDAYS.map((day) => (
                    <div key={day} className="py-2 text-center text-xs font-semibold text-muted-foreground">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-border">
                  {Array.from({ length: firstDay }).map((_, index) => (
                    <div key={`empty-${index}`} className="min-h-[88px] border-b border-r border-border bg-card" />
                  ))}
                  {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => {
                    const events = getEventsForDay(day);
                    const isToday =
                      today.getDate() === day &&
                      today.getMonth() === currentDate.getMonth() &&
                      today.getFullYear() === currentDate.getFullYear();
                    const isSelected = selectedDay === day;

                    return (
                      <div
                        key={day}
                        onClick={() => setSelectedDay(isSelected ? null : day)}
                        className={`min-h-[88px] cursor-pointer border-b border-r border-border bg-card p-1.5 transition-colors hover:bg-accent/5 ${
                          isSelected ? 'bg-primary/5' : ''
                        }`}
                      >
                        <div
                          className={`mb-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold ${
                            isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'
                          }`}
                        >
                          {day}
                        </div>
                        <div className="space-y-0.5">
                          {events.slice(0, 3).map((event) => {
                            const config = EVENT_TYPES[event.tipo_evento] || EVENT_TYPES.tarea;
                            return (
                              <div
                                key={event.id}
                                className={`truncate rounded border px-1.5 py-0.5 text-[10px] leading-tight ${config.color}`}
                              >
                                {event.titulo}
                              </div>
                            );
                          })}
                          {events.length > 3 ? (
                            <div className="px-1 text-[10px] text-muted-foreground">+{events.length - 3}</div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
                  {Object.entries(EVENT_TYPES).map(([key, config]) => (
                    <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className={`h-2 w-2 rounded-full ${config.dot}`} />
                      {config.label}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    {selectedDay ? (
                      <>
                        {selectedDay} de {currentDate.toLocaleDateString('es-CL', { month: 'long' })}
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                        Próximos eventos
                      </>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    {selectedDay ? (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => openOnDay(selectedDay)}
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          Agregar
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelectedDay(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="max-h-[520px] space-y-2 overflow-y-auto">
                {(() => {
                  const list = selectedDay
                    ? getEventsForDay(selectedDay)
                    : eventsThisMonth.filter((event) => event.estado === 'programado').slice(0, 8);

                  if (list.length === 0) {
                    return <p className="py-8 text-center text-sm text-muted-foreground">Sin eventos</p>;
                  }

                  return list.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onDelete={handleDelete}
                      compact={!selectedDay}
                    />
                  ));
                })()}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card className="rounded-xl border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Todos los eventos ({filteredEvents.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredEvents.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <CalendarIcon className="mx-auto mb-3 h-10 w-10 opacity-30" />
                <p>No hay eventos que coincidan</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onDelete={handleDelete}
                    compact={false}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EventCard({
  event,
  onDelete,
  compact = false,
}: {
  event: CalendarEvent;
  onDelete: (id: string, titulo: string) => void;
  compact?: boolean;
}) {
  const config = EVENT_TYPES[event.tipo_evento] || EVENT_TYPES.tarea;
  const Icon = config.icon;
  const dateStr = new Date(`${event.fecha_inicio}T12:00:00`).toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: compact ? undefined : 'numeric',
  });

  if (compact) {
    return (
      <div className="flex items-start gap-2 border-b border-border py-2 last:border-0">
        <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${config.dot}`} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium leading-snug">{event.titulo}</p>
          <div className="mt-0.5 flex items-center gap-2">
            <p className="text-[10px] text-muted-foreground">{dateStr}</p>
            <span className={`rounded px-1 text-[10px] ${PRIORITY_BADGE[event.prioridad]}`}>
              {event.prioridad}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 shrink-0 opacity-50 hover:opacity-100 hover:text-destructive"
          onClick={() => onDelete(event.id, event.titulo)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border p-4 shadow-none transition-colors hover:bg-accent/5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className={`mt-0.5 shrink-0 rounded-md p-2 ${config.color}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <h3 className="text-sm font-semibold">{event.titulo}</h3>
              <Badge className={`h-4 border px-1.5 py-0 text-[10px] ${config.color}`}>{config.label}</Badge>
              <Badge className={`h-4 px-1.5 py-0 text-[10px] ${PRIORITY_BADGE[event.prioridad]}`}>
                {event.prioridad}
              </Badge>
              <Badge className={`h-4 px-1.5 py-0 text-[10px] ${STATUS_BADGE[event.estado] || ''}`}>
                {event.estado.replace('_', ' ')}
              </Badge>
            </div>
            {event.descripcion ? (
              <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">{event.descripcion}</p>
            ) : null}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                {dateStr}
              </span>
              {event.ubicacion ? (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {event.ubicacion}
                </span>
              ) : null}
              {event.responsable ? (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {event.responsable}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(event.id, event.titulo)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
