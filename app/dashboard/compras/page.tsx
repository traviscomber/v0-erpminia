'use client';

import { useEffect, useState } from 'react';
import { PurchaseOrderForm } from '@/components/compras/purchase-order-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp } from 'lucide-react';

interface PO {
  id: string;
  po_number: string;
  vendor_name: string;
  item_code: string;
  quantity: number;
  status: string;
  total_amount: number;
  delivery_date: string;
}

export default function ComprasPage() {
  const [orders, setOrders] = useState<PO[]>([]);
  const [stats, setStats] = useState({ pending: 0, received: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch('/api/compras/purchase-orders');
        if (res.ok) {
          const { purchase_orders } = await res.json();
          const ordersList = Array.isArray(purchase_orders) ? purchase_orders : [];
          setOrders(ordersList);
          setStats({
            pending: ordersList.filter((o: any) => o.status === 'pending').length,
            received: ordersList.filter((o: any) => o.status === 'received').length,
          });
        }
      } catch (err) {
        console.error('[v0] PO fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Compras</h1>
        <p className="text-muted-foreground">
          Gestión de órdenes de compra, proveedores y trazabilidad de abastecimiento
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Órdenes Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recibidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.received}</div>
          </CardContent>
        </Card>
      </div>

      <PurchaseOrderForm />

      <Card>
        <CardHeader>
          <CardTitle>Órdenes de Compra Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Cargando...</p>
          ) : orders.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aún no hay órdenes de compra.</p>
          ) : (
            <div className="space-y-3">
              {orders.slice(0, 5).map(po => (
                <div key={po.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="font-semibold text-sm">{po.po_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {po.vendor_name} - {po.item_code} (Cant.: {po.quantity})
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">${po?.total_amount?.toFixed(2)}</span>
                    <Badge variant={po.status === 'received' ? 'outline' : 'secondary'}>
                      {po.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
