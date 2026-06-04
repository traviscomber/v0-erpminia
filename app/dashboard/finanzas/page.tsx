'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Search,
  RefreshCw,
  AlertCircle,
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

const fetcher = async (url: string) => {
  const response = await fetch(url);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || 'No fue posible cargar finanzas');
  }

  return payload;
};

export default function FinanzasPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');

  const { data, error, isLoading, mutate } = useSWR(
    `/api/dashboard/finanzas?period=${selectedPeriod}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 300000,
    }
  );

  const budget = data?.budget || {};
  const expenses = data?.expenses || [];
  const budgetVsActual = data?.budgetVsActual || [];
  const forecast = data?.forecast || [];

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(value);

  if (error) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Finanzas</h1>
          <p className="mt-3 text-muted-foreground">
            Gestion de facturas, pagos y compromisos financieros operacionales.
          </p>
        </div>

        <Card className="border-destructive/30">
          <CardContent className="flex items-center justify-between gap-4 pt-6">
            <div className="flex items-center gap-3 text-sm">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span>{error.message}</span>
            </div>
            <Button variant="outline" onClick={() => mutate()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return <div className="text-muted-foreground">Cargando finanzas...</div>;
  }

  const filteredFinances = expenses.filter(
    (finance: any) =>
      (finance.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        finance.id?.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (statusFilter === 'all' || finance.status === statusFilter)
  );

  const totalAmount = filteredFinances.reduce((sum: number, f: any) => sum + (f.amount || 0), 0);
  const paidAmount = filteredFinances
    .filter((f: any) => f.status === 'Pagada')
    .reduce((sum: number, f: any) => sum + (f.amount || 0), 0);
  const pendingAmount = filteredFinances
    .filter((f: any) => f.status === 'Pendiente')
    .reduce((sum: number, f: any) => sum + (f.amount || 0), 0);
  const overdueAmount = filteredFinances
    .filter((f: any) => f.status === 'Vencida')
    .reduce((sum: number, f: any) => sum + (f.amount || 0), 0);

  const pieData = [
    { name: 'Pagada', value: paidAmount },
    { name: 'Pendiente', value: pendingAmount },
    { name: 'Vencida', value: overdueAmount },
  ];

  const colors = ['#10b981', '#f59e0b', '#ef4444'];

  const statusConfig = {
    Pagada: 'bg-[var(--brand-verde)]/10 text-[var(--brand-verde)] border-[var(--brand-verde)]/30',
    Pendiente: 'bg-[var(--secondary)]/10 text-[var(--secondary)] border-[var(--secondary)]/30',
    Vencida: 'bg-[var(--brand-rojo)]/10 text-[var(--brand-rojo)] border-[var(--brand-rojo)]/30',
  };

  return (
    <div className="space-y-8">
      <div className="pb-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Finanzas</h1>
            <p className="text-muted-foreground mt-3">
              Gestion de facturas, pagos y compromisos financieros operacionales.
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-40 bg-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Mensual</SelectItem>
                <SelectItem value="quarterly">Trimestral</SelectItem>
                <SelectItem value="annual">Anual</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => mutate()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-border overflow-hidden">
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

        <Card className="border-border bg-[var(--brand-verde)]/5 overflow-hidden">
          <CardHeader className="pb-3 relative z-10">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[var(--brand-verde)]" />
                Pagado
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold text-[var(--brand-verde)]">{formatCurrency(paidAmount)}</div>
            <div className="text-xs text-muted-foreground mt-2">
              {totalAmount > 0 ? ((paidAmount / totalAmount) * 100).toFixed(0) : 0}% del total
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-[var(--secondary)]/5 overflow-hidden">
          <CardHeader className="pb-3 relative z-10">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pendiente</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold text-[var(--secondary)]">{formatCurrency(pendingAmount)}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {filteredFinances.filter((f: any) => f.status === 'Pendiente').length} en tramite
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-[var(--brand-rojo)]/5 overflow-hidden">
          <CardHeader className="pb-3 relative z-10">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-[var(--brand-rojo)]" />
                Vencida
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold text-[var(--brand-rojo)]">{formatCurrency(overdueAmount)}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {filteredFinances.filter((f: any) => f.status === 'Vencida').length} por pagar
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Presupuesto Consolidado</CardTitle>
            <CardDescription>Centros de costo cargados en la organizacion</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="text-sm text-muted-foreground">Presupuesto anual</p>
                <p className="text-xl font-bold">{formatCurrency(Number(budget.annual || 0))}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Ejecutado</p>
                <p className="text-xl font-bold">{formatCurrency(Number(budget.used || 0))}</p>
              </div>
            </div>
            <div className="space-y-2">
              {budgetVsActual.slice(0, 4).map((item: any) => (
                <div key={item.name} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
                  <span>{item.name}</span>
                  <span className="text-muted-foreground">
                    {formatCurrency(Number(item.actual || 0))} / {formatCurrency(Number(item.budget || 0))}
                  </span>
                </div>
              ))}
              {budgetVsActual.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Aun no hay centros de costo con presupuesto cargado.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>Proyeccion de Flujo</CardTitle>
            <CardDescription>Compromisos agrupados por periodo de vencimiento</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {forecast.slice(0, 6).map((item: any) => (
              <div key={item.period} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
                <span className="uppercase">{item.period}</span>
                <span className="text-muted-foreground">
                  Pendiente {formatCurrency(Number(item.pending || 0))}
                </span>
              </div>
            ))}
            {forecast.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No hay proyecciones disponibles para el periodo seleccionado.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Distribucion de Pagos</CardTitle>
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
                    <Cell key={`cell-${index}`} fill={colors[index]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-border">
              {pieData.map((item, idx) => (
                <div key={item.name} className="text-center">
                  <div className="w-2 h-2 rounded-full mx-auto mb-2" style={{ backgroundColor: colors[idx] }} />
                  <p className="text-xs font-medium text-muted-foreground">{item.name}</p>
                  <p className="text-sm font-bold">{formatCurrency(item.value)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border lg:col-span-2">
          <CardHeader>
            <CardTitle>Analisis por Proveedor</CardTitle>
            <CardDescription>Montos adeudados por vendedor</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={filteredFinances.map((f: any) => ({
                  name: (f.vendor || 'N/A').split(' ')[0],
                  amount: f.amount || 0,
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

      <Card className="border-border">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <CardTitle>Listado de Facturas</CardTitle>
              <CardDescription>Gestion detallada de transacciones</CardDescription>
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
                {filteredFinances.map((finance: any) => (
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
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity" disabled>
                        Ver
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredFinances.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 px-4 text-center text-muted-foreground">
                      No hay facturas para los filtros actuales.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
