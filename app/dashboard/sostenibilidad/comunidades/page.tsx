'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertTriangle, Building2, FileText, Filter, Heart, Leaf, Plus, Search, Trash2, Users, Users2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

type Comunidad = {
  id: string;
  numero_registro: string;
  fecha: string;
  tipo: 'Evento' | 'Comunicación' | 'Compromiso';
  descripcion: string;
  stakeholder: string;
  estado: 'pendiente' | 'completado' | 'en_progreso';
  tipo_stakeholder: 'indigena' | 'comunidad' | 'gobierno' | 'ong' | 'vecino';
  ubicacion: string;
  contacto_persona: string;
  contacto_email: string;
  contacto_telefono: string;
  impactado_por: string;
  fecha_seguimiento: string;
  responsable: string;
  observaciones: string;
  tipo_documento: string;
  prioridad: 'alta' | 'media' | 'baja';
};

type ComunidadForm = {
  tipo: Comunidad['tipo'];
  descripcion: string;
  stakeholder: string;
  estado: Comunidad['estado'];
  tipo_stakeholder: Comunidad['tipo_stakeholder'];
  ubicacion: string;
  contacto_persona: string;
  contacto_email: string;
  contacto_telefono: string;
  impactado_por: string;
  fecha_seguimiento: string;
  responsable: string;
  observaciones: string;
  tipo_documento: string;
  prioridad: Comunidad['prioridad'];
  fecha: string;
};

type ApiResponse = {
  data: Comunidad[];
};

const STAKEHOLDER_TYPES = {
  indigena: { label: 'Comunidad Indígena', color: 'bg-purple-500/15 text-purple-400', icon: Heart },
  comunidad: { label: 'Comunidad Local', color: 'bg-blue-500/15 text-blue-400', icon: Users },
  gobierno: { label: 'Gobierno', color: 'bg-amber-500/15 text-amber-400', icon: Building2 },
  ong: { label: 'ONG', color: 'bg-teal-500/15 text-teal-400', icon: Leaf },
  vecino: { label: 'Vecinos', color: 'bg-slate-500/15 text-slate-400', icon: Users2 },
} as const;

const STATUS_COLOR = {
  pendiente: 'bg-blue-500/15 text-blue-400',
  en_progreso: 'bg-amber-500/15 text-amber-400',
  completado: 'bg-green-500/15 text-green-400',
} as const;

const PRIORITY_COLOR = {
  alta: 'bg-red-500/15 text-red-400 border border-red-500/30',
  media: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  baja: 'bg-slate-500/15 text-slate-400 border border-slate-500/30',
} as const;

const DOCUMENT_TYPES = {
  acta_reunion: 'Acta de Reunión',
  carta_compromiso: 'Carta de Compromiso',
  comunicado: 'Comunicado',
  informe_seguimiento: 'Informe de Seguimiento',
  evaluacion_impacto: 'Evaluación de Impacto',
  protocolo_consulta: 'Protocolo de Consulta',
  acuerdo: 'Acuerdo',
  otro: 'Otro',
} as const;

const BLANK_FORM: ComunidadForm = {
  tipo: 'Evento',
  descripcion: '',
  stakeholder: '',
  estado: 'pendiente',
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

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());

function normalizeEstado(value: string) {
  const text = value.trim().toLowerCase();
  if (['pendiente', 'pending', 'abierto', 'open'].includes(text)) return 'pendiente';
  if (['en progreso', 'en_progreso', 'in_progress', 'progreso'].includes(text)) return 'en_progreso';
  if (['completado', 'completed', 'completada', 'closed'].includes(text)) return 'completado';
  return 'pendiente';
}

export default function ComunidadesPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [filterStakeholder, setFilterStakeholder] = useState('todos');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState<ComunidadForm>({ ...BLANK_FORM });

  const { data: res, mutate } = useSWR<ApiResponse>('/api/sostenibilidad/comunidades', fetcher);
  const handleReload = () => {
    void mutate();
  };
  const allRecords = res?.data || [];

  const filteredRecords = useMemo(() => {
    return allRecords
      .filter((r) => filterStakeholder === 'todos' || r.tipo_stakeholder === filterStakeholder)
      .filter((r) => filterStatus === 'todos' || normalizeEstado(r.estado) === filterStatus)
      .filter(
        (r) =>
          !search ||
          r.numero_registro.toLowerCase().includes(search.toLowerCase()) ||
          r.stakeholder.toLowerCase().includes(search.toLowerCase()) ||
          (r.contacto_email || '').toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [allRecords, filterStakeholder, filterStatus, search]);

  const stats = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return {
      total: allRecords.length,
      alta: allRecords.filter((r) => r.prioridad === 'alta').length,
      pendientes: allRecords.filter((r) => normalizeEstado(r.estado) === 'pendiente').length,
      completados: allRecords.filter((r) => normalizeEstado(r.estado) === 'completado').length,
      vencidos: allRecords.filter(
        (r) => r.fecha_seguimiento && new Date(`${r.fecha_seguimiento}T00:00:00`) < now && normalizeEstado(r.estado) !== 'completado'
      ).length,
      indigenas: allRecords.filter((r) => r.tipo_stakeholder === 'indigena').length,
    };
  }, [allRecords]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFormData((current) => ({ ...current, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch('/api/sostenibilidad/comunidades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(formData),
    });

    if (response.ok) {
      toast.success('Registro creado');
      setIsOpen(false);
      setFormData({ ...BLANK_FORM });
      handleReload();
    } else {
      toast.error('Error al crear registro');
    }
  };

  const handleDelete = async (id: string, numero: string) => {
    if (!confirm(`¿Eliminar "${numero}"`)) return;
    const response = await fetch(`/api/sostenibilidad/comunidades?id=${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (response.ok) {
      toast.success('Registro eliminado');
      handleReload();
    } else {
      toast.error('Error al eliminar registro');
    }
  };

  const summaryCards = [
    { label: 'Total', value: stats.total, tone: 'text-foreground' },
    { label: 'Alta prioridad', value: stats.alta, tone: 'text-red-400' },
    { label: 'Pendientes', value: stats.pendientes, tone: 'text-blue-400' },
    { label: 'Completados', value: stats.completados, tone: 'text-green-400' },
    { label: 'Vencidos', value: stats.vencidos, tone: 'text-red-400' },
    { label: 'Indígenas', value: stats.indigenas, tone: 'text-purple-400' },
  ];

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/10 text-primary">
              Datos reales
            </Badge>
            <Badge variant="outline" className="rounded-full">
              Sostenibilidad
            </Badge>
          </div>
          <h1 className="text-4xl font-bold text-foreground">Relación con Comunidades</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Gestión de eventos, comunicaciones y compromisos con stakeholders con trazabilidad operativa real.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/sostenibilidad/comunidades/importar">Plantilla</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/sostenibilidad/comunidades/importar">Importar Excel</Link>
          </Button>
          <Dialog
            open={isOpen}
            onOpenChange={(nextOpen) => {
              setIsOpen(nextOpen);
              if (!nextOpen) setFormData({ ...BLANK_FORM });
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
                <Plus className="h-4 w-4" />
                Nuevo Registro
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nuevo Registro de Comunidad</DialogTitle>
                <DialogDescription>
                  Registra eventos, comunicaciones o compromisos con stakeholders
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="mt-2 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label htmlFor="stakeholder">Stakeholder *</Label>
                  <Input
                    id="stakeholder"
                    name="stakeholder"
                    value={formData.stakeholder}
                    onChange={handleInput}
                    placeholder="Nombre de la comunidad o institución"
                    required
                  />
                </div>

                <div>
                  <Label>Tipo de Stakeholder</Label>
                  <Select
                    value={formData.tipo_stakeholder}
                    onValueChange={(value) => setFormData((current) => ({ ...current, tipo_stakeholder: value as Comunidad['tipo_stakeholder'] }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STAKEHOLDER_TYPES).map(([value, { label }]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Tipo de Evento</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value) => setFormData((current) => ({ ...current, tipo: value as Comunidad['tipo'] }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
                  <Select
                    value={formData.prioridad}
                    onValueChange={(value) => setFormData((current) => ({ ...current, prioridad: value as Comunidad['prioridad'] }))}
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
                  <Label>Estado</Label>
                  <Select
                    value={formData.estado}
                    onValueChange={(value) => setFormData((current) => ({ ...current, estado: value as Comunidad['estado'] }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="en_progreso">En Progreso</SelectItem>
                      <SelectItem value="completado">Completado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Tipo de Documento</Label>
                  <Select
                    value={formData.tipo_documento}
                    onValueChange={(value) => setFormData((current) => ({ ...current, tipo_documento: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona tipo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(DOCUMENT_TYPES).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
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
                  <Input id="impactado_por" name="impactado_por" value={formData.impactado_por} onChange={handleInput} placeholder="Ej: Impacto ambiental, laboral, territorial" />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="descripcion">Descripción *</Label>
                  <textarea
                    id="descripcion"
                    name="descripcion"
                    value={formData.descripcion}
                    onChange={handleInput}
                    className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    rows={3}
                    placeholder="Detalles del evento, comunicación o compromiso"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="observaciones">Observaciones</Label>
                  <textarea
                    id="observaciones"
                    name="observaciones"
                    value={formData.observaciones}
                    onChange={handleInput}
                    className="min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    rows={2}
                    placeholder="Notas adicionales"
                  />
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

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Crear Registro
                </Button>
              </div>
            </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {summaryCards.map((item) => (
          <Card key={item.label} className="rounded-xl shadow-none">
            <CardHeader className="pb-2">
              <CardDescription>{item.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${item.tone}`}>{item.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-xl shadow-none">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-10 pl-9"
                placeholder="Buscar por nombre, email o registro..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterStakeholder} onValueChange={setFilterStakeholder}>
              <SelectTrigger className="h-10 w-full lg:w-56">
                <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los stakeholders</SelectItem>
                {Object.entries(STAKEHOLDER_TYPES).map(([value, { label }]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-10 w-full lg:w-48">
                <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="en_progreso">En Progreso</SelectItem>
                <SelectItem value="completado">Completado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {filteredRecords.length === 0 ? (
        <Card className="rounded-xl shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <AlertTriangle className="mb-4 h-12 w-12 opacity-30" />
            <p className="text-lg font-medium text-foreground">Sin registros</p>
            <p className="text-sm">Crea un nuevo registro para comenzar a gestionar las relaciones comunitarias</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRecords.map((record) => {
            const stakeholderCfg = STAKEHOLDER_TYPES[record.tipo_stakeholder] || STAKEHOLDER_TYPES.comunidad;
            const StakeholderIcon = stakeholderCfg.icon;

            return (
              <Card key={record.id} className="rounded-xl shadow-none transition hover:bg-muted/20">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
                          {record.numero_registro}
                        </span>
                        <Badge className={`h-6 px-2 py-0 text-[10px] ${stakeholderCfg.color}`}>
                          <span className="flex items-center gap-1">
                            <StakeholderIcon className="h-3 w-3" />
                            {stakeholderCfg.label}
                          </span>
                        </Badge>
                        <Badge className={`h-6 px-2 py-0 text-[10px] ${STATUS_COLOR[normalizeEstado(record.estado)]}`}>
                          {normalizeEstado(record.estado).replace(/_/g, ' ')}
                        </Badge>
                        <Badge className={`h-6 px-2 py-0 text-[10px] ${PRIORITY_COLOR[record.prioridad]}`}>
                          {record.prioridad}
                        </Badge>
                      </div>

                      <h3 className="mb-1 text-sm font-semibold text-foreground">{record.stakeholder}</h3>

                      {record.descripcion && <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">{record.descripcion}</p>}

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>{new Date(`${record.fecha}T00:00:00`).toLocaleDateString('es-CL')}</span>
                        {record.ubicacion && <span>{record.ubicacion}</span>}
                        {record.contacto_persona && <span>{record.contacto_persona}</span>}
                        {record.contacto_email && <span>{record.contacto_email}</span>}
                        {record.tipo_documento && <span>{DOCUMENT_TYPES[record.tipo_documento as keyof typeof DOCUMENT_TYPES]}</span>}
                      </div>

                      {record.observaciones && <p className="mt-2 text-xs italic text-muted-foreground">{record.observaciones}</p>}
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(record.id, record.numero_registro)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
