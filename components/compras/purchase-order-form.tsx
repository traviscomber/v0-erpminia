'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type PurchaseOrderFormState = {
  vendor_name: string;
  item_code: string;
  quantity: number;
  unit_price: number;
  delivery_date: string;
};

export function PurchaseOrderForm() {
  const [formData, setFormData] = useState<PurchaseOrderFormState>({
    vendor_name: '',
    item_code: '',
    quantity: 1,
    unit_price: 0,
    delivery_date: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/compras/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const { data } = await res.json();
        setResult(data);
        setFormData({ vendor_name: '', item_code: '', quantity: 1, unit_price: 0, delivery_date: '' });
      } else {
        setError('No se pudo crear la orden de compra');
      }
    } catch (err) {
      console.error('[v0] PO form error:', err);
      setError('No se pudo crear la orden de compra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crear orden de compra</CardTitle>
      </CardHeader>
      <CardContent>
        {result && (
          <div className="mb-4 flex gap-2 rounded border border-green-200 bg-green-50 p-3">
            <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600" />
            <div>
              <p className="text-sm font-semibold text-green-800">Orden de compra creada</p>
              <p className="text-sm text-green-700">{result.po_number} - Total: ${result.total_amount}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 flex gap-2 rounded border border-red-200 bg-red-50 p-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-semibold">Nombre del proveedor</label>
            <Input
              value={formData.vendor_name}
              onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
              placeholder="Ej: Proveedor S.A."
              required
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Codigo del producto</label>
            <Input
              value={formData.item_code}
              onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
              placeholder="Ej: PART-001"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold">Cantidad</label>
              <Input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                required
              />
            </div>

            <div>
              <label className="text-sm font-semibold">Costo unitario ($)</label>
              <Input
                type="number"
                step="0.01"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) })}
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold">Fecha de entrega</label>
            <Input
              type="date"
              value={formData.delivery_date}
              onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
              required
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creando...' : 'Crear orden de compra'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
