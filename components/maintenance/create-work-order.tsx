// DEPRECATED: Use WorkOrderForm instead
// This component uses outdated server actions and data structure
'use client';

import { useState } from 'react';
import { createMaintenanceOrder, updateMaintenanceOrder } from '@/app/actions/db-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface CreateWorkOrderProps {
  equipmentId: string;
  equipmentName: string;
  onSuccess: () => void;
}

export function CreateWorkOrder({ equipmentId, equipmentName, onSuccess }: CreateWorkOrderProps) {
  const [formData, setFormData] = useState({
    order_number: `MO-${Date.now()}`,
    title: '',
    description: '',
    maintenance_type: 'preventiva',
    priority: 'media',
    status: 'pendiente',
    estimated_hours: 0,
    estimated_cost: 0,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    try {
      const result = await createMaintenanceOrder({
        ...formData,
        vehicle_id: equipmentId,
        assigned_to: '',
      });

      if (result) {
        setSuccess(true);
        setFormData({
          order_number: `MO-${Date.now()}`,
          title: '',
          description: '',
          maintenance_type: 'preventiva',
          priority: 'media',
          status: 'pendiente',
          estimated_hours: 0,
          estimated_cost: 0,
        });
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la orden de trabajo');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle>Crear nueva orden de trabajo</CardTitle>
        <CardDescription>{equipmentName}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-3 rounded-lg border border-green-500/30 bg-green-500/10 p-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
              <p className="text-sm text-green-700">Orden de trabajo creada exitosamente</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Numero de orden</label>
              <Input value={formData.order_number} disabled className="bg-muted" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Prioridad</label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baja">Baja</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="critica_seguridad">Critica de seguridad</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Titulo</label>
            <Input
              placeholder="Ej: Mantencion preventiva de compresores"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Descripcion</label>
            <Textarea
              placeholder="Detalla el trabajo a realizar..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Tipo de mantencion</label>
              <Select
                value={formData.maintenance_type}
                onValueChange={(value) => setFormData({ ...formData, maintenance_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preventiva">Preventiva</SelectItem>
                  <SelectItem value="correctiva">Correctiva</SelectItem>
                  <SelectItem value="predictiva">Predictiva</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Horas estimadas</label>
              <Input
                type="number"
                min="0"
                value={formData.estimated_hours}
                onChange={(e) => setFormData({ ...formData, estimated_hours: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Costo estimado (CLP)</label>
            <Input
              type="number"
              min="0"
              value={formData.estimated_cost}
              onChange={(e) => setFormData({ ...formData, estimated_cost: parseFloat(e.target.value) })}
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Creando...' : 'Crear orden de trabajo'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
