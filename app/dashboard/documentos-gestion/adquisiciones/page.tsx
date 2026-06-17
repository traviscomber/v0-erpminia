'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, FileText, RefreshCw, Search } from 'lucide-react';

interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_name: string;
  item_code: string;
  status: string;
  total_amount: number;
  delivery_date: string;
  quantity: number;
}

export default function AdquisicionesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOrders = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/compras/purchase-orders', { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const purchaseOrders = Array.isArray(data?.purchase_orders) ? data.purchase_orders : [];
      setOrders(purchaseOrders);
    } catch (err) {
      console.error('[v0] Error loading purchase orders:', err);
      setError('No se pudo cargar la lista de compras');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) return orders;
    return orders.filter((order) =>
      [order.po_number, order.vendor_name, order.item_code, order.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [orders, searchTerm]);

  const totals = useMemo(() => {
    const statusBuckets = orders.reduce((acc, order) => {
      const status = String(order.status || 'draft').toLowerCase();
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: orders.length,
      draft: statusBuckets.draft || 0,
      open: orders.filter((order) => !['received', 'closed'].includes(String(order.status || '').toLowerCase())).length,
      closed: orders.filter((order) => ['received', 'closed'].includes(String(order.status || '').toLowerCase())).length,
      amount: orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
    };
  }, [orders]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Adquisiciones</h1>
          <p className="text-muted-foreground">
            Gestiona ordenes de compra y trazabilidad de abastecimiento.
          </p>
        </div>
        <Button variant="outline" onClick={() => void loadOrders()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Recargar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Ordenes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Borradores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{totals.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Abiertas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-verde)]">{totals.open}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Monto Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totals.amount.toLocaleString('es-CL')}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Ordenes de Compra</CardTitle>
              <CardDescription>
                Vista operativa para revisar estados, proveedores y montos.
              </CardDescription>
            </div>
            <div className="text-sm text-muted-foreground">
              {error ? <span className="text-destructive">{error}</span> : 'Vista de solo lectura'}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-10"
                  placeholder="Buscar por numero, proveedor o item..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon" onClick={() => void loadOrders()}>
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {loading ? (
              <p className="text-sm text-muted-foreground">Cargando ordenes de compra...</p>
            ) : filteredOrders.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
                No hay ordenes de compra que coincidan con la busqueda.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent"
                  >
                    <div className="flex flex-1 items-center gap-4">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{order.po_number}</span>
                          <Badge variant="outline">OC</Badge>
                          <Badge
                            className={
                              ['received', 'closed'].includes(String(order.status || '').toLowerCase())
                                ? 'bg-[var(--brand-verde)]'
                                : 'bg-[var(--secondary)]'
                            }
                          >
                            {order.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {order.vendor_name} · {order.item_code}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Entrega: {order.delivery_date || 'Sin fecha'} · Cantidad: {order.quantity || 0}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        ${Number(order.total_amount || 0).toLocaleString('es-CL')}
                      </p>
                      <Button variant="ghost" size="sm" className="mt-1 gap-2">
                        <Download className="h-3 w-3" />
                        Descargar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
