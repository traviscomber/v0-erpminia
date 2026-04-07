'use client';

import { useState } from 'react';
import { Plus, Search, Filter, Eye, Edit2, Trash2, TrendingUp, AlertCircle } from 'lucide-react';
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
import { mockFinances } from '@/lib/data';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const statusConfig: Record<string, { color: string; label: string }> = {
  'Pagada': { color: 'bg-green-500/20 text-green-700', label: 'Pagada' },
  'Pendiente': { color: 'bg-yellow-500/20 text-yellow-700', label: 'Pendiente' },
  'Vencida': { color: 'bg-red-500/20 text-red-700', label: 'Vencida' },
};

export default function FinanzasPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<typeof mockFinances[0] | null>(null);

  const filteredFinances = mockFinances.filter(
    (finance) =>
      finance.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      finance.vendor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const totalAmount = filteredFinances.reduce((sum, f) => sum + f.amount, 0);
  const paidAmount = filteredFinances
    .filter((f) => f.status === 'Pagada')
    .reduce((sum, f) => sum + f.amount, 0);
  const pendingAmount = filteredFinances
    .filter((f) => f.status === 'Pendiente' || f.status === 'Vencida')
    .reduce((sum, f) => sum + f.amount, 0);

  const chartData = [
    { name: 'Pagado', value: paidAmount, fill: '#10b981' },
    { name: 'Pendiente', value: pendingAmount, fill: '#f59e0b' },
  ];

  const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Finanzas</h1>
        <p className="text-muted-foreground mt-2">
          Gestión de Facturas, Pagos y Reportes Financieros
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Adeudado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredFinances.length} facturas
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-green-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              Pagado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(paidAmount)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {((paidAmount / totalAmount) * 100).toFixed(0)}% del total
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-yellow-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pendiente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(pendingAmount)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredFinances.filter((f) => f.status === 'Pendiente').length} en trámite
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-red-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              Vencidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {filteredFinances.filter((f) => f.status === 'Vencida').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Requieren atención
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart and Control */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pie Chart */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Distribución de Pagos</CardTitle>
            <CardDescription>Estado de facturas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Control Section */}
        <Card className="border-border lg:col-span-2">
          <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle>Facturas</CardTitle>
              <Button className="w-full md:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Nueva Factura
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Filter */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar factura o proveedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-input"
                />
              </div>
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                Filtros
              </Button>
            </div>

            {/* Table */}
            <div className="border border-border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0">
                  <TableRow className="border-border">
                    <TableHead className="font-semibold">Factura</TableHead>
                    <TableHead className="font-semibold">Proveedor</TableHead>
                    <TableHead className="font-semibold text-right">Monto</TableHead>
                    <TableHead className="font-semibold">Estado</TableHead>
                    <TableHead className="font-semibold">Vencimiento</TableHead>
                    <TableHead className="text-right font-semibold">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFinances.map((finance) => (
                    <TableRow key={finance.id} className="border-border hover:bg-muted/50">
                      <TableCell className="font-medium">{finance.id}</TableCell>
                      <TableCell>{finance.vendor}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(finance.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig[finance.status]?.color || ''}>
                          {finance.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{finance.dueDate}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedInvoice(finance)}
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
      </div>

      {/* Detail Modal */}
      {selectedInvoice && (
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Detalles de Factura: {selectedInvoice.id}</CardTitle>
              <CardDescription>Información de pago</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedInvoice(null)}
            >
              Cerrar
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Proveedor</p>
                <p className="font-semibold">{selectedInvoice.vendor}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
                <p className="font-semibold">{selectedInvoice.type}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monto</p>
                <p className="font-semibold">{formatCurrency(selectedInvoice.amount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <Badge className={statusConfig[selectedInvoice.status]?.color || ''}>
                  {selectedInvoice.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha de Vencimiento</p>
                <p className="font-semibold">{selectedInvoice.dueDate}</p>
              </div>
              {selectedInvoice.paidDate && (
                <div>
                  <p className="text-sm text-muted-foreground">Fecha de Pago</p>
                  <p className="font-semibold">{selectedInvoice.paidDate}</p>
                </div>
              )}
            </div>

            <div className="border-t border-border pt-4 flex gap-2">
              <Button className="flex-1">
                Procesar Pago
              </Button>
              <Button variant="outline" className="flex-1">
                Descargar Factura
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
