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
  Building2, Leaf, Heart, Users2, FileText,
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
  tipo_documento?: string;
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

const DOCUMENT_TYPES = {
  'acta_reunion': 'Acta de Reunión',
  'carta_compromiso': 'Carta de Compromiso',
  'comunicado': 'Comunicado',
  'informe_seguimiento': 'Informe de Seguimiento',
  'evaluacion_impacto': 'Evaluación de Impacto',
  'protocolo_consulta': 'Protocolo de Consulta',
  'acuerdo': 'Acuerdo',
  'otro': 'Otro',
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
  tipo_documento: '',
  prioridad: 'media',
  fecha: new Date().toISOString().split('T')[0],
};

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json());

export default function ComunidadesPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [filterStakeholder, setFilterStakeholder] = useState('todos');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState(BLANK_FORM);

  const { data: res, mutate } = useSWR('/api/sostenibilidad/comunidades', fetcher);
  const allRecords: Comunidad[] = res?.data ?? [];

  const filteredRecords = useMemo(() => allRecords
    .filter(r => filterStakeholder === 'todos' || r.tipo_stakeholder === filterStakeholder)
    .filter(r => filterStatus === 'todos' || r.estado === filterStatus)
    .filter(r => !search ||
      r.numero_registro.toLowerCase().includes(search.toLowerCase()) ||
      r.stakeholder.toLowerCase().includes(search.toLowerCase()) ||
      (r.contacto_email || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
  [allRecords, filterStakeholder, filterStatus, search]);

  const stats = useMemo(() => {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    return {
      total:       allRecords.length,
      alta:        allRecords.filter(r => r.prioridad === 'alta').length,
      pendientes:  allRecords.filter(r => r.estado === 'Pendiente').length,
      completados: allRecords.filter(r => r.estado === 'Completado').length,
      vencidos:    allRecords.filter(r => r.fecha_seguimiento && new Date(r.fecha_seguimiento + 'T00:00:00') < now && r.estado !== 'Completado').length,
      indigenas:   allRecords.filter(r => r.tipo_stakeholder === 'indigena').length,
    };
  }, [allRecords]);

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
    } else {
      toast.error('Error al crear registro');
    }
  };

  const handleDelete = async (id: string, numero: string) => {
    if (!confirm(`¿Eliminar "${numero}"?`)) return;
    const r = await fetch(`/api/sostenibilidad/comunidades?id=${id}`, { method: 'DELETE', credentials: 'include' });
    if (r.ok) { toast.success('Registro eliminado'); mutate(); }
    else { toast.error('Error al eliminar registro'); }
  };

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relación con Comunidades</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gestión de eventos, comunicaciones y compromisos con stakeholders</p>
        </div>
        <Dialog open={isOpen} onOpenChange={o => { setIsOpen(o); if (!o) setFormData(BLANK_FORM); }}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
              <Plus className="w-4 h-4 mr-2" />Nuevo Registro
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nuevo Registro de Comunidad</DialogTitle>
              <DialogDescription>Registra eventos, comunicaciones o compromisos con stakeholders</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label htmlFor="stakeholder">Stakeholder *</Label>
                  <Input id="stakeholder" name="stakeholder" value={formData.stakeholder} onChange={handleInput} 
                    placeholder="Nombre de la comunidad/institución" required />
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
                  <Label>Tipo de Evento</Label>
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
                  <Label htmlFor="fecha">Fecha *</Label>
                  <Input id="fecha" type="date" name="fecha" value={formData.fecha} onChange={handleInput} required />
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
                  <Label>Tipo de Documento</Label>
                  <Select value={formData.tipo_documento} onValueChange={v => setFormData(p => ({ ...p, tipo_documento: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecciona tipo..." /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(DOCUMENT_TYPES).map(([v, label]) => (
                        <SelectItem key={v} value={v}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="ubicacion">Ubicación</Label>
                  <Input id="ubicacion" name="ubicacion" value={formData.ubicacion} onChange={handleInput} placeholder="Sector/localidad" />
                </div>

                <div>
                  <Label htmlFor="contacto_persona">Persona Contacto</Label>
                  <Input id="contacto_persona" name="contacto_persona" value={formData.contacto_persona} onChange={handleInput} placeholder="Nombre" />
                </div>

                <div>
                  <Label htmlFor="contacto_email">Email Contacto</Label>
                  <Input id="contacto_email" type="email" name="contacto_email" value={formData.contacto_email} onChange={handleInput} placeholder="correo@example.com" />
                </div>

                <div>
                  <Label htmlFor="contacto_telefono">Teléfono Contacto</Label>
                  <Input id="contacto_telefono" name="contacto_telefono" value={formData.contacto_telefono} onChange={handleInput} placeholder="+56 9..." />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="impactado_por">Impactado Por</Label>
                  <Input id="impactado_por" name="impactado_por" value={formData.impactado_por} onChange={handleInput} 
                    placeholder="Ej: Impacto ambiental, laboral, territorial" />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="descripcion">Descripción *</Label>
                  <textarea id="descripcion" name="descripcion" value={formData.descripcion} onChange={handleInput}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm resize-none" rows={3}
                    placeholder="Detalles del evento, comunicación o compromiso" required />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="observaciones">Observaciones</Label>
                  <textarea id="observaciones" name="observaciones" value={formData.observaciones} onChange={handleInput}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm resize-none" rows={2}
                    placeholder="Notas adicionales" />
                </div>

                <div>
                  <Label htmlFor="responsable">Responsable</Label>
                  <Input id="responsable" name="responsable" value={formData.responsable} onChange={handleInput} placeholder="Nombre del responsable" />
                </div>

                <div>
                  <Label htmlFor="fecha_seguimiento">Fecha Seguimiento</Label>
                  <Input id="fecha_seguimiento" type="date" name="fecha_seguimiento" value={formData.fecha_seguimiento} onChange={handleInput} />
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
          { label: 'Total',        value: stats.total,       color: 'text-foreground' },
          { label: 'Alta prioridad', value: stats.alta,      color: 'text-red-400'    },
          { label: 'Pendientes',    value: stats.pendientes,  color: 'text-blue-400'   },
          { label: 'Completados',   value: stats.completados, color: 'text-green-400'  },
          { label: 'Vencidos',      value: stats.vencidos,    color: 'text-red-400'    },
          { label: 'Indígenas',     value: stats.indigenas,   color: 'text-purple-400' },
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
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9 h-9" placeholder="Buscar por nombre, email..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterStakeholder} onValueChange={setFilterStakeholder}>
          <SelectTrigger className="w-52 h-9">
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
          <SelectTrigger className="w-48 h-9">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
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

      {/* Records */}
      <div>
        {filteredRecords.length === 0 ? (
          <Card className="py-16">
            <CardContent className="text-center text-muted-foreground">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg">Sin registros</p>
              <p className="text-sm">Crea un nuevo registro para comenzar a gestionar las relaciones comunitarias</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredRecords.map(record => {
              const stakeholderCfg = STAKEHOLDER_TYPES[record.tipo_stakeholder] || STAKEHOLDER_TYPES.comunidad;
              const StakeholderIcon = stakeholderCfg.icon;
              return (
                <Card key={record.id} className="hover:bg-accent/5 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-1 rounded">{record.numero_registro}</span>
                          <Badge className={`text-[10px] px-1.5 py-0 h-5 ${stakeholderCfg.color}`}>{stakeholderCfg.label}</Badge>
                          <Badge className={`text-[10px] px-1.5 py-0 h-5 ${STATUS_COLOR[record.estado] ?? ''}`}>{record.estado}</Badge>
                          <Badge className={`text-[10px] px-1.5 py-0 h-5 ${PRIORITY_COLOR[record.prioridad]}`}>{record.prioridad}</Badge>
                        </div>

                        <h3 className="font-semibold text-sm mb-1">{record.stakeholder}</h3>

                        {record.descripcion && (
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{record.descripcion}</p>
                        )}

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>📅 {new Date(record.fecha + 'T00:00:00').toLocaleDateString('es-CL')}</span>
                          {record.ubicacion && <span>📍 {record.ubicacion}</span>}
                          {record.contacto_persona && <span>👤 {record.contacto_persona}</span>}
                          {record.contacto_email && <span>📧 {record.contacto_email}</span>}
                          {record.tipo_documento && <span><FileText className="inline w-3 h-3" /> {DOCUMENT_TYPES[record.tipo_documento as keyof typeof DOCUMENT_TYPES]}</span>}
                        </div>

                        {record.observaciones && (
                          <p className="text-xs text-muted-foreground mt-2 italic">💬 {record.observaciones}</p>
                        )}
                      </div>

                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(record.id, record.numero_registro)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
