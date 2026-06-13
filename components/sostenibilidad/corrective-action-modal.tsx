'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export function CorrectiveActionModal({ open, onOpenChange, ncId, onCreate }: any) {
  const [data, setData] = useState({
    actionDescription: '',
    responsiblePerson: '',
    scheduledCompletionDate: '',
    verificationMethod: '',
  });
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!ncId) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/sostenibilidad/corrective-actionsncId=${ncId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, ncId }),
      });
      if (res.ok) {
        onCreate();
        onOpenChange(false);
        setData({ actionDescription: '', responsiblePerson: '', scheduledCompletionDate: '', verificationMethod: '' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
        <DialogTitle>Crear acción correctiva</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!ncId && (
            <p className="text-sm text-muted-foreground">
              Selecciona primero una no conformidad para crear la acción correctiva.
            </p>
          )}
          <div>
            <Label>Descripción de la acción</Label>
            <Textarea
              placeholder="Describe la acción que se ejecutará..."
              value={data.actionDescription}
              onChange={(e) => setData({ ...data, actionDescription: e.target.value })}
            />
          </div>
          <div>
            <Label>Responsable</Label>
            <Input
              placeholder="Nombre o ID"
              value={data.responsiblePerson}
              onChange={(e) => setData({ ...data, responsiblePerson: e.target.value })}
            />
          </div>
          <div>
            <Label>Fecha objetivo de cierre</Label>
            <Input
              type="date"
              value={data.scheduledCompletionDate}
              onChange={(e) => setData({ ...data, scheduledCompletionDate: e.target.value })}
            />
          </div>
          <div>
            <Label>Método de verificación</Label>
            <Select value={data.verificationMethod} onValueChange={(val) => setData({ ...data, verificationMethod: val })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inspection">Inspección</SelectItem>
                <SelectItem value="testing">Prueba</SelectItem>
                <SelectItem value="audit">Auditoría</SelectItem>
                <SelectItem value="review">Revisión documental</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleCreate} disabled={loading || !ncId} className="w-full">
            {loading ? 'Creando...' : 'Crear acción'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
