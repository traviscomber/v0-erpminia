'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Calendar, Clock, Download, Eye, Trash2 } from 'lucide-react';
import useSWR from 'swr';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface Capacitacion {
  id: string;
  nombre_capacitacion: string;
  tipo: 'ACHS' | 'OTEC' | 'Inducción' | 'Específica' | 'Charla de Seguridad' | 'Simulacro' | 'Curso E-Learning' | 'Taller Práctico' | 'Certificación' | 'Reentrenamiento' | 'Legal/Normativa' | 'Liderazgo y Gestión';
  tema: string;
  programa_hse: string;
  proveedor_instructor: string;
  fecha_programada: string;
  duracion_horas: number;
  faenas_cargos: string[];
  estado: 'planificada' | 'realizada' | 'cancelada';
}

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json());

export default function CapacitacionesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    nombre_capacitacion: '',
    tipo: 'ACHS' as const,
    tema: '',
    programa_hse: '',
    proveedor_instructor: '',
    fecha_programada: '',
    hora_inicio: '',
    hora_termino: '',
    duracion_horas: 0,
    cantidad_asistentes: 0,
  });

  const { data: capacitaciones, isLoading, mutate } = useSWR('/api/sostenibilidad/capacitaciones', fetcher);
  const capacitacionesList = ((capacitaciones?.data || []) as Capacitacion[]);

  const filteredCapacitaciones = capacitacionesList.filter((cap: Capacitacion) =>
    cap.nombre_capacitacion.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cap.tema.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'duracion_horas' ? parseInt(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/sostenibilidad/capacitaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (response.ok) {
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
        mutate();
        toast.success('Capacitación creada exitosamente');
      } else {
        toast.error('Error al crear capacitación');
      }
    } catch (error) {
      console.error('[v0] Error creating capacitacion:', error);
      toast.error('Error al crear capacitación');
    }
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar capacitación "${nombre}"`)) return;
    
    try {
      const response = await fetch(`/api/sostenibilidad/capacitaciones?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        mutate();
        toast.success('Capacitación eliminada exitosamente');
      } else {
        toast.error('Error al eliminar capacitación');
      }
    } catch (error) {
      console.error('[v0] Error deleting capacitacion:', error);
      toast.error('Error al eliminar capacitación');
    }
  };

  const estadoColor = {
    planificada: 'bg-primary/10 text-primary',
    realizada: 'bg-secondary/10 text-secondary',
    cancelada: 'bg-destructive/10 text-destructive',
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-foreground">Gestión de Capacitaciones</h1>
          </div>
          <p className="text-muted-foreground">Registra y gestiona todas las capacitaciones del personal</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Capacitación
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nueva Capacitación</DialogTitle>
              <DialogDescription>Registra una nueva capacitación para el personal</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nombre">Nombre de la Capacitación</Label>
                  <Input
                    id="nombre"
                    name="nombre_capacitacion"
                    value={formData.nombre_capacitacion}
                    onChange={handleInputChange}
                    placeholder="Ej: Seguridad en alturas"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="tipo">Tipo</Label>
                  <Select 
                    value={formData.tipo}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, tipo: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                  <SelectItem value="ACHS">ACHS</SelectItem>
                  <SelectItem value="OTEC">OTEC</SelectItem>
                  <SelectItem value="Inducción">Inducción</SelectItem>
                  <SelectItem value="Específica">Específica</SelectItem>
                  <SelectItem value="Charla de Seguridad">Charla de Seguridad</SelectItem>
                  <SelectItem value="Simulacro">Simulacro</SelectItem>
                  <SelectItem value="Curso E-Learning">Curso E-Learning</SelectItem>
                  <SelectItem value="Taller Práctico">Taller Práctico</SelectItem>
                  <SelectItem value="Certificación">Certificación</SelectItem>
                  <SelectItem value="Reentrenamiento">Reentrenamiento</SelectItem>
                  <SelectItem value="Legal/Normativa">Legal / Normativa</SelectItem>
                  <SelectItem value="Liderazgo y Gestión">Liderazgo y Gestión</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tema">Tema</Label>
                  <Input
                    id="tema"
                    name="tema"
                    value={formData.tema}
                    onChange={handleInputChange}
                    placeholder="Ej: Prevención de caídas"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="programa">Programa HSE</Label>
                  <Input
                    id="programa"
                    name="programa_hse"
                    value={formData.programa_hse}
                    onChange={handleInputChange}
                    placeholder="Ej: Programa anual 2026"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="proveedor">Proveedor/Instructor</Label>
                  <Input
                    id="proveedor"
                    name="proveedor_instructor"
                    value={formData.proveedor_instructor}
                    onChange={handleInputChange}
                    placeholder="Ej: Juan Pérez"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="fecha">Fecha Programada</Label>
                  <Input
                    id="fecha"
                    type="date"
                    name="fecha_programada"
                    value={formData.fecha_programada}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hora_inicio">Hora de Inicio</Label>
                  <Input
                    id="hora_inicio"
                    type="time"
                    name="hora_inicio"
                    value={formData.hora_inicio}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="hora_termino">Hora de Término</Label>
                  <Input
                    id="hora_termino"
                    type="time"
                    name="hora_termino"
                    value={formData.hora_termino}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="duracion">Duración (horas)</Label>
                  <Input
                    id="duracion"
                    type="number"
                    name="duracion_horas"
                    value={formData.duracion_horas}
                    onChange={handleInputChange}
                    placeholder="Ej: 8"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="asistentes">Cantidad de Asistentes</Label>
                  <Input
                    id="asistentes"
                    type="number"
                    name="cantidad_asistentes"
                    value={formData.cantidad_asistentes}
                    onChange={handleInputChange}
                    placeholder="Ej: 25"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Crear Capacitación
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="flex gap-2">
          <Input
            placeholder="Buscar por nombre, tema o programa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Button variant="outline" size="icon">
            <Search className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Capacitaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredCapacitaciones.length}</div>
            <p className="text-xs text-muted-foreground">Este año</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Planificadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredCapacitaciones.filter((c: Capacitacion) => c.estado === 'planificada').length}</div>
            <p className="text-xs text-muted-foreground">Por realizar</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Realizadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredCapacitaciones.filter((c: Capacitacion) => c.estado === 'realizada').length}</div>
            <p className="text-xs text-muted-foreground">Completadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Horas Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredCapacitaciones.reduce((sum: number, c: Capacitacion) => sum + (c.duracion_horas || 0), 0)}</div>
            <p className="text-xs text-muted-foreground">Horas capacitación</p>
          </CardContent>
        </Card>
      </div>

      {/* Capacitaciones Table */}
      <Card>
        <CardHeader>
          <CardTitle>Capacitaciones Registradas</CardTitle>
          <CardDescription>Lista completa de capacitaciones planificadas y realizadas</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : filteredCapacitaciones.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No hay capacitaciones registradas</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium">Nombre</th>
                    <th className="text-left py-3 px-4 font-medium">Tipo</th>
                    <th className="text-left py-3 px-4 font-medium">Proveedor</th>
                    <th className="text-left py-3 px-4 font-medium">Fecha</th>
                    <th className="text-left py-3 px-4 font-medium">Duración</th>
                    <th className="text-left py-3 px-4 font-medium">Estado</th>
                    <th className="text-right py-3 px-4 font-medium">Accines</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCapacitaciones.map((cap: Capacitacion) => (
                    <tr key={cap.id} className="border-b border-border hover:bg-muted transition">
                      <td className="py-3 px-4">
                        <div className="font-medium">{cap.nombre_capacitacion}</div>
                        <div className="text-xs text-muted-foreground">{cap.tema}</div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">{cap.tipo}</Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{cap.proveedor_instructor}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {new Date(cap.fecha_programada).toLocaleDateString('es-CL')}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          {cap.duracion_horas}h
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={estadoColor[cap.estado]}>
                          {cap.estado}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" title="Ver detalles">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Descargar">
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title="Eliminar"
                            onClick={() => handleDelete(cap.id, cap.nombre_capacitacion)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
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

