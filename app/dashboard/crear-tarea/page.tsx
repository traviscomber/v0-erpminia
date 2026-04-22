'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Upload, MapPin, Users, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

export default function CrearTareaPage() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignee: '',
    site: '',
    zone: '',
    priority: '',
    dueDate: '',
    dueTime: '',
    category: '',
    attachment: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Título es requerido';
    if (!formData.assignee) newErrors.assignee = 'Debe asignar a alguien';
    if (!formData.site) newErrors.site = 'Seleccione un sitio';
    if (!formData.priority) newErrors.priority = 'Seleccione prioridad';
    if (!formData.dueDate) newErrors.dueDate = 'Seleccione fecha';
    if (!formData.dueTime) newErrors.dueTime = 'Seleccione hora';
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validateForm();
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      // Simular envío
      await new Promise((resolve) => setTimeout(resolve, 1500));
      alert('Tarea creada exitosamente');
      // Reset form
      setFormData({
        title: '',
        description: '',
        assignee: '',
        site: '',
        zone: '',
        priority: '',
        dueDate: '',
        dueTime: '',
        category: '',
        attachment: null,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const priorityOptions = [
    { value: 'baja', label: 'Baja', color: 'text-muted-foreground' },
    { value: 'media', label: 'Media', color: 'text-yellow-600' },
    { value: 'alta', label: 'Alta', color: 'text-orange-600' },
    { value: 'critica', label: 'Crítica', color: 'text-destructive' },
  ];

  const selectedPriority = priorityOptions.find((p) => p.value === formData.priority);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Crear Nueva Tarea</h1>
        <p className="text-muted-foreground mt-2">
          Rápido. Simple. Diseñado para operaciones mineras.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Detalles de la Tarea</CardTitle>
              <CardDescription>
                Rellena los campos requeridos. Todos los campos se preservan si hay error.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Title */}
                <div>
                  <label className="text-sm font-medium block mb-2">
                    Título de la Tarea *
                  </label>
                  <Input
                    placeholder="ej. Inspección pre-turno excavadora 4"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    className={errors.title ? 'border-destructive' : ''}
                  />
                  {errors.title && (
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.title}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="text-sm font-medium block mb-2">Descripción</label>
                  <textarea
                    placeholder="Detalles adicionales... (opcional)"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    className="w-full h-24 px-3 py-2 border border-input rounded-md bg-background text-sm"
                  />
                </div>

                {/* Assignee and Site row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Assignee */}
                  <div>
                    <label className="text-sm font-medium block mb-2">Asignar a *</label>
                    <Select value={formData.assignee} onValueChange={(val) => handleChange('assignee', val)}>
                      <SelectTrigger className={errors.assignee ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Seleccionar trabajador" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="carlos_meneses">Carlos Meneses</SelectItem>
                        <SelectItem value="maria_gonzalez">María González</SelectItem>
                        <SelectItem value="roberto_silva">Roberto Silva</SelectItem>
                        <SelectItem value="juan_torres">Juan Torres</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.assignee && (
                      <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.assignee}
                      </p>
                    )}
                  </div>

                  {/* Site */}
                  <div>
                    <label className="text-sm font-medium block mb-2">Sitio / Faena *</label>
                    <Select value={formData.site} onValueChange={(val) => handleChange('site', val)}>
                      <SelectTrigger className={errors.site ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Seleccionar sitio" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="faena_central">Faena Central</SelectItem>
                        <SelectItem value="faena_norte">Faena Norte</SelectItem>
                        <SelectItem value="faena_sur">Faena Sur</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.site && (
                      <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.site}
                      </p>
                    )}
                  </div>
                </div>

                {/* Zone and Category row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Zone */}
                  <div>
                    <label className="text-sm font-medium block mb-2">Zona (opcional)</label>
                    <Select value={formData.zone} onValueChange={(val) => handleChange('zone', val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar zona" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="zona_a">Zona A - Extracción</SelectItem>
                        <SelectItem value="zona_b">Zona B - Procesamiento</SelectItem>
                        <SelectItem value="zona_c">Zona C - Almacenamiento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="text-sm font-medium block mb-2">Categoría</label>
                    <Select value={formData.category} onValueChange={(val) => handleChange('category', val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mantenimiento">Mantención</SelectItem>
                        <SelectItem value="inspección">Inspección</SelectItem>
                        <SelectItem value="reparación">Reparación</SelectItem>
                        <SelectItem value="seguridad">Seguridad</SelectItem>
                        <SelectItem value="otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Priority and Due Date row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Priority */}
                  <div>
                    <label className="text-sm font-medium block mb-2">Prioridad *</label>
                    <Select value={formData.priority} onValueChange={(val) => handleChange('priority', val)}>
                      <SelectTrigger className={errors.priority ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Seleccionar prioridad" />
                      </SelectTrigger>
                      <SelectContent>
                        {priorityOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.priority && (
                      <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.priority}
                      </p>
                    )}
                  </div>

                  {/* Due Date */}
                  <div>
                    <label className="text-sm font-medium block mb-2">Fecha Vencimiento *</label>
                    <Input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => handleChange('dueDate', e.target.value)}
                      className={errors.dueDate ? 'border-destructive' : ''}
                    />
                    {errors.dueDate && (
                      <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.dueDate}
                      </p>
                    )}
                  </div>
                </div>

                {/* Due Time */}
                <div>
                  <label className="text-sm font-medium block mb-2">Hora Vencimiento *</label>
                  <Input
                    type="time"
                    value={formData.dueTime}
                    onChange={(e) => handleChange('dueTime', e.target.value)}
                    className={errors.dueTime ? 'border-destructive' : ''}
                  />
                  {errors.dueTime && (
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.dueTime}
                    </p>
                  )}
                </div>

                {/* Attachment */}
                <div>
                  <label className="text-sm font-medium block mb-2">
                    Adjuntar Foto/Documento (opcional)
                  </label>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
                    <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">Arrastra archivo aquí o haz clic</p>
                    <p className="text-xs text-muted-foreground">Fotos, PDFs, documentos</p>
                  </div>
                </div>

                {/* Submit */}
                <div className="flex gap-3 pt-4">
                  <Button type="submit" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting ? 'Guardando...' : 'Crear Tarea'}
                  </Button>
                  <Button type="button" variant="outline">
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Preview sidebar */}
        <div>
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle className="text-base">Vista Previa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Preview */}
              <div className="p-3 rounded-lg border border-border bg-muted/30">
                <div className="space-y-3">
                  {formData.title && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">TÍTULO</p>
                      <p className="font-medium text-sm mt-1">{formData.title}</p>
                    </div>
                  )}

                  {formData.assignee && (
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span>{formData.assignee}</span>
                    </div>
                  )}

                  {formData.site && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>{formData.site}</span>
                    </div>
                  )}

                  {formData.priority && (
                    <div className="flex items-center gap-2">
                      <Badge className={selectedPriority?.color}>
                        {selectedPriority?.label}
                      </Badge>
                    </div>
                  )}

                  {formData.dueDate && formData.dueTime && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>
                        {new Date(formData.dueDate).toLocaleDateString('es-CL')} a las{' '}
                        {formData.dueTime}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-xs font-medium text-primary mb-1">Automatización</p>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-accent" />
                    Notificación enviada
                  </li>
                  <li className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-accent" />
                    Recordatorio 1 hora antes
                  </li>
                  <li className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-accent" />
                    Auditoría registrada
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
