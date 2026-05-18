'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TransferModalProps {
  onTransfer?: (data: any) => void;
}

export function TransferModal({ onTransfer }: TransferModalProps) {
  const [formData, setFormData] = useState({
    quantity: '',
    reason: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onTransfer?.(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transfer Stock</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Quantity</Label>
            <Input type="number" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} required />
          </div>
          <div>
            <Label>Reason</Label>
            <textarea value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} className="w-full p-2 border rounded" />
          </div>
          <Button type="submit" className="w-full">
            Confirm Transfer
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
