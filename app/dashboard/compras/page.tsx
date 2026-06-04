'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Plus, Search, Filter, Eye, Edit2, Trash2, RefreshCw, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const fetcher = async (url: string) => {
  const response = await fetch(url);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || 'No fue posible cargar compras');
  }

  return payload;
};

const statusConfig: Record<string, { color: string; label: string }> = {
  draft: { color: 'bg-muted/20 text-gray-700', label: 'Borrador' },
  pending: { color: 'bg-[var(--secondary)]/20 text-[var(--secondary)]', label: 'Pendiente' },
  approved: { color: 'bg-[var(--secondary)]/20 text-[var(--secondary)]', label: 'Aprobada' },
  received: { color: 'bg-[var(--brand-verde)]/20 text-[var(--brand-verde)]', label: 'Recibida' },
  closed: { color: 'bg-[var(--brand-verde)]/20 text-[var(--brand-verde)]', label: 'Cerrada' },
  cancelled: { color: 'bg-[var(--brand-rojo)]/20 text-[var(--brand-rojo)]', label: 'Cancelada' },
};

export default function ComprasPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const { data, error, isLoading, mutate } = useSWR('/api/dashboard/compras', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    refreshInterval: 120000,
  });

  const orders = data?.orders || [];
  const pendingOrders = data?.pendingOrders || 0;
  const supplierCount = (data?.suppliers || []).length;

  const filteredOrders = useMemo(
    () =>
      orders.filter((order: any) =>
        !searchTerm
          ? true
          : order.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.title?.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [orders, searchTerm]
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(value);

  // Early returns AFTER all hooks
  if (error) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compras</h1>
          <p className="mt-2 text-muted-foreground">
            Gestión operacional de órdenes de compra y proveedores.
          </p>
        </div>

        <Card className="border-destructive/30">
          <CardContent className="flex items-center justify-between gap-4 pt-6">
            <div className="flex items-center gap-3 text-sm">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span>Error al cargar órdenes de compra</span>
            </div>
            <Button variant="outline" onClick={() => mutate()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  if (isLoading) return <div className="text-gray-500">Cargando datos de compras...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compras</h1>
          <p className="mt-2 text-muted-foreground">
            Gestion operacional de ordenes de compra y proveedores.
          </p>
        </div>
        <Button variant="outline" onClick={() => mutate()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ordenes Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                orders.reduce((sum: number, order: any) => sum + Number(order.amount || 0), 0)
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pendientes de Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingOrders}</div>
            <p className="mt-1 text-xs text-muted-foreground">{supplierCount} proveedores activos</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>Ordenes de Compra</CardTitle>
            <Button className="w-full md:w-auto" disabled>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Orden
            </Button>
          </div>
          <CardDescription>
            Vista MVP basada en contratos y compromisos economicos reales de la organizacion.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID, proveedor o titulo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-input"
              />
            </div>
            <Button variant="outline" className="gap-2" disabled>
              <Filter className="w-4 h-4" />
              Filtros
            </Button>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="border-border">
                  <TableHead className="font-semibold">ID Orden</TableHead>
                  <TableHead className="font-semibold">Proveedor</TableHead>
                  <TableHead className="font-semibold text-right">Monto</TableHead>
                  <TableHead className="font-semibold">Estado</TableHead>
                  <TableHead className="font-semibold">Fecha</TableHead>
                  <TableHead className="text-right font-semibold">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order: any) => (
                  <TableRow key={order.id} className="border-border hover:bg-muted/50">
                    <TableCell className="font-medium">{order.id}</TableCell>
                    <TableCell>{order.vendor}</TableCell>
                    <TableCell className="text-right">{formatCurrency(order.amount)}</TableCell>
                    <TableCell>
                      <Badge className={statusConfig[order.status]?.color || ''}>
                        {order.statusLabel || order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {order.date ? new Date(order.date).toLocaleDateString('es-CL') : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" disabled>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" disabled>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No hay ordenes de compra para los filtros actuales.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedOrder && (
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Detalles de Orden: {selectedOrder.id}</CardTitle>
              <CardDescription>Informacion detallada del compromiso de compra</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(null)}>
              Cerrar
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Proveedor</p>
                <p className="font-semibold">{selectedOrder.vendor}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <Badge className={statusConfig[selectedOrder.status]?.color || ''}>
                  {selectedOrder.statusLabel || selectedOrder.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monto Total</p>
                <p className="font-semibold">{formatCurrency(selectedOrder.amount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha</p>
                <p className="font-semibold">
                  {selectedOrder.date ? new Date(selectedOrder.date).toLocaleDateString('es-CL') : '-'}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Numero de Items</p>
                <p className="font-semibold">{selectedOrder.items} articulos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
