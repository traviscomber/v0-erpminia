'use client';

import { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Search,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { mockFinances } from '@/lib/data';

export default function FinanzasPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const filteredFinances = mockFinances.filter(
    (finance) =>
      (finance.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        finance.id.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (statusFilter === 'all' || finance.status === statusFilter)
  );

  const totalAmount = filteredFinances.reduce((sum, f) => sum + f.amount, 0);
  const paidAmount = filteredFinances
    .filter((f) => f.status === 'Pagada')
    .reduce((sum, f) => sum + f.amount, 0);
  const pendingAmount = filteredFinances
    .filter((f) => f.status === 'Pendiente')
    .reduce((sum, f) => sum + f.amount, 0);
  const overdueAmount = filteredFinances
    .filter((f) => f.status === 'Vencida')
    .reduce((sum, f) => sum + f.amount, 0);

  const pieData = [
    { name: 'Pagada', value: paidAmount },
    { name: 'Pendiente', value: pendingAmount },
    { name: 'Vencida', value: overdueAmount },
  ];

  const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

  const statusConfig = {
    Pagada: 'bg-green-100 text-green-800 border-green-200',
    Pendiente: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    Vencida: 'bg-red-100 text-red-800 border-red-200',
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Finanzas</h1>
            <p className="text-muted-foreground mt-3">
              Gestión de Facturas, Pagos y Reportes Financieros
            </p>
          </div>
          <Button>Crear Factura</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-border overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-chart-1/10 to-transparent rounded-full -mr-12 -mt-12" />
          <CardHeader className="pb-3 relative z-10">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Adeudado
              </CardTitle>
              <div className="p-2 bg-chart-1/10 rounded-lg">
                <DollarSign className="h-4 w-4 text-chart-1" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {filteredFinances.length} facturas
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-green-500/5 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-green-500/10 to-transparent rounded-full -mr-12 -mt-12" />
          <CardHeader className="pb-3 relative z-10">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                Pagado
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold text-green-600">{formatCurrency(paidAmount)}</div>
            <div className="text-xs text-muted-foreground mt-2">
              {totalAmount > 0 ? ((paidAmount / totalAmount) * 100).toFixed(0) : 0}% del total
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-yellow-500/5 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-yellow-500/10 to-transparent rounded-full -mr-12 -mt-12" />
          <CardHeader className="pb-3 relative z-10">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pendiente</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(pendingAmount)}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {filteredFinances.filter((f) => f.status === 'Pendiente').length} en trámite
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-red-500/5 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-red-500/10 to-transparent rounded-full -mr-12 -mt-12" />
          <CardHeader className="pb-3 relative z-10">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-600" />
                Vencida
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold text-red-600">{formatCurrency(overdueAmount)}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {filteredFinances.filter((f) => f.status === 'Vencida').length} por pagar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie Chart */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Distribución de Pagos</CardTitle>
            <CardDescription>Estado actual de facturas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-border">
              {pieData.map((item, idx) => (
                <div key={item.name} className="text-center">
                  <div
                    className="w-2 h-2 rounded-full mx-auto mb-2"
                    style={{ backgroundColor: COLORS[idx] }}
                  />
                  <p className="text-xs font-medium text-muted-foreground">{item.name}</p>
                  <p className="text-sm font-bold">{formatCurrency(item.value)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bar Chart */}
        <Card className="border-border lg:col-span-2">
          <CardHeader>
            <CardTitle>Análisis por Proveedor</CardTitle>
            <CardDescription>Montos adeudados por vendedor</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={mockFinances.map((f) => ({
                  name: f.vendor.split(' ')[0],
                  amount: f.amount,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" />
                <YAxis stroke="var(--color-muted-foreground)" />
                <Tooltip
                  formatter={(value) => formatCurrency(value as number)}
                  contentStyle={{
                    backgroundColor: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                  }}
                />
                <Bar dataKey="amount" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Table Section */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <CardTitle>Listado de Facturas</CardTitle>
              <CardDescription>Gestión detallada de transacciones</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1 md:flex-initial md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar factura..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-input"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 bg-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Estados</SelectItem>
                  <SelectItem value="Pagada">Pagada</SelectItem>
                  <SelectItem value="Pendiente">Pendiente</SelectItem>
                  <SelectItem value="Vencida">Vencida</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left font-semibold text-muted-foreground py-3 px-4">Factura</th>
                  <th className="text-left font-semibold text-muted-foreground py-3 px-4">Proveedor</th>
                  <th className="text-left font-semibold text-muted-foreground py-3 px-4">Monto</th>
                  <th className="text-left font-semibold text-muted-foreground py-3 px-4">Estado</th>
                  <th className="text-left font-semibold text-muted-foreground py-3 px-4">Vencimiento</th>
                  <th className="text-left font-semibold text-muted-foreground py-3 px-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredFinances.map((finance) => (
                  <tr
                    key={finance.id}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors group"
                  >
                    <td className="py-3 px-4 font-medium text-sm">{finance.id}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{finance.vendor}</td>
                    <td className="py-3 px-4 font-bold">{formatCurrency(finance.amount)}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border ${
                          statusConfig[finance.status as keyof typeof statusConfig]
                        }`}
                      >
                        {finance.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(finance.dueDate).toLocaleDateString('es-CL')}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        Ver
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
