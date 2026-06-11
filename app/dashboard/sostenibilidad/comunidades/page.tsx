'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Plus, Mail, Phone, MapPin, User, Trash2, Filter,
  Search, Users, AlertTriangle, CheckCircle2, Clock,
  Building2, Leaf, Heart, Users2, AlertCircle,
} from 'lucide-react';
import useSWR from 'swr';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface Comunidad {
  id: string;
  numero_registro: string;
  fecha: string;
  tipo: 'Evento' | 'Comunicación' | 'Compromiso';
  descripcion: string;
  stakeholder: string;
  estado: 'Pendiente' | 'Completado' | 'En Progreso';
  tipo_stakeholder: 'indigena' | 'comunidad' | 'gobierno' | 'ong' | 'vecino';
  ubicacion?: string;
  contacto_persona?: string;
  contacto_email?: string;
  contacto_telefono?: string;
  impactado_por?: string;
  fecha_seguimiento?: string;
  responsable?: string;
  observaciones?: string;
  prioridad: 'alta' | 'media' | 'baja';
}

const STAKEHOLDER_TYPES = {
  indigena: { label: 'Comunidad Indígena', color: 'bg-purple-500/15 text-purple-400', icon: Heart },
  comunidad: { label: 'Comunidad Local', color: 'bg-blue-500/15 text-blue-400', icon: Users },
  gobierno: { label: 'Gobierno', color: 'bg-amber-500/15 text-amber-400', icon: Building2 },
  ong: { label: 'ONG', color: 'bg-teal-500/15 text-teal-400', icon: Leaf },
  vecino: { label: 'Vecinos', color: 'bg-slate-500/15 text-slate-400', icon: Users2 },
};

const STATUS_COLOR = {
  'Pendiente': 'bg-blue-500/15 text-blue-400',
  'En Progreso': 'bg-amber-500/15 text-amber-400',
  'Completado': 'bg-green-500/15 text-green-400',
};

const PRIORITY_COLOR = {
  alta: 'bg-red-500/15 text-red-400 border border-red-500/30',
  media: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  baja: 'bg-slate-500/15 text-slate-400 border border-slate-500/30',
};

const BLANK_FORM = {
  tipo: 'Evento',
  descripcion: '',
  stakeholder: '',
  estado: 'Pendiente',
  tipo_stakeholder: 'comunidad',
  ubicacion: '',
  contacto_persona: '',
  contacto_email: '',
  contacto_telefono: '',
  impactado_por: '',
  fecha_seguimiento: '',
  responsable: '',
  observaciones: '',
  prioridad: 'media',
  fecha: new Date().toISOString().split('T')[0],
};

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json());

export default function ComunidadesPage() {
  const { data: res, mutate } = useSWR('/api/sostenibilidad/comunidades', fetcher);
  const records: Comunidad[] = res?.data ?? [];

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStakeholder, setFilterStakeholder] = useState('todos');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState(BLANK_FORM);

  const filtered = useMemo(() =>
    records
      .filter(r =>
        filterStakeholder === 'todos' || r.tipo_stakeholder === filterStakeholder
      )
      .filter(r =>
        filterStatus === 'todos' || r.estado === filterStatus
      )
      .filter(r =>
        !searchTerm ||
        r.stakeholder.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.numero_registro.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.contacto_persona?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
    [records, searchTerm, filterStakeholder, filterStatus]
  );

  const stats = useMemo(() => {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    return {
      total: records.length,
      alta: records.filter(r => r.prioridad === 'alta').length,
      pendientes: records.filter(r => r.estado === 'Pendiente').length,
      completados: records.filter(r => r.estado === 'Completado').length,
      indigenas: records.filter(r => r.tipo_stakeholder === 'indigena').length,
      vencidos: records.filter(r => {
        const d = new Date(r.fecha_seguimiento + 'T12:00:00'); d.setHours(0, 0, 0, 0);
        return d < now && r.estado === 'Pendiente';
      }).length,
    };
  }, [records]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFormData(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch('/api/sostenibilidad/comunidades', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      credentials: 'include', body: JSON.stringify(formData),
    });
    if (r.ok) {
      toast.success('Registro creado');
      setIsOpen(false);
      setFormData(BLANK_FORM);
      mutate();
    } else toast.error('Error al crear registro');
  };

  const handleDelete = async (id: string, numero: string) => {
    if (!confirm(`¿Eliminar ${numero}?`)) return;
    const r = await fetch(`/api/sostenibilidad/comunidades?id=${id}`, {
      method: 'DELETE', credentials: 'include',
    });
    if (r.ok) { toast.success('Registro eliminado'); mutate(); }
    else toast.error('Error al eliminar registro');
  };

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relación con Comunidades</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Eventos, comunicaciones y compromisos con stakeholders</p>
        </div>
        <Dialog open={isOpen} onOpenChange={o => { setIsOpen(o); if (!o) setFormData(BLANK_FORM); }}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
              <Plus className="w-4 h-4 mr-2" />Nuevo Registro
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nuevo Registro de Comunidad</DialogTitle>
              <DialogDescription>Registra eventos, comunicaciones o compromisos con stakeholders</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label htmlFor="stakeholder">Stakeholder / Comunidad *</Label>
                  <Input id="stakeholder" name="stakeholder" value={formData.stakeholder} onChange={handleInput}
                    placeholder="Ej: Comunidad Atacameña Alto El Loa" required />
                </div>
                <div>
                  <Label>Tipo de Stakeholder</Label>
                  <Select value={formData.tipo_stakeholder} onValueChange={v => setFormData(p => ({ ...p, tipo_stakeholder: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STAKEHOLDER_TYPES).map(([v, { label }]) => (
                        <SelectItem key={v} value={v}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipo de Registro</Label>
                  <Select value={formData.tipo} onValueChange={v => setFormData(p => ({ ...p, tipo: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Evento">Evento</SelectItem>
                      <SelectItem value="Comunicación">Comunicación</SelectItem>
                      <SelectItem value="Compromiso">Compromiso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Estado</Label>
                  <Select value={formData.estado} onValueChange={v => setFormData(p => ({ ...p, estado: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pendiente">Pendiente</SelectItem>
                      <SelectItem value="En Progreso">En Progreso</SelectItem>
                      <SelectItem value="Completado">Completado</SelectItem>
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
                  <Label htmlFor="fecha">Fecha</Label>
                  <Input id="fecha" type="date" name="fecha" value={formData.fecha} onChange={handleInput} />
                </div>
                <div>
                  <Label htmlFor="ubicacion">Ubicación</Label>
                  <Input id="ubicacion" name="ubicacion" value={formData.ubicacion} onChange={handleInput}
                    placeholder="Sector / Localidad" />
                </div>
                <div>
                  <Label htmlFor="contacto_persona">Contacto Persona</Label>
                  <Input id="contacto_persona" name="contacto_persona" value={formData.contacto_persona}
                    onChange={handleInput} placeholder="Nombre contacto" />
                </div>
                <div>
                  <Label htmlFor="contacto_email">Email</Label>
                  <Input id="contacto_email" type="email" name="contacto_email" value={formData.contacto_email}
                    onChange={handleInput} placeholder="correo@ejemplo.cl" />
                </div>
                <div>
                  <Label htmlFor="contacto_telefono">Teléfono</Label>
                  <Input id="contacto_telefono" name="contacto_telefono" value={formData.contacto_telefono}
                    onChange={handleInput} placeholder="+56 55 212 3456" />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="impactado_por">Impactado por (tema)</Label>
                  <Input id="impactado_por" name="impactado_por" value={formData.impactado_por} onChange={handleInput}
                    placeholder="Ej: Impacto ambiental agua, Derechos laborales" />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="descripcion">Descripción *</Label>
                  <textarea id="descripcion" name="descripcion" value={formData.descripcion} onChange={handleInput}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm resize-none" rows={3}
                    placeholder="Detalles del evento, comunicación o compromiso..." required />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="observaciones">Observaciones</Label>
                  <textarea id="observaciones" name="observaciones" value={formData.observaciones} onChange={handleInput}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm resize-none" rows={2}
                    placeholder="Notas adicionales" />
                </div>
                <div>
                  <Label htmlFor="responsable">Responsable</Label>
                  <Input id="responsable" name="responsable" value={formData.responsable} onChange={handleInput}
                    placeholder="Nombre responsable" />
                </div>
                <div>
                  <Label htmlFor="fecha_seguimiento">Fecha Seguimiento</Label>
                  <Input id="fecha_seguimiento" type="date" name="fecha_seguimiento" value={formData.fecha_seguimiento}
                    onChange={handleInput} />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">Crear Registro</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        {[
          { label: 'Total',       value: stats.total,      color: 'text-foreground'  },
          { label: 'Alta prioridad', value: stats.alta,    color: 'text-red-400'     },
          { label: 'Pendientes',  value: stats.pendientes, color: 'text-blue-400'    },
          { label: 'Indígenas',   value: stats.indigenas,  color: 'text-purple-400'  },
          { label: 'Completados', value: stats.completados, color: 'text-green-400'  },
          { label: 'Vencidos',    value: stats.vencidos,   color: 'text-red-400'     },
        ].map(s => (
          <Card key={s.label} className="py-3">
            <CardContent className="px-4 py-0 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por stakeholder, número, contacto..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <Select value={filterStakeholder} onValueChange={setFilterStakeholder}>
          <SelectTrigger className="w-full sm:w-52">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los stakeholders</SelectItem>
            {Object.entries(STAKEHOLDER_TYPES).map(([v, { label }]) => (
              <SelectItem key={v} value={v}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="Pendiente">Pendiente</SelectItem>
            <SelectItem value="En Progreso">En Progreso</SelectItem>
            <SelectItem value="Completado">Completado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Records list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Registros ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No hay registros que coincidan con los filtros</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(record => {
                const stCfg = STAKEHOLDER_TYPES[record.tipo_stakeholder];
                const StIcon = stCfg?.icon || Users;
                return (
                  <div key={record.id} className="border border-border rounded-lg p-4 hover:bg-accent/5 transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <h3 className="font-semibold">{record.stakeholder}</h3>
                          <Badge className={stCfg?.color}>{stCfg?.label}</Badge>
                          <Badge className={STATUS_COLOR[record.estado]}>{record.estado}</Badge>
                          <Badge className={PRIORITY_COLOR[record.prioridad]}>{record.prioridad}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{record.numero_registro} • {new Date(record.fecha).toLocaleDateString('es-CL')}</p>
                        <p className="text-sm text-foreground line-clamp-2 mb-2">{record.descripcion}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(record.id, record.numero_registro)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground">
                      {record.contacto_persona && (
                        <div className="flex items-center gap-1"><User className="w-3 h-3" />{record.contacto_persona}</div>
                      )}
                      {record.contacto_email && (
                        <div className="flex items-center gap-1 truncate"><Mail className="w-3 h-3 shrink-0" /><span className="truncate">{record.contacto_email}</span></div>
                      )}
                      {record.contacto_telefono && (
                        <div className="flex items-center gap-1"><Phone className="w-3 h-3" />{record.contacto_telefono}</div>
                      )}
                      {record.ubicacion && (
                        <div className="flex items-center gap-1"><MapPin className="w-3 h-3" />{record.ubicacion}</div>
                      )}
                      {record.impactado_por && (
                        <div className="col-span-2 sm:col-span-4 text-[10px] font-medium text-amber-400">
                          Impactado por: {record.impactado_por}
                        </div>
                      )}
                      {record.observaciones && (
                        <div className="col-span-2 sm:col-span-4 text-[10px] italic">{record.observaciones}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
