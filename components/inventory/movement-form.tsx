'use client';

import { useState } from 'react';
import { updateWearPart } from '@/app/actions/db-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Plus, Minus } from 'lucide-react';

interface InventoryMovement {
  part_id: string;
  movement_type: 'entrada' | 'salida';
  quantity: number;
  reason?: string;
  batch?: string;
  location?: string;
}

interface InventoryMovementFormProps {
  partId: string;
  partName: string;
  currentStock: number;
  onSuccess?: () => void;
}

export function InventoryMovementForm({
  partId,
  partName,
  currentStock,
  onSuccess,
}: InventoryMovementFormProps) {
  const [formData, setFormData] = useState<InventoryMovement>({
    part_id: partId,
    movement_type: 'entrada',
    quantity: 1,
    reason: '',
    batch: '',
    location: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const canProcess =
    formData.movement_type === 'entrada' ||
    (formData.movement_type === 'salida' && formData.quantity <= currentStock);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    if (!canProcess) {
      setError('No hay suficiente stock para esta salida');
      setIsSubmitting(false);
      return;
    }

    try {
      const newStock =
        formData.movement_type === 'entrada'
          ? currentStock + formData.quantity
          : currentStock - formData.quantity;

      await updateWearPart(partId, { stock_current: newStock });

      setSuccess(true);
      setFormData({
        part_id: partId,
        movement_type: 'entrada',
        quantity: 1,
        reason: '',
        batch: '',
        location: '',
      });
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error registrando movimiento');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle>Registrar Movimiento</CardTitle>
        <CardDescription>{partName}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-sm text-green-700">Movimiento registrado exitosamente</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Stock Actual</label>
            <div className="p-3 bg-muted rounded-lg text-center font-bold text-lg">
              {currentStock} unidades
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, movement_type: 'entrada' })}
              className={`p-3 rounded-lg border-2 text-center transition ${
                formData.movement_type === 'entrada'
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-border'
              }`}
            >
              <Plus className="h-4 w-4 mx-auto mb-1 text-green-600" />
              <div className="text-sm font-medium">Entrada</div>
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, movement_type: 'salida' })}
              className={`p-3 rounded-lg border-2 text-center transition ${
                formData.movement_type === 'salida'
                  ? 'border-orange-500 bg-orange-500/10'
                  : 'border-border'
              }`}
            >
              <Minus className="h-4 w-4 mx-auto mb-1 text-orange-600" />
              <div className="text-sm font-medium">Salida</div>
            </button>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Cantidad</label>
            <Input
              type="number"
              min="1"
              max={formData.movement_type === 'salida' ? currentStock : undefined}
              value={formData.quantity}
              onChange={(e) =>
                setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })
              }
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Motivo</label>
            <Select value={formData.reason} onValueChange={(value) => setFormData({ ...formData, reason: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un motivo" />
              </SelectTrigger>
              <SelectContent>
                {formData.movement_type === 'entrada' && (
                  <>
                    <SelectItem value="compra">Compra</SelectItem>
                    <SelectItem value="devolucion">Devolución</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                    <SelectItem value="ajuste">Ajuste de Inventario</SelectItem>
                  </>
                )}
                {formData.movement_type === 'salida' && (
                  <>
                    <SelectItem value="uso">Uso en Mantención</SelectItem>
                    <SelectItem value="perdida">Pérdida/Dañado</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                    <SelectItem value="venta">Venta</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Número de Lote (FIFO)</label>
            <Input
              placeholder="Ej: BATCH-2024-001"
              value={formData.batch}
              onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Ubicación</label>
            <Input
              placeholder="Ej: Zona-A / Rack-1 / Nivel-2"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || !canProcess}
            className="w-full"
          >
            {isSubmitting ? 'Registrando...' : 'Registrar Movimiento'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
