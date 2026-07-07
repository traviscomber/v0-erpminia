'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { toast } from 'sonner';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Loader2,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Capacitacion = {
  id: string;
  nombre_capacitacion?: string | null;
  tipo?: string | null;
  tema?: string | null;
  programa_hse?: string | null;
  proveedor_instructor?: string | null;
  fecha_programada?: string | null;
  duracion_horas?: number | null;
  estado?: string | null;
};

type ResponseData = {
  data?: Capacitacion[];
};

const tipoOptions = [
  'ACHS',
  'OTEC',
  'Inducción',
  'Específica',
  'Charla de Seguridad',
  'Simulacro',
  'Curso E-Learning',
  'Taller Práctico',
  'Certificación',
  'Reentrenamiento',
  'Legal/Normativa',
  'Liderazgo y Gestión',
] as const;

const estadoStyles: Record<string, string> = {
  planificada: 'bg-primary/10 text-primary',
  realizada: 'bg-[var(--brand-verde)]/10 text-[var(--brand-verde)]',
  cancelada: 'bg-destructive/10 text-destructive',
};

function cleanText(value?: string | null) {
  return String(value ?? '')
    .replace(/Ã¡/g, 'á')
    .replace(/Ã©/g, 'é')
    .replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã±/g, 'ñ')
    .replace(/Ã/g, 'Á')
    .replace(/Ã‰/g, 'É')
    .replace(/Ã/g, 'Í')
    .replace(/Ã“/g, 'Ó')
    .replace(/Ãš/g, 'Ú')
    .replace(/Ã‘/g, 'Ñ')
    .replace(/Â¿/g, '¿')
    .replace(/Â¡/g, '¡')
    .trim();
}

function formatTipo(value?: string | null) {
  return cleanText(value) || 'Sin tipo';
}

const fetcher = async (url: string): Promise<ResponseData> => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) return {} as ResponseData;
  return (payload || {}) as ResponseData;
};

export default function CapacitacionesPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    imported?: number;
    updated?: number;
    error?: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    nombre_capacitacion: '',
    tipo: 'ACHS' as (typeof tipoOptions)[number],
    tema: '',
    programa_hse: '',
    proveedor_instructor: '',
    fecha_programada: '',
    hora_inicio: '',
    hora_termino: '',
    duracion_horas: 0,
    cantidad_asistentes: 0,
  });

  const { data, isLoading, mutate } = useSWR<ResponseData>('/api/sostenibilidad/capacitaciones', fetcher);
  const capacitaciones = data?.data ?? [];

  const filteredCapacitaciones = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return capacitaciones;

    return capacitaciones.filter((cap) => {
      const fields = [cap.nombre_capacitacion, cap.tema, cap.programa_hse, cap.proveedor_instructor, cap.tipo]
        .map((item) => cleanText(item).toLowerCase())
        .join(' ');
      return fields.includes(query);
    });
  }, [capacitaciones, searchTerm]);

  const reload = () => void mutate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      const response = await fetch('/api/sostenibilidad/capacitaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        toast.error('Error al crear capacitación');
        return;
      }

      setIsOpen(false);
      setFormData({
        nombre_capacitacion: '',
        tipo: 'ACHS',
        tema: '',
        programa_hse: '',
        proveedor_instructor: '',
        fecha_programada: '',
        hora_inicio: '',
        hora_termino: '',
        duracion_horas: 0,
        cantidad_asistentes: 0,
      });
      reload();
      toast.success('Capacitación creada');
    } catch (error) {
      console.error('[capacitaciones] create failed', error);
      toast.error('Error al crear capacitación');
    }
  };

  const handleDelete = async (id: string, nombre?: string | null) => {
    if (!confirm(`Eliminar capacitación "${cleanText(nombre)}"?`)) return;

    try {
      const response = await fetch(`/api/sostenibilidad/capacitaciones?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        toast.error('Error al eliminar capacitación');
        return;
      }

      reload();
      toast.success('Capacitación eliminada');
    } catch (error) {
      console.error('[capacitaciones] delete failed', error);
      toast.error('Error al eliminar capacitación');
    }
  };

  const handleImportFile = async (file: File) => {
    const valid = /\.(csv|xls|xlsx)$/i.test(file.name);
    if (!valid) {
      setImportResult({
        success: false,
        message: 'Solo aceptamos archivos CSV, XLS o XLSX',
        error: 'Tipo de archivo no valido',
      });
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const form = new FormData();
      form.append('file', file);

      const response = await fetch('/api/sostenibilidad/capacitaciones', {
        method: 'POST',
        body: form,
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setImportResult({
          success: false,
          message: 'No se pudo importar capacitaciónes',
          error: payload.error || 'Error desconocido',
        });
        return;
      }

      setImportResult({
        success: true,
        message: payload.message || 'Capacitaciones importadas correctamente',
        imported: payload.imported,
        updated: payload.updated,
      });
      reload();
    } catch (error) {
      setImportResult({
        success: false,
        message: 'Error al subir el archivo',
        error: String(error),
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void handleImportFile(file);
  };

  const stats = {
    total: filteredCapacitaciones.length,
    planificadas: filteredCapacitaciones.filter((item) => item.estado === 'planificada').length,
    realizadas: filteredCapacitaciones.filter((item) => item.estado === 'realizada').length,
    horas: filteredCapacitaciones.reduce((sum, item) => sum + (item.duracion_horas || 0), 0),
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestión de Capacitaciones</h1>
          <p className="text-muted-foreground">Registra, importa y administra las capacitaciones del personal.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/sostenibilidad/prevencion-riesgos/capacitaciones/importar">
              <Download className="mr-2 h-4 w-4" />
              Plantilla
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/sostenibilidad/prevencion-riesgos/capacitaciones/importar">
              <Upload className="mr-2 h-4 w-4" />
              Importar Excel
            </Link>
          </Button>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />
                Nueva capacitación
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nueva capacitación</DialogTitle>
                <DialogDescription>Registra una nueva capacitación para el personal.</DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="nombre_capacitacion">Nombre</Label>
                    <Input
                      id="nombre_capacitacion"
                      value={formData.nombre_capacitacion}
                      onChange={(event) => setFormData((prev) => ({ ...prev, nombre_capacitacion: event.target.value }))}
                      placeholder="Ej: Seguridad en alturas"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tipo">Tipo</Label>
                    <Select value={formData.tipo} onValueChange={(value) => setFormData((prev) => ({ ...prev, tipo: value as typeof formData.tipo }))}>
                      <SelectTrigger id="tipo">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {tipoOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fecha_programada">Fecha programada</Label>
                    <Input
                      id="fecha_programada"
                      type="date"
                      value={formData.fecha_programada}
                      onChange={(event) => setFormData((prev) => ({ ...prev, fecha_programada: event.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tema">Tema</Label>
                    <Input
                      id="tema"
                      value={formData.tema}
                      onChange={(event) => setFormData((prev) => ({ ...prev, tema: event.target.value }))}
                      placeholder="Ej: Prevención de caídas"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="programa_hse">Programa HSE</Label>
                    <Input
                      id="programa_hse"
                      value={formData.programa_hse}
                      onChange={(event) => setFormData((prev) => ({ ...prev, programa_hse: event.target.value }))}
                      placeholder="Ej: Programa anual 2026"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="proveedor_instructor">Proveedor o instructor</Label>
                    <Input
                      id="proveedor_instructor"
                      value={formData.proveedor_instructor}
                      onChange={(event) => setFormData((prev) => ({ ...prev, proveedor_instructor: event.target.value }))}
                      placeholder="Ej: Juan Pérez"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hora_inicio">Hora inicio</Label>
                    <Input
                      id="hora_inicio"
                      type="time"
                      value={formData.hora_inicio}
                      onChange={(event) => setFormData((prev) => ({ ...prev, hora_inicio: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hora_termino">Hora término</Label>
                    <Input
                      id="hora_termino"
                      type="time"
                      value={formData.hora_termino}
                      onChange={(event) => setFormData((prev) => ({ ...prev, hora_termino: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duracion_horas">Duración (horas)</Label>
                    <Input
                      id="duracion_horas"
                      type="number"
                      min="0"
                      value={formData.duracion_horas}
                      onChange={(event) => setFormData((prev) => ({ ...prev, duracion_horas: Number(event.target.value) || 0 }))}
                      placeholder="8"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cantidad_asistentes">Cantidad de asistentes</Label>
                    <Input
                      id="cantidad_asistentes"
                      type="number"
                      min="0"
                      value={formData.cantidad_asistentes}
                      onChange={(event) => setFormData((prev) => ({ ...prev, cantidad_asistentes: Number(event.target.value) || 0 }))}
                      placeholder="25"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">Crear capacitación</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="mb-6 border-[var(--secondary)]/25 bg-[var(--secondary)]/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-5 w-5" />
            Importar capacitaciones desde Excel
          </CardTitle>
          <CardDescription>Carga archivos CSV, XLS o XLSX. Si ya existe un registro por nombre y fecha, se actualiza.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onDragEnter={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setDragActive(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setDragActive(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setDragActive(false);
            }}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
          >
            <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="font-semibold text-foreground">Arrastra tu archivo o haz clic para seleccionar</p>
            <p className="mt-1 text-sm text-muted-foreground">Formato: CSV, XLS o XLSX</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xls,.xlsx"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleImportFile(file);
              }}
            />
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="mb-2 font-semibold">Columnas esperadas:</p>
              <div className="rounded bg-muted p-2 font-mono text-sm">
                NOMBRE_CAPACITACION | TIPO | TEMA | PROGRAMA_HSE | PROVEEDOR_INSTRUCTOR | FECHA_PROGRAMADA
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Opcionales: HORA_INICIO, HORA_TERMINO, DURACION_HORAS, CANTIDAD_ASISTENTES, FAENAS_CARGOS, ESTADO.
              </p>
            </AlertDescription>
          </Alert>

          {importResult ? (
            <Alert className={importResult.success ? 'border-green-500' : 'border-red-500'}>
              {importResult.success ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-red-600" />}
              <AlertDescription>
                <p className={importResult.success ? 'font-semibold text-green-900' : 'font-semibold text-red-900'}>{importResult.message}</p>
                {importResult.imported !== undefined ? <p className="mt-1 text-sm">Importadas: {importResult.imported}</p> : null}
                {importResult.updated !== undefined ? <p className="text-sm">Actualizadas: {importResult.updated}</p> : null}
                {importResult.error ? <p className="mt-1 text-sm text-red-700">{importResult.error}</p> : null}
              </AlertDescription>
            </Alert>
          ) : null}

          {isImporting ? (
            <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Procesando archivo...
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="mb-6 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar por nombre, tema o programa..."
          />
        </div>
        <Button variant="outline" size="icon" aria-label="Buscar">
          <Search className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total capacitaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Este ano</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Planificadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.planificadas}</div>
            <p className="text-xs text-muted-foreground">Por realizar</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Realizadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.realizadas}</div>
            <p className="text-xs text-muted-foreground">Completadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Horas totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.horas}</div>
            <p className="text-xs text-muted-foreground">Horas de capacitación</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Capacitaciones registradas</CardTitle>
          <CardDescription>Lista completa de capacitaciones planificadas y realizadas.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : filteredCapacitaciones.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No hay capacitaciones registradas</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left font-medium">Nombre</th>
                    <th className="px-4 py-3 text-left font-medium">Tipo</th>
                    <th className="px-4 py-3 text-left font-medium">Proveedor</th>
                    <th className="px-4 py-3 text-left font-medium">Fecha</th>
                    <th className="px-4 py-3 text-left font-medium">Duración</th>
                    <th className="px-4 py-3 text-left font-medium">Estado</th>
                    <th className="px-4 py-3 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCapacitaciones.map((cap) => (
                    <tr key={cap.id} className="border-b border-border transition hover:bg-muted">
                      <td className="px-4 py-3">
                        <div className="font-medium">{cleanText(cap.nombre_capacitacion) || 'Sin nombre'}</div>
                        <div className="text-xs text-muted-foreground">{cleanText(cap.tema)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{formatTipo(cap.tipo)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{cleanText(cap.proveedor_instructor) || 'Sin proveedor'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {cap.fecha_programada ? new Date(cap.fecha_programada).toLocaleDateString('es-CL') : 'Sin fecha'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {cap.duracion_horas || 0}h
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={estadoStyles[cap.estado || ''] || 'bg-muted text-muted-foreground'}>
                          {cleanText(cap.estado) || 'Sin estado'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" aria-label="Ver detalle">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" aria-label="Eliminar" onClick={() => handleDelete(cap.id, cap.nombre_capacitacion)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
