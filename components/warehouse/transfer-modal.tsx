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
  onTransfer?: (data: any) => void;
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
    const res = await fetch(url);
    return res.ok ? res.json() : null;
  });

  const stockList = data?.stock || [];
  const bins = data?.bins || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/warehouse/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stockId: formData.stockId,
          toBinId: formData.toBinId,
          quantity: Number(formData.quantity || 0),
          reason: formData.reason,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Transfer failed');
      }

      toast.success('Transfer completed');
      setFormData({
        stockId: '',
        toBinId: '',
        quantity: '',
        reason: '',
      });
      onTransfer?.(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Transfer failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transfer Stock</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Stock Item</Label>
            <Select
              value={formData.stockId}
              onValueChange={(value) => setFormData({ ...formData, stockId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select stock item" />
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
            <Label>Destination Bin</Label>
            <Select
              value={formData.toBinId}
              onValueChange={(value) => setFormData({ ...formData, toBinId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select destination bin" />
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
            <Label>Quantity</Label>
            <Input
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              required
            />
          </div>
          <div>
            <Label>Reason</Label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full p-2 border rounded"
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={
              submitting ||
              !formData.stockId ||
              !formData.toBinId ||
              !formData.quantity
            }
          >
            {submitting ? 'Transferring...' : 'Confirm Transfer'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
