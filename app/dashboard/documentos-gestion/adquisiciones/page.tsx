'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, FileText, Search } from 'lucide-react';

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

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const response = await fetch('/api/compras/purchase-orders', { credentials: 'include' });
        const data = await response.json().catch(() => null);
        const purchaseOrders = Array.isArray(data?.purchase_orders) ? data.purchase_orders : [];
        setOrders(purchaseOrders);
      } catch (error) {
        console.error('[AdquisicionesPage] Error al cargar ordenes de compra:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
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
    return {
      total: orders.length,
      open: orders.filter((order) => String(order.status || '').toLowerCase() !== 'received').length,
      approved: orders.filter((order) => String(order.status || '').toLowerCase() === 'received').length,
      amount: orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
    };
  }, [orders]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Adquisiciones</h1>
        <p className="text-muted-foreground">Gestiona órdenes de compra y trazabilidad de abastecimiento</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total de órdenes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Órdenes abiertas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{totals.open}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recibidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-verde)]">{totals.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Monto total</CardTitle>
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
              <CardTitle>Ordenes de compra reales</CardTitle>
              <CardDescription>La creación de OC se gestiona desde el módulo Compras.</CardDescription>
            </div>
            <div className="text-sm text-muted-foreground">Vista de solo lectura</div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por número, proveedor o código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon" aria-label="Buscar">
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {loading ? (
              <p className="text-sm text-muted-foreground">Cargando órdenes de compra...</p>
            ) : filteredOrders.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
                No hay órdenes de compra que coincidan con la búsqueda.
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
                              String(order.status || '').toLowerCase() === 'received'
                                ? 'bg-[var(--brand-verde)]'
                                : 'bg-[var(--secondary)]'
                            }
                          >
                            {order.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {order.vendor_name} - {order.item_code}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Entrega: {order.delivery_date || 'Sin fecha'} - Cantidad: {order.quantity || 0}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${Number(order.total_amount || 0).toLocaleString('es-CL')}</p>
                      <Button asChild variant="ghost" size="sm" className="mt-1 gap-2">
                        <Link href="/dashboard/compras">
                          Ver en Compras
                          <ArrowRight className="h-3 w-3" />
                        </Link>
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
