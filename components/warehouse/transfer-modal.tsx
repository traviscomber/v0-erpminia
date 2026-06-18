'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import useSWR from 'swr';
import { toast } from 'sonner';

interface TransferModalProps {
  onTransfer: (data: any) => void;
}

export function TransferModal({ onTransfer }: TransferModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    stockId: '',
    toBinId: '',
    quantity: '',
    reason: '',
  });

  const { data } = useSWR('/api/warehouse/stock', async (url: string) => {
    const res = await fetch(url, { credentials: 'include' });
    return res.ok ? res.json() : null;
  });

  const stockList = data.stock || [];
  const bins = data.bins || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/warehouse/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          stockId: formData.stockId,
          toBinId: formData.toBinId,
          quantity: Number(formData.quantity || 0),
          reason: formData.reason,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'La transferencia fallo');
      }

      toast.success('Transferencia completada');
      setFormData({
        stockId: '',
        toBinId: '',
        quantity: '',
        reason: '',
      });
      onTransfer(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'La transferencia fallo');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transferir stock</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Stock</Label>
            <Select
              value={formData.stockId}
              onValueChange={(value) => setFormData({ ...formData, stockId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un insumo" />
              </SelectTrigger>
              <SelectContent>
                {stockList.map((item: any) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.part_name} ({item.part_code}) - {item.quantity_on_hand} u.
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Destino</Label>
            <Select
              value={formData.toBinId}
              onValueChange={(value) => setFormData({ ...formData, toBinId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un bin de destino" />
              </SelectTrigger>
              <SelectContent>
                {bins.map((bin: any) => (
                  <SelectItem key={bin.id} value={bin.id}>
                    {bin.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Cantidad</Label>
            <Input
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              required
            />
          </div>
          <div>
            <Label>Motivo</Label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full rounded border border-input bg-background p-2 text-foreground"
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={submitting || !formData.stockId || !formData.toBinId || !formData.quantity}
          >
            {submitting ? 'Transfiriendo...' : 'Confirmar transferencia'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
