'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  MapPin, Users, Trash2, Filter, ClipboardCheck,
  GraduationCap, ShieldAlert, BarChart2, Gavel, Coffee,
  Leaf, AlertTriangle, X, Search,
} from 'lucide-react';
import useSWR from 'swr';
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface CalendarEvent {
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
}

// â”€â”€â”€ Config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const EVENT_TYPES: Record<string, { label: string; color: string; dot: string; icon: React.ElementType }> = {
  inspeccion_interna: { label: 'InspecciÃ³n Interna',  color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',  dot: 'bg-blue-400',  icon: ClipboardCheck },
  inspeccion_externa: { label: 'InspecciÃ³n Externa',  color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',  dot: 'bg-cyan-400',  icon: ClipboardCheck },
  capacitacion:  { label: 'CapacitaciÃ³n',  color: 'bg-green-500/15 text-green-400 border-green-500/30',  dot: 'bg-green-400',  icon: GraduationCap  },
  auditoria:  { label: 'AuditorÃ­a',  color: 'bg-purple-500/15 text-purple-400 border-purple-500/30', dot: 'bg-purple-400', icon: ShieldAlert   },
  monitoreo:  { label: 'Monitoreo Ambiental', color: 'bg-teal-500/15 text-teal-400 border-teal-500/30',  dot: 'bg-teal-400',  icon: Leaf           },
  legal:  { label: 'Vencimiento Legal',  color: 'bg-red-500/15 text-red-400 border-red-500/30',  dot: 'bg-red-400',  icon: Gavel          },
  reunion:  { label: 'ReuniÃ³n',  color: 'bg-amber-500/15 text-amber-400 border-amber-500/30', dot: 'bg-amber-400',  icon: Coffee         },
  tarea:  { label: 'Tarea',  color: 'bg-slate-500/15 text-slate-400 border-slate-500/30', dot: 'bg-slate-400',  icon: BarChart2      },
};

const PRIORITY_BADGE: Record<string, string> = {
  alta:  'bg-red-500/15 text-red-400 border border-red-500/30',
  media: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  baja:  'bg-slate-500/15 text-slate-400 border border-slate-500/30',
};

const STATUS_BADGE: Record<string, string> = {
  programado:  'bg-blue-500/15 text-blue-400',
  en_progreso: 'bg-amber-500/15 text-amber-400',
  completado:  'bg-green-500/15 text-green-400',
  cancelado:  'bg-slate-500/15 text-slate-400',
};

const WEEKDAYS = ['Lun', 'Mar', 'MiÃ©', 'Jue', 'Vie', 'SÃ¡b', 'Dom'];

const BLANK_FORM = {
  titulo: '', tipo_evento: 'inspeccion_interna',
  fecha_inicio: new Date().toISOString().split('T')[0],
  fecha_fin: '', ubicacion: '', descripcion: '',
  responsable: '', estado: 'programado', prioridad: 'media',
};

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json());

// â”€â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function CalendarioPage() {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth()));
  const [view, setView]               = useState<'mes' | 'lista'>('mes');
  const [filterType, setFilterType]   = useState('todos');
  const [search, setSearch]           = useState('');
  const [isOpen, setIsOpen]           = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [formData, setFormData]       = useState({ ...BLANK_FORM });

  const { data: res, mutate } = useSWR('/api/sostenibilidad/calendario', fetcher);
  const allEvents: CalendarEvent[] = res?.data || [];

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayRaw = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const firstDay    = (firstDayRaw + 6) % 7; // Monday-based
  const monthLabel  = currentDate.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });

  const eventsThisMonth = useMemo(() => allEvents.filter(e => {
    const d = new Date(e.fecha_inicio + 'T12:00:00');
    return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
  }), [allEvents, currentDate]);

  const filteredEvents = useMemo(() => allEvents
    .filter(e => filterType === 'todos' || e.tipo_evento === filterType)
    .filter(e => !search ||
      e.titulo.toLowerCase().includes(search.toLowerCase()) ||
      (e.responsable || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime()),
  [allEvents, filterType, search]);

  const getEventsForDay = (day: number) => eventsThisMonth.filter(e =>
    new Date(e.fecha_inicio + 'T12:00:00').getDate() === day
  );

  const stats = useMemo(() => {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    return {
      total: allEvents.length,
      thisMonth: eventsThisMonth.length,
      upcoming7: allEvents.filter(e => {
        const d = new Date(e.fecha_inicio + 'T12:00:00'); d.setHours(0, 0, 0, 0);
        const diff = (d.getTime() - now.getTime()) / 86400000;
        return diff >= 0 && diff <= 7 && e.estado === 'programado';
      }).length,
      alta:  allEvents.filter(e => e.prioridad === 'alta' && e.estado === 'programado').length,
      overdue:  allEvents.filter(e => {
        const d = new Date(e.fecha_inicio + 'T12:00:00'); d.setHours(0, 0, 0, 0);
        return d < now && e.estado === 'programado';
      }).length,
    };
  }, [allEvents, eventsThisMonth]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFormData(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch('/api/sostenibilidad/calendario', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      credentials: 'include', body: JSON.stringify(formData),
    });
    if (r.ok) { toast.success('Evento creado'); setIsOpen(false); setFormData({ ...BLANK_FORM }); mutate(); }
    else toast.error('Error al crear evento');
  };

  const handleDelete = async (id: string, titulo: string) => {
    if (!confirm(`Â¿Eliminar "${titulo}"`)) return;
    const r = await fetch(`/api/sostenibilidad/calendario?id=${id}`, { method: 'DELETE', credentials: 'include' });
    if (r.ok) { toast.success('Evento eliminado'); mutate(); }
    else toast.error('Error al eliminar evento');
  };

  const openOnDay = (day: number) => {
    const ds = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setFormData(p => ({ ...p, fecha_inicio: ds }));
    setIsOpen(true);
  };

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="min-h-screen bg-background p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendario de Sostenibilidad</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Inspecciones, auditorÃ­as, capacitaciones y vencimientos legales</p>
        </div>
        <Dialog open={isOpen} onOpenChange={o => { setIsOpen(o); if (!o) setFormData({ ...BLANK_FORM }); }}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
              <Plus className="w-4 h-4 mr-2" />Nuevo Evento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nuevo Evento</DialogTitle>
              <DialogDescription>Agrega un evento al calendario de sostenibilidad</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label htmlFor="titulo">TÃ­tulo *</Label>
                  <Input id="titulo" name="titulo" value={formData.titulo} onChange={handleInput} placeholder="Ej: InspecciÃ³n EPP sector norte" required />
                </div>
                <div>
                  <Label>Tipo de Evento</Label>
                  <Select value={formData.tipo_evento} onValueChange={v => setFormData(p => ({ ...p, tipo_evento: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(EVENT_TYPES).map(([v, { label }]) => (
                        <SelectItem key={v} value={v}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Prioridad</Label>
                  <Select value={formData.prioridad} onValueChange={v => setFormData(p => ({ ...p, prioridad: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                      <SelectItem value="baja">Baja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="fecha_inicio">Fecha *</Label>
                  <Input id="fecha_inicio" type="date" name="fecha_inicio" value={formData.fecha_inicio} onChange={handleInput} required />
                </div>
                <div>
                  <Label htmlFor="fecha_fin">PrÃ³xima fecha</Label>
                  <Input id="fecha_fin" type="date" name="fecha_fin" value={formData.fecha_fin} onChange={handleInput} />
                </div>
                <div>
                  <Label htmlFor="ubicacion">UbicaciÃ³n</Label>
                  <Input id="ubicacion" name="ubicacion" value={formData.ubicacion} onChange={handleInput} placeholder="Sector / Sala" />
                </div>
                <div>
                  <Label htmlFor="responsable">Responsable</Label>
                  <Input id="responsable" name="responsable" value={formData.responsable} onChange={handleInput} placeholder="Nombre responsable" />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="descripcion">DescripciÃ³n</Label>
                  <textarea id="descripcion" name="descripcion" value={formData.descripcion} onChange={handleInput}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm resize-none" rows={3}
                    placeholder="Detalles del evento..." />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">Crear Evento</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total eventos',  value: stats.total,  color: 'text-foreground' },
          { label: 'Este mes',  value: stats.thisMonth, color: 'text-blue-400'   },
          { label: 'PrÃ³ximos 7 dÃ­as', value: stats.upcoming7, color: 'text-amber-400'  },
          { label: 'Prioridad alta',  value: stats.alta,  color: 'text-red-400'    },
          { label: 'Vencidos',  value: stats.overdue,  color: 'text-red-400'    },
        ].map(s => (
          <Card key={s.label} className="rounded-xl border shadow-none py-3">
            <CardContent className="px-4 py-0 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex gap-1 rounded-lg border border-border p-1 shrink-0">
          {(['mes', 'lista'] as const).map(v => (
            <Button key={v} size="sm" variant={view === v ? 'default' : 'ghost'}
              className={view === v ? 'bg-primary text-primary-foreground' : ''}
              onClick={() => setView(v)}>
              {v === 'mes' ? 'Vista Mes' : 'Vista Lista'}
            </Button>
          ))}
        </div>
        <div className="flex gap-2 flex-1 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9 h-9" placeholder="Buscar evento o responsable..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-52 h-9">
              <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los tipos</SelectItem>
              {Object.entries(EVENT_TYPES).map(([v, { label }]) => (
                <SelectItem key={v} value={v}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* â”€â”€ Month view â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {view === 'mes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar grid */}
          <div className="lg:col-span-2">
            <Card className="rounded-xl border shadow-none">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <h2 className="text-lg font-bold capitalize w-44 text-center">{monthLabel}</h2>
                    <Button variant="outline" size="icon" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                  <span className="text-sm text-muted-foreground">{eventsThisMonth.length} eventos</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 mb-1">
                  {WEEKDAYS.map(d => (
                    <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 border border-border rounded-lg overflow-hidden">
                  {Array.from({ length: firstDay }).map((_, i) => (
                    <div key={`e${i}`} className="bg-card border-border border-r border-b min-h-[88px]" />
                  ))}
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                    const dayEvts = getEventsForDay(day);
                    const isToday = today.getDate() === day &&
                      today.getMonth() === currentDate.getMonth() &&
                      today.getFullYear() === currentDate.getFullYear();
                    const isSel = selectedDay === day;
                    return (
                      <div key={day} onClick={() => setSelectedDay(isSel ? null : day)}
                        className={`bg-card border-border border-r border-b min-h-[88px] p-1.5 cursor-pointer transition-colors hover:bg-accent/5
                          ${isSel ? 'bg-primary/5' : ''}`}>
                        <div className={`text-xs font-semibold mb-1 w-5 h-5 flex items-center justify-center rounded-full
                          ${isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>
                          {day}
                        </div>
                        <div className="space-y-0.5">
                          {dayEvts.slice(0, 3).map(evt => {
                            const cfg = EVENT_TYPES[evt.tipo_evento] || EVENT_TYPES.tarea;
                            return (
                              <div key={evt.id} className={`text-[10px] leading-tight px-1.5 py-0.5 rounded truncate border ${cfg.color}`}>
                                {evt.titulo}
                              </div>
                            );
                          })}
                          {dayEvts.length > 3 && (
                            <div className="text-[10px] text-muted-foreground px-1">+{dayEvts.length - 3}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Legend */}
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
                  {Object.entries(EVENT_TYPES).map(([k, { label, dot }]) => (
                    <div key={k} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className={`w-2 h-2 rounded-full ${dot}`} />
                      {label}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Side panel */}
          <div>
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {selectedDay ? (
                      <>{selectedDay} de {currentDate.toLocaleDateString('es-CL', { month: 'long' })}</>
                    ) : (
                      <><AlertTriangle className="w-4 h-4 text-amber-400" />PrÃ³ximos eventos</>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    {selectedDay && (
                      <>
                        <Button size="sm" variant="ghost" className="text-xs h-7 px-2" onClick={() => openOnDay(selectedDay)}>
                          <Plus className="w-3 h-3 mr-1" />Agregar
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelectedDay(null)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 overflow-y-auto max-h-[520px]">
                {(() => {
                  const list = selectedDay
                    ? getEventsForDay(selectedDay)
                    : eventsThisMonth.filter(e => e.estado === 'programado').slice(0, 8);
                  if (list.length === 0)
                    return <p className="text-sm text-muted-foreground text-center py-8">Sin eventos</p>;
                  return list.map(evt => (
                    <EventCard key={evt.id} event={evt} onDelete={handleDelete} compact={!selectedDay} />
                  ));
                })()}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* â”€â”€ List view â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {view === 'lista' && (
        <Card className="rounded-xl border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Todos los eventos ({filteredEvents.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredEvents.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <CalendarIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No hay eventos que coincidan</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredEvents.map(evt => <EventCard key={evt.id} event={evt} onDelete={handleDelete} expanded />)}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// â”€â”€â”€ EventCard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function EventCard({
  event, onDelete, compact = false, expanded = false,
}: {
  event: CalendarEvent;
  onDelete: (id: string, titulo: string) => void;
  compact?: boolean;
  expanded?: boolean;
}) {
  const cfg = EVENT_TYPES[event.tipo_evento] || EVENT_TYPES.tarea;
  const Icon = cfg.icon;
  const dateStr = new Date(event.fecha_inicio + 'T12:00:00').toLocaleDateString('es-CL', {
    day: 'numeric', month: 'short', year: compact ? undefined : 'numeric',
  });

  if (compact) return (
    <div className="flex items-start gap-2 py-2 border-b border-border last:border-0">
      <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate leading-snug">{event.titulo}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[10px] text-muted-foreground">{dateStr}</p>
          <span className={`text-[10px] px-1 rounded ${PRIORITY_BADGE[event.prioridad]}`}>{event.prioridad}</span>
        </div>
      </div>
      <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 opacity-50 hover:opacity-100 hover:text-destructive"
        onClick={() => onDelete(event.id, event.titulo)}>
        <Trash2 className="w-3 h-3" />
      </Button>
    </div>
  );

  return (
    <div className="rounded-xl border border-border p-4 shadow-none hover:bg-accent/5 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`mt-0.5 p-2 rounded-md shrink-0 ${cfg.color}`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <h3 className="font-semibold text-sm">{event.titulo}</h3>
              <Badge className={`text-[10px] px-1.5 py-0 h-4 border ${cfg.color}`}>{cfg.label}</Badge>
              <Badge className={`text-[10px] px-1.5 py-0 h-4 ${PRIORITY_BADGE[event.prioridad]}`}>{event.prioridad}</Badge>
              <Badge className={`text-[10px] px-1.5 py-0 h-4 ${STATUS_BADGE[event.estado] || ''}`}>{event.estado.replace('_', ' ')}</Badge>
            </div>
            {event.descripcion && (
              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{event.descripcion}</p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><CalendarIcon className="w-3 h-3" />{dateStr}</span>
              {event.ubicacion  && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.ubicacion}</span>}
              {event.responsable && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{event.responsable}</span>}
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(event.id, event.titulo)}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

