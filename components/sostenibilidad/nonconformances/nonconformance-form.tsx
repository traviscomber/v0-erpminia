'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface NonconformanceFormProps {
  onSubmit: (data: any) => void;
  initialData?: any;
}

export function NonconformanceForm({ onSubmit, initialData = {} }: NonconformanceFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: initialData.title || '',
    description: initialData.description || '',
    category: initialData.category || 'safety',
    severity: initialData.severity || 'medium',
    source: initialData.source || 'internal_audit',
    discoveredDate: initialData.discovered_date || new Date().toISOString().split('T')[0],
    targetClosureDate: initialData.target_closure_date || '',
    rootCause: initialData.root_cause || '',
    impactDescription: initialData.impact_description || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
            toast.success('No conformidad guardada correctamente');
    } catch (error) {
      toast.error('No se pudo guardar la no conformidad');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border shadow-none rounded-xl">
      <CardHeader>
        <CardTitle>Reporte de no conformidad</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Título</Label>
            <Input
              placeholder="Título de la no conformidad"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div>
            <Label>Descripción</Label>
            <textarea
              placeholder="Descripción detallada del hallazgo"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded border p-2 text-sm"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Categoría</Label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full rounded border p-2 text-sm"
              >
                <option value="safety">Seguridad</option>
                <option value="environmental">Ambiental</option>
                <option value="health">Salud</option>
                <option value="documentation">Documentación</option>
                <option value="training">Capacitación</option>
              </select>
            </div>

            <div>
              <Label>Severidad</Label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                className="w-full rounded border p-2 text-sm"
              >
                <option value="critical">Crítica</option>
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Origen</Label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full rounded border p-2 text-sm"
              >
                <option value="internal_audit">Auditoría interna</option>
                <option value="external_audit">Auditoría externa</option>
                <option value="incident">Incidente</option>
                <option value="regulatory">Regulatorio</option>
                <option value="customer">Cliente</option>
              </select>
            </div>

            <div>
              <Label>Fecha de detección</Label>
              <Input
                type="date"
                value={formData.discoveredDate}
                onChange={(e) => setFormData({ ...formData, discoveredDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label>Causa raíz</Label>
            <textarea
              placeholder="Análisis de causa raíz"
              value={formData.rootCause}
              onChange={(e) => setFormData({ ...formData, rootCause: e.target.value })}
              className="w-full rounded border p-2 text-sm"
              rows={2}
            />
          </div>

          <div>
            <Label>Impacto</Label>
            <textarea
              placeholder="Impacto potencial de esta no conformidad"
              value={formData.impactDescription}
              onChange={(e) => setFormData({ ...formData, impactDescription: e.target.value })}
              className="w-full rounded border p-2 text-sm"
              rows={2}
            />
          </div>

          <div>
            <Label>Fecha objetivo de cierre</Label>
            <Input
              type="date"
              value={formData.targetClosureDate}
              onChange={(e) => setFormData({ ...formData, targetClosureDate: e.target.value })}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Guardando...' : 'Guardar no conformidad'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
