'use client';

import { useState } from 'react';
import { Plus, Search, Filter, Eye, Edit2, Trash2, Download } from 'lucide-react';
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
import { BrandCard } from '@/components/ui/brand-card';
import { StatusBadge } from '@/components/status-badge';
import { AuditTrail } from '@/components/audit-trail';
import { exportToCSV } from '@/lib/export-utils';
import { mockPurchaseOrders } from '@/lib/data';

const statusConfig: Record<string, { color: string; label: string }> = {
  'Pendiente': { color: 'bg-yellow-500/20 text-yellow-700', label: 'Pendiente' },
  'Confirmada': { color: 'bg-blue-500/20 text-blue-700', label: 'Confirmada' },
  'Entregado': { color: 'bg-green-500/20 text-green-700', label: 'Entregado' },
  'Cancelada': { color: 'bg-red-500/20 text-red-700', label: 'Cancelada' },
};

export default function ComprasPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<typeof mockPurchaseOrders[0] | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const filteredOrders = mockPurchaseOrders.filter(
    (order) =>
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.vendor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Compras</h1>
        <p className="text-muted-foreground mt-2">
          Gestión de Órdenes de Compra y Proveedores
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Órdenes Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredOrders.length}</div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                filteredOrders.reduce((sum, order) => sum + order.amount, 0)
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pendientes de Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredOrders.filter((o) => o.status === 'Pendiente').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control Section */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>Órdenes de Compra</CardTitle>
            <Button className="w-full md:w-auto" onClick={() => alert('Crear nueva orden de compra próximamente')}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Orden
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID u Proveedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-input"
              />
            </div>
            <Button variant="outline" className="gap-2" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="w-4 h-4" />
              Filtros
            </Button>
          </div>

          {/* Table */}
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
                {filteredOrders.map((order) => (
                  <TableRow key={order.id} className="border-border hover:bg-muted/50">
                    <TableCell className="font-medium">{order.id}</TableCell>
                    <TableCell>{order.vendor}</TableCell>
                    <TableCell className="text-right">{formatCurrency(order.amount)}</TableCell>
                    <TableCell>
                      <Badge className={statusConfig[order.status]?.color || ''}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{order.date}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedOrder && (
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Detalles de Orden: {selectedOrder.id}</CardTitle>
              <CardDescription>Información detallada del pedido</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedOrder(null)}
            >
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
                  {selectedOrder.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monto Total</p>
                <p className="font-semibold">{formatCurrency(selectedOrder.amount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha</p>
                <p className="font-semibold">{selectedOrder.date}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Número de Items</p>
                <p className="font-semibold">{selectedOrder.items} artículos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
