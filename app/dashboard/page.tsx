'use client';

import {
  BarChart3,
  ShoppingCart,
  Package,
  DollarSign,
  TrendingUp,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { kpiData, chartData, recentActivity } from '@/lib/data';

export default function DashboardPage() {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Ejecutivo</h1>
        <p className="text-muted-foreground mt-2">
          Bienvenido al Sistema ERP Minero - Gestión Integral de Operaciones
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Orders */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Órdenes de Compra</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.totalOrders.value}</div>
            <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
              <TrendingUp className="h-3 w-3" />
              <span>+{kpiData.totalOrders.change}% {kpiData.totalOrders.period}</span>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Value */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Inventario</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(kpiData.inventoryValue.value / 1000)} K
            </div>
            <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
              <TrendingUp className="h-3 w-3" />
              <span>+{kpiData.inventoryValue.change}% {kpiData.inventoryValue.period}</span>
            </div>
          </CardContent>
        </Card>

        {/* Pending Documents */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documentos Pendientes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.pendingDocuments.value}</div>
            <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
              <span>{kpiData.pendingDocuments.change}% {kpiData.pendingDocuments.period}</span>
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gasto Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(kpiData.financialSummary.totalExpense / 1000)} K
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Pagado: {formatCurrency(kpiData.financialSummary.paid / 1000)} K
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Line Chart - Trends */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Tendencias Mensuales</CardTitle>
            <CardDescription>Órdenes, Inventario y Documentos</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" />
                <YAxis stroke="var(--color-muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="orders"
                  stroke="var(--color-chart-1)"
                  name="Órdenes"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="documents"
                  stroke="var(--color-chart-2)"
                  name="Documentos"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar Chart - Distribution */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Distribución de Actividades</CardTitle>
            <CardDescription>Comparativa mensual</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" />
                <YAxis stroke="var(--color-muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                  }}
                />
                <Legend />
                <Bar
                  dataKey="orders"
                  fill="var(--color-chart-1)"
                  name="Órdenes"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="documents"
                  fill="var(--color-chart-2)"
                  name="Documentos"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-border lg:col-span-2">
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>Últimas operaciones del sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex gap-4 pb-4 border-b border-border last:border-0 last:pb-0">
                  <div className="w-2 h-2 rounded-full bg-sidebar-primary mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* AI Assistant */}
        <Card className="border-border bg-gradient-to-br from-sidebar-primary/10 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Asistente IA
            </CardTitle>
            <CardDescription>Análisis Inteligente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-card p-4 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground mb-3">
                Insights automáticos basados en tus datos operacionales
              </p>
              <ul className="text-xs space-y-2 text-muted-foreground">
                <li>✓ Análisis de tendencias</li>
                <li>✓ Predicciones de inventario</li>
                <li>✓ Alertas de vencimiento</li>
                <li>✓ Recomendaciones</li>
              </ul>
            </div>
            <Button className="w-full" variant="outline">
              Más información
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
