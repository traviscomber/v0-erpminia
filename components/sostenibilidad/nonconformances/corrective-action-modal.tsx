'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface CorrectiveActionModalProps {
  ncNumber: string;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  initialData?: any;
}

export function CorrectiveActionModal({
  ncNumber,
  onSubmit,
  onCancel,
  initialData = {},
}: CorrectiveActionModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    actionDescription: initialData.action_description || '',
    responsiblePerson: initialData.responsible_person || '',
    scheduledCompletionDate: initialData.scheduled_completion_date || '',
    verificationMethod: initialData.verification_method || 'inspection',
    estimatedCost: initialData.estimated_cost || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
      toast.success('Acción correctiva creada');
    } catch (error) {
      toast.error('No se pudo crear la acción correctiva');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Crear acción correctiva</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">NC: {ncNumber}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Descripción de la acción</Label>
              <textarea
                placeholder="¿Qué acción se ejecutará para corregir esto?"
                value={formData.actionDescription}
                onChange={(e) => setFormData({ ...formData, actionDescription: e.target.value })}
                className="w-full rounded border border-input bg-background p-2 text-sm text-foreground"
                rows={3}
                required
              />
            </div>

            <div>
              <Label>Responsable</Label>
              <Input
                placeholder="Nombre o correo"
                value={formData.responsiblePerson}
                onChange={(e) => setFormData({ ...formData, responsiblePerson: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fecha objetivo de cierre</Label>
                <Input
                  type="date"
                  value={formData.scheduledCompletionDate}
                  onChange={(e) =>
                    setFormData({ ...formData, scheduledCompletionDate: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <Label>Método de verificación</Label>
                <select
                  value={formData.verificationMethod}
                  onChange={(e) => setFormData({ ...formData, verificationMethod: e.target.value })}
                  className="w-full rounded border border-input bg-background p-2 text-sm text-foreground"
                >
                  <option value="inspection">Inspección</option>
                  <option value="measurement">Medición</option>
                  <option value="audit">Auditoría</option>
                  <option value="documentation">Documentación</option>
                </select>
              </div>
            </div>

            <div>
              <Label>Costo estimado</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={formData.estimatedCost}
                onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Creando...' : 'Crear acción'}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
