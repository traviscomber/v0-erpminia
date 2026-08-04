'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertTriangle, Building2, Filter, Heart, Leaf, Plus, Search, Trash2, Users, Users2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

type ComunidadForm = Omit<Comunidad, 'id' | 'numero_registro'>;
type ApiResponse = { data: Comunidad[] };

const STAKEHOLDER_TYPES = {
  indigena: { label: 'Comunidad indígena', className: 'bg-purple-500/10 text-purple-700', icon: Heart },
  comunidad: { label: 'Comunidad local', className: 'bg-blue-500/10 text-blue-700', icon: Users },
  gobierno: { label: 'Gobierno', className: 'bg-amber-500/10 text-amber-700', icon: Building2 },
  ong: { label: 'ONG', className: 'bg-teal-500/10 text-teal-700', icon: Leaf },
  vecino: { label: 'Vecinos', className: 'bg-slate-500/10 text-slate-700', icon: Users2 },
} as const;

const STATUS_COLOR = {
  pendiente: 'bg-blue-500/10 text-blue-700',
  en_progreso: 'bg-amber-500/10 text-amber-700',
  completado: 'bg-green-500/10 text-green-700',
} as const;

const PRIORITY_COLOR = {
  alta: 'border border-red-500/20 bg-red-500/10 text-red-700',
  media: 'border border-amber-500/20 bg-amber-500/10 text-amber-700',
  baja: 'border border-slate-500/20 bg-slate-500/10 text-slate-700',
} as const;

const DOCUMENT_TYPES = {
  acta_reunion: 'Acta de reunión',
  carta_compromiso: 'Carta de compromiso',
  comunicado: 'Comunicado',
  informe_seguimiento: 'Informe de seguimiento',
  evaluacion_impacto: 'Evaluación de impacto',
  protocolo_consulta: 'Protocolo de consulta',
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

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) return null;
  return payload;
};

function normalizeEstado(value: string): Comunidad['estado'] {
  const text = value.trim().toLowerCase();
  if (['completado', 'completed', 'completada', 'closed'].includes(text)) return 'completado';
  if (['en progreso', 'en_progreso', 'in_progress', 'progreso'].includes(text)) return 'en_progreso';
  return 'pendiente';
}

function isOverdue(record: Comunidad, now: Date) {
  return Boolean(
    record.fecha_seguimiento &&
      new Date(`${record.fecha_seguimiento}T00:00:00`) < now &&
      normalizeEstado(record.estado) !== 'completado'
  );
}

export default function ComunidadesPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [filterStakeholder, setFilterStakeholder] = useState('todos');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState<ComunidadForm>({ ...BLANK_FORM });

  const { data: response, mutate, isLoading, error } = useSWR<ApiResponse>('/api/sostenibilidad/comunidades', fetcher);
  const records = response?.data || [];

  const now = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const stats = useMemo(() => {
    const active = records.filter((record) => normalizeEstado(record.estado) !== 'completado').length;
    const completed = records.filter((record) => normalizeEstado(record.estado) === 'completado').length;
    return {
      active,
      overdue: records.filter((record) => isOverdue(record, now)).length,
      highPriority: records.filter((record) => record.prioridad === 'alta' && normalizeEstado(record.estado) !== 'completado').length,
      compliance: records.length ? Math.round((completed / records.length) * 100) : 0,
    };
  }, [records, now]);

  const filteredRecords = useMemo(() => {
    const priorityWeight = { alta: 0, media: 1, baja: 2 } as const;
    return records
      .filter((record) => filterStakeholder === 'todos' || record.tipo_stakeholder === filterStakeholder)
      .filter((record) => filterStatus === 'todos' || normalizeEstado(record.estado) === filterStatus)
      .filter((record) => {
        const term = search.trim().toLowerCase();
        return (
          !term ||
          record.numero_registro.toLowerCase().includes(term) ||
          record.stakeholder.toLowerCase().includes(term) ||
          record.descripcion.toLowerCase().includes(term) ||
          (record.contacto_email || '').toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        const overdueDifference = Number(isOverdue(b, now)) - Number(isOverdue(a, now));
        if (overdueDifference) return overdueDifference;
        const priorityDifference = priorityWeight[a.prioridad] - priorityWeight[b.prioridad];
        if (priorityDifference) return priorityDifference;
        const aFollowUp = a.fecha_seguimiento ? new Date(`${a.fecha_seguimiento}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
        const bFollowUp = b.fecha_seguimiento ? new Date(`${b.fecha_seguimiento}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
        return aFollowUp - bFollowUp;
      });
  }, [records, filterStakeholder, filterStatus, search, now]);

  const handleInput = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await fetch('/api/sostenibilidad/comunidades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(formData),
    });
    if (!result.ok) return toast.error('Error al crear registro');
    toast.success('Registro creado');
    setIsOpen(false);
    setFormData({ ...BLANK_FORM });
    void mutate();
  };

  const handleDelete = async (id: string, number: string) => {
    if (!confirm(`¿Eliminar "${number}"?`)) return;
    const result = await fetch(`/api/sostenibilidad/comunidades?id=${id}`, { method: 'DELETE', credentials: 'include' });
    if (!result.ok) return toast.error('Error al eliminar registro');
    toast.success('Registro eliminado');
    void mutate();
  };

  const resetFilters = () => {
    setSearch('');
    setFilterStakeholder('todos');
    setFilterStatus('todos');
  };

  return (
    <div className="min-h-screen space-y-6 bg-background p-4 sm:p-6">
      <header className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-sm font-medium text-primary">Sostenibilidad y HSE · Comunidades</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Relación con comunidades</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Controla compromisos, comunicaciones, responsables y seguimientos con stakeholders del territorio.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/sostenibilidad/comunidades/importar">Importar Excel</Link>
          </Button>
          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) setFormData({ ...BLANK_FORM }); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Nuevo registro</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nuevo registro comunitario</DialogTitle>
                <DialogDescription>Registra un evento, comunicación o compromiso y su seguimiento.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2"><Label htmlFor="stakeholder">Stakeholder *</Label><Input id="stakeholder" name="stakeholder" value={formData.stakeholder} onChange={handleInput} required /></div>
                  <div><Label>Tipo de stakeholder</Label><Select value={formData.tipo_stakeholder} onValueChange={(value) => setFormData((current) => ({ ...current, tipo_stakeholder: value as Comunidad['tipo_stakeholder'] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(STAKEHOLDER_TYPES).map(([value, config]) => <SelectItem key={value} value={value}>{config.label}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label>Tipo de registro</Label><Select value={formData.tipo} onValueChange={(value) => setFormData((current) => ({ ...current, tipo: value as Comunidad['tipo'] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Evento">Evento</SelectItem><SelectItem value="Comunicación">Comunicación</SelectItem><SelectItem value="Compromiso">Compromiso</SelectItem></SelectContent></Select></div>
                  <div><Label htmlFor="fecha">Fecha *</Label><Input id="fecha" type="date" name="fecha" value={formData.fecha} onChange={handleInput} required /></div>
                  <div><Label htmlFor="fecha_seguimiento">Fecha de seguimiento</Label><Input id="fecha_seguimiento" type="date" name="fecha_seguimiento" value={formData.fecha_seguimiento} onChange={handleInput} /></div>
                  <div><Label>Prioridad</Label><Select value={formData.prioridad} onValueChange={(value) => setFormData((current) => ({ ...current, prioridad: value as Comunidad['prioridad'] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="alta">Alta</SelectItem><SelectItem value="media">Media</SelectItem><SelectItem value="baja">Baja</SelectItem></SelectContent></Select></div>
                  <div><Label>Estado</Label><Select value={formData.estado} onValueChange={(value) => setFormData((current) => ({ ...current, estado: value as Comunidad['estado'] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pendiente">Pendiente</SelectItem><SelectItem value="en_progreso">En progreso</SelectItem><SelectItem value="completado">Completado</SelectItem></SelectContent></Select></div>
                  <div><Label>Tipo de documento</Label><Select value={formData.tipo_documento} onValueChange={(value) => setFormData((current) => ({ ...current, tipo_documento: value }))}><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger><SelectContent>{Object.entries(DOCUMENT_TYPES).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label htmlFor="ubicacion">Ubicación</Label><Input id="ubicacion" name="ubicacion" value={formData.ubicacion} onChange={handleInput} /></div>
                  <div><Label htmlFor="responsable">Responsable</Label><Input id="responsable" name="responsable" value={formData.responsable} onChange={handleInput} /></div>
                  <div><Label htmlFor="contacto_persona">Persona de contacto</Label><Input id="contacto_persona" name="contacto_persona" value={formData.contacto_persona} onChange={handleInput} /></div>
                  <div><Label htmlFor="contacto_email">Email</Label><Input id="contacto_email" type="email" name="contacto_email" value={formData.contacto_email} onChange={handleInput} /></div>
                  <div><Label htmlFor="contacto_telefono">Teléfono</Label><Input id="contacto_telefono" name="contacto_telefono" value={formData.contacto_telefono} onChange={handleInput} /></div>
                  <div><Label htmlFor="impactado_por">Impactado por</Label><Input id="impactado_por" name="impactado_por" value={formData.impactado_por} onChange={handleInput} /></div>
                  <div className="sm:col-span-2"><Label htmlFor="descripcion">Descripción *</Label><textarea id="descripcion" name="descripcion" value={formData.descripcion} onChange={handleInput} rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required /></div>
                  <div className="sm:col-span-2"><Label htmlFor="observaciones">Observaciones</Label><textarea id="observaciones" name="observaciones" value={formData.observaciones} onChange={handleInput} rows={2} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
                </div>
                <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button><Button type="submit">Crear registro</Button></div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Compromisos activos', stats.active, 'Pendientes o en progreso'],
          ['Vencidos', stats.overdue, 'Requieren atención inmediata'],
          ['Alta prioridad', stats.highPriority, 'Activos con prioridad alta'],
          ['Cumplimiento', `${stats.compliance}%`, 'Registros completados'],
        ].map(([label, value, description]) => (
          <Card key={label} className="shadow-none"><CardHeader className="pb-2"><CardDescription>{label}</CardDescription><CardTitle className="text-2xl">{value}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">{description}</CardContent></Card>
        ))}
      </section>

      <Card className="shadow-none">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar por stakeholder, descripción, email o registro" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
            <Select value={filterStakeholder} onValueChange={setFilterStakeholder}><SelectTrigger className="w-full lg:w-56"><Filter className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos los stakeholders</SelectItem>{Object.entries(STAKEHOLDER_TYPES).map(([value, config]) => <SelectItem key={value} value={value}>{config.label}</SelectItem>)}</SelectContent></Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-full lg:w-48"><Filter className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos los estados</SelectItem><SelectItem value="pendiente">Pendiente</SelectItem><SelectItem value="en_progreso">En progreso</SelectItem><SelectItem value="completado">Completado</SelectItem></SelectContent></Select>
            {(search || filterStakeholder !== 'todos' || filterStatus !== 'todos') && <Button variant="ghost" onClick={resetFilters}>Limpiar</Button>}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="flex-row items-center justify-between space-y-0"><div><CardTitle>Compromisos y relacionamiento</CardTitle><CardDescription>{filteredRecords.length} registros, ordenados por urgencia</CardDescription></div></CardHeader>
        <CardContent className="p-0">
          {isLoading ? <div className="p-8 text-center text-sm text-muted-foreground">Cargando registros...</div> : error ? <div className="p-8 text-center text-sm text-destructive">No fue posible cargar los registros.</div> : filteredRecords.length === 0 ? <div className="flex flex-col items-center py-14 text-center"><AlertTriangle className="mb-3 h-8 w-8 text-muted-foreground" /><p className="font-medium">Sin registros para los filtros actuales</p><p className="text-sm text-muted-foreground">Ajusta los filtros o crea un nuevo registro.</p></div> : <div className="divide-y divide-border">
            {filteredRecords.map((record) => {
              const stakeholder = STAKEHOLDER_TYPES[record.tipo_stakeholder] || STAKEHOLDER_TYPES.comunidad;
              const StakeholderIcon = stakeholder.icon;
              const overdue = isOverdue(record, now);
              return <article key={record.id} className="p-4 transition-colors hover:bg-muted/30 sm:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      {overdue && <Badge variant="destructive">Vencido</Badge>}
                      <Badge className={PRIORITY_COLOR[record.prioridad]}>{record.prioridad}</Badge>
                      <Badge className={STATUS_COLOR[normalizeEstado(record.estado)]}>{normalizeEstado(record.estado).replace('_', ' ')}</Badge>
                      <Badge className={stakeholder.className}><StakeholderIcon className="mr-1 h-3 w-3" />{stakeholder.label}</Badge>
                      <span className="font-mono text-xs text-muted-foreground">{record.numero_registro}</span>
                    </div>
                    <h3 className="font-semibold text-foreground">{record.stakeholder}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{record.descripcion}</p>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                      <span>Registro: {new Date(`${record.fecha}T00:00:00`).toLocaleDateString('es-CL')}</span>
                      {record.fecha_seguimiento && <span>Seguimiento: {new Date(`${record.fecha_seguimiento}T00:00:00`).toLocaleDateString('es-CL')}</span>}
                      {record.responsable && <span>Responsable: {record.responsable}</span>}
                      {record.ubicacion && <span>{record.ubicacion}</span>}
                      {record.contacto_persona && <span>Contacto: {record.contacto_persona}</span>}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" aria-label={`Eliminar ${record.numero_registro}`} className="shrink-0 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(record.id, record.numero_registro)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </article>;
            })}
          </div>}
        </CardContent>
      </Card>
    </div>
  );
}
