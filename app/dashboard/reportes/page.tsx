'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  FileText,
  Wrench,
  Package,
  AlertCircle,
  Download,
  RefreshCw,
} from 'lucide-react';

const fetcher = async (url: string) => {
  const response = await fetch(url);
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar reportes');
  return payload;
};

const reportIcons: Record<string, any> = {
  Documentos: FileText,
  Mantenimiento: Wrench,
  Bodega: Package,
};

export default function ReportesPage() {
  const [reportType, setReportType] = useState('maintenance');
  const [dateRange, setDateRange] = useState('month');

  const { data, error, isLoading, mutate } = useSWR(
    `/api/dashboard/reportes?type=${reportType}&range=${dateRange}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 600000,
    }
  );

  const modulesHealth = data?.modulesHealth || [];
  const chartData = data?.chartData || [];
  const performanceTrends = data?.performanceTrends || [];
  const criticalAlerts = data?.criticalAlerts || [];
  const documentsData = data?.documents || {};
  const maintenanceData = data?.maintenance || {};
  const inventoryData = data?.inventory || {};

  if (error) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Dashboard Ejecutivo</h1>
          <p className="mt-3 text-muted-foreground">
            Vista consolidada de documentos, mantenimiento y bodega.
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
    return <div className="text-muted-foreground">Generando dashboard ejecutivo...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="pb-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Dashboard Ejecutivo</h1>
            <p className="mt-3 text-muted-foreground">
              Vista consolidada de documentos, mantenimiento y bodega.
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="w-48 bg-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="maintenance">Mantenimiento</SelectItem>
                <SelectItem value="production">Produccion</SelectItem>
                <SelectItem value="equipment">Equipos</SelectItem>
                <SelectItem value="financial">Financiero</SelectItem>
                <SelectItem value="hse">HSE</SelectItem>
                <SelectItem value="combined">Integrado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-36 bg-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Semana</SelectItem>
                <SelectItem value="month">Mes</SelectItem>
                <SelectItem value="quarter">Trimestre</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => mutate()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </Button>
            <Button className="gap-2" disabled>
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {modulesHealth.map((module: any) => {
          const Icon = reportIcons[module.name] || FileText;
          const detail =
            module.name === 'Documentos'
              ? `${documentsData.compliant || 0} vigentes / ${documentsData.expiring || 0} por vencer`
              : module.name === 'Mantenimiento'
              ? `${maintenanceData.preventive || 0} preventivas / ${maintenanceData.overdue || 0} atrasadas`
              : `${inventoryData.items || 0} items / ${inventoryData.lowStock || 0} bajo stock`;

          return (
            <Card key={module.name} className="border-border overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {module.name}
                  </CardTitle>
                  <div className="rounded-lg bg-muted/40 p-2">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Salud del modulo</span>
                    <span className="text-lg font-bold">{module.value}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${module.value}%` }} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{detail}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-[var(--brand-rojo)]/30 bg-[var(--brand-rojo)]/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-[var(--brand-rojo)]">
            <AlertCircle className="h-5 w-5" />
            Alertas criticas del sistema
          </CardTitle>
          <CardDescription>Lo que requiere atencion gerencial inmediata</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {criticalAlerts.length > 0 ? (
            criticalAlerts.map((alert: string, index: number) => (
              <div key={`${alert}-${index}`} className="rounded-lg border border-[var(--brand-rojo)]/20 bg-background/70 px-3 py-2 text-sm">
                {alert}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No hay alertas criticas en este momento.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="border-border lg:col-span-2">
          <CardHeader>
            <CardTitle>Actividad por Modulo</CardTitle>
            <CardDescription>Operativos, pendientes y criticos</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" />
                <YAxis stroke="var(--color-muted-foreground)" />
                <Tooltip />
                <Legend />
                <Bar dataKey="operativos" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pendientes" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="criticos" fill="var(--color-chart-3)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>Salud Relativa</CardTitle>
            <CardDescription>Distribucion porcentual entre modulos</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={modulesHealth}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {modulesHealth.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>Tendencias de Rendimiento</CardTitle>
          <CardDescription>Evolucion consolidada de los ultimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="mes" stroke="var(--color-muted-foreground)" />
              <YAxis stroke="var(--color-muted-foreground)" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="documentos" stroke="var(--color-chart-1)" strokeWidth={2} />
              <Line type="monotone" dataKey="mantenimiento" stroke="var(--color-chart-2)" strokeWidth={2} />
              <Line type="monotone" dataKey="inventario" stroke="var(--color-chart-3)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
