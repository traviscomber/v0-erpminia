'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CostCenterSelect } from '@/components/common/cost-center-select';
import { toast } from 'sonner';

interface WorkOrderFormProps {
  assetId: string;
  onSuccess: () => void;
}

export function WorkOrderForm({ assetId, onSuccess }: WorkOrderFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    workType: 'corrective',
    priority: 'medium',
    plannedDurationHours: 1,
    scheduledDate: '',
    costCenterId: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      toast.error('El titulo es obligatorio');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/maintenance/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          workType: formData.workType,
          priority: formData.priority,
          plannedDurationHours: parseFloat(formData.plannedDurationHours.toString()),
          scheduledDate: formData.scheduledDate,
          costCenterId: formData.costCenterId,
          assetId,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'No se pudo crear la orden de trabajo');
      }

      const { data } = await res.json();
      toast.success(`Orden de trabajo ${data.work_order_number} creada con exito`);
      onSuccess();
      setFormData({
        title: '',
        description: '',
        workType: 'corrective',
        priority: 'medium',
        plannedDurationHours: 1,
        scheduledDate: '',
        costCenterId: '',
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al crear la orden de trabajo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nueva orden de trabajo</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Titulo</Label>
            <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
          </div>

          <div>
            <Label htmlFor="description">Descripcion</Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded border p-2"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="costCenter">Centro de costos</Label>
            <CostCenterSelect
              value={formData.costCenterId}
              onValueChange={(id) => setFormData({ ...formData, costCenterId: id })}
              placeholder="Seleccionar centro de costos..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="workType">Tipo de trabajo</Label>
              <Select value={formData.workType} onValueChange={(v) => setFormData({ ...formData, workType: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="corrective">Correctivo</SelectItem>
                  <SelectItem value="preventive">Preventivo</SelectItem>
                  <SelectItem value="predictive">Predictivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">Prioridad</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="critical">Critica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="plannedDuration">Duracion planificada (horas)</Label>
              <Input
                id="plannedDuration"
                type="number"
                step="0.5"
                value={formData.plannedDurationHours}
                onChange={(e) => setFormData({ ...formData, plannedDurationHours: parseFloat(e.target.value) })}
                required
              />
            </div>

            <div>
              <Label htmlFor="scheduledDate">Fecha programada</Label>
              <Input
                id="scheduledDate"
                type="date"
                value={formData.scheduledDate}
                onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creando...' : 'Crear orden de trabajo'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
