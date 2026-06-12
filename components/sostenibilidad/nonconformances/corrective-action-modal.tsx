'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface CorrectiveActionModalProps {
  ncNumber: string;
  onSubmit?: (data: any) => void;
  onCancel?: () => void;
  initialData?: any;
}

export function CorrectiveActionModal({ ncNumber, onSubmit, onCancel, initialData }: CorrectiveActionModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    actionDescription: initialData?.action_description || '',
    responsiblePerson: initialData?.responsible_person || '',
    scheduledCompletionDate: initialData?.scheduled_completion_date || '',
    verificationMethod: initialData?.verification_method || 'inspection',
    estimatedCost: initialData?.estimated_cost || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit?.(formData);
      toast.success('Corrective action created');
    } catch (error) {
      toast.error('Failed to create corrective action');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Crear accion correctiva</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">NC: {ncNumber}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Descripcion de la accion</Label>
              <textarea
                placeholder="Que accion se ejecutara para corregir esto?"
                value={formData.actionDescription}
                onChange={(e) => setFormData({ ...formData, actionDescription: e.target.value })}
                className="w-full p-2 border rounded text-sm"
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
                  onChange={(e) => setFormData({ ...formData, scheduledCompletionDate: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label>Metodo de verificacion</Label>
                <select
                  value={formData.verificationMethod}
                  onChange={(e) => setFormData({ ...formData, verificationMethod: e.target.value })}
                  className="w-full p-2 border rounded text-sm"
                >
                  <option value="inspection">Inspeccion</option>
                  <option value="measurement">Medicion</option>
                  <option value="audit">Auditoria</option>
                  <option value="documentation">Documentacion</option>
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
                {loading ? 'Creando...' : 'Crear accion'}
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
