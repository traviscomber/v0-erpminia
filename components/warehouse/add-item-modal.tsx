'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface AddItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (item: any) => void;
}

export function AddItemModal({ open, onOpenChange, onSubmit }: AddItemModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    part_code: '',
    part_name: '',
    quantity_on_hand: '0',
    reorder_level: '5',
    reorder_quantity: '10',
    unit_cost: '0',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/warehouse/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          part_code: formData.part_code,
          part_name: formData.part_name,
          quantity_on_hand: parseInt(formData.quantity_on_hand, 10),
          reorder_level: parseInt(formData.reorder_level, 10),
          reorder_quantity: parseInt(formData.reorder_quantity, 10),
          unit_cost: parseFloat(formData.unit_cost),
        }),
      });

      if (res.ok) {
        toast.success('Articulo agregado correctamente');
        onSubmit(await res.json());
        setFormData({
          part_code: '',
          part_name: '',
          quantity_on_hand: '0',
          reorder_level: '5',
          reorder_quantity: '10',
          unit_cost: '0',
        });
        onOpenChange(false);
      } else {
        toast.error('Error al agregar articulo');
      }
    } catch (error) {
      toast.error('Error: ' + String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar articulo</DialogTitle>
          <DialogDescription>Ingresa los detalles del nuevo articulo de inventario</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Codigo de parte</Label>
            <Input
              required
              value={formData.part_code}
              onChange={(e) => setFormData({ ...formData, part_code: e.target.value })}
              placeholder="SKU-001"
            />
          </div>

          <div>
            <Label>Nombre del articulo</Label>
            <Input
              required
              value={formData.part_name}
              onChange={(e) => setFormData({ ...formData, part_name: e.target.value })}
              placeholder="Correa de transmision"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Cantidad actual</Label>
              <Input
                type="number"
                value={formData.quantity_on_hand}
                onChange={(e) => setFormData({ ...formData, quantity_on_hand: e.target.value })}
              />
            </div>
            <div>
              <Label>Costo unitario</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.unit_cost}
                onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
                placeholder="250.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nivel de reorden</Label>
              <Input
                type="number"
                value={formData.reorder_level}
                onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
              />
            </div>
            <div>
              <Label>Cantidad de reorden</Label>
              <Input
                type="number"
                value={formData.reorder_quantity}
                onChange={(e) => setFormData({ ...formData, reorder_quantity: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Agregar articulo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
