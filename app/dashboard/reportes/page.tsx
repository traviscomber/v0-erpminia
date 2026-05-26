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
import { Input } from '@/components/ui/input';
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
  TrendingUp,
  Download,
  RefreshCw,
  Settings,
} from 'lucide-react';
import { CHART_COLORS_LIGHT } from '@/lib/theme-colors';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const REPORT_TYPES = [
  { id: 'maintenance', name: 'Reporte Mantención', icon: Wrench },
  { id: 'production', name: 'Reporte Producción', icon: TrendingUp },
  { id: 'equipment', name: 'Reporte Equipos', icon: Package },
  { id: 'financial', name: 'Reporte Financiero', icon: FileText },
  { id: 'hse', name: 'Reporte HSE', icon: AlertCircle },
  { id: 'combined', name: 'Reporte Integrado', icon: FileText },
];

export default function ReportesPage() {
  // Call all hooks at the top level
  const [reportType, setReportType] = useState('maintenance');
  const [dateRange, setDateRange] = useState('month');
  const [filters, setFilters] = useState<Record<string, string>>({});

  // Fetch report data from API
  const { data, error, isLoading, mutate } = useSWR(
    `/api/dashboard/reportes?type=${reportType}&range=${dateRange}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 600000, // 10 minutes
    }
  );

  // Define module health data with default values
  const modulesHealth = [
    { name: 'Documentos', value: 91, color: 'var(--color-chart-1)' },
    { name: 'Mantenimiento', value: 85, color: 'var(--color-chart-2)' },
    { name: 'Bodega', value: 88, color: 'var(--color-chart-3)' },
  ];

  // Early returns AFTER all hooks
  if (error) return <div className="text-red-500">Error loading report data</div>;
  if (isLoading) return <div className="text-gray-500">Generating report...</div>;

  // Safe data extraction with defaults
  const chartData = data?.chartData || [];
  const summary = data?.summary || {};
  const details = data?.details || [];

  // Extract nested data safely
  const documentsData = data?.documents || { compliant: 120, expiring: 8 };
  const maintenanceData = data?.maintenance || { preventive: 45, corrective: 12 };
  const inventoryData = data?.inventory || { items: 2450, lowStock: 23 };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Dashboard Ejecutivo</h1>
            <p className="text-muted-foreground mt-3">
              Visión consolidada de los 3 módulos operacionales clave
            </p>
          </div>
          <Button className="gap-2" onClick={() => alert('Exportar reporte próximamente')}>
            <Download className="h-4 w-4" />
            Exportar Reporte
          </Button>
        </div>
      </div>

      {/* Module Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Documentos */}
        <Card className="border-border overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-chart-1/10 to-transparent rounded-full -mr-12 -mt-12" />
          <CardHeader className="pb-3 relative z-10">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Sistema de Documentos
              </CardTitle>
              <div className="p-2 bg-chart-1/10 rounded-lg">
                <FileText className="h-4 w-4 text-chart-1" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10 space-y-3">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-muted-foreground">Salud del Sistema</span>
                <span className="text-lg font-bold text-chart-1">91%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-chart-1 h-2 rounded-full" style={{ width: '91%' }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
              <div>
                <p className="text-xs text-muted-foreground">Vigentes</p>
                <p className="text-lg font-bold">{documentsData.compliant}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Por Vencer</p>
                <p className="text-lg font-bold text-[var(--secondary)]">{documentsData.expiring}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mantenimiento */}
        <Card className="border-border overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-green-500/10 to-transparent rounded-full -mr-12 -mt-12" />
          <CardHeader className="pb-3 relative z-10">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Sistema de Mantenimiento
              </CardTitle>
              <div className="p-2 bg-[var(--brand-verde)]/10 rounded-lg">
                <Wrench className="h-4 w-4 text-[var(--brand-verde)]" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10 space-y-3">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-muted-foreground">Salud del Sistema</span>
                <span className="text-lg font-bold text-[var(--brand-verde)]">85%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-[var(--brand-verde)] h-2 rounded-full" style={{ width: '85%' }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
              <div>
                <p className="text-xs text-muted-foreground">Preventivas</p>
                <p className="text-lg font-bold">{maintenanceData.preventive}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Correctivas</p>
                <p className="text-lg font-bold text-[var(--brand-rojo)]">{maintenanceData.corrective}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inventario */}
        <Card className="border-border overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-yellow-500/10 to-transparent rounded-full -mr-12 -mt-12" />
          <CardHeader className="pb-3 relative z-10">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Sistema de Bodega
              </CardTitle>
              <div className="p-2 bg-[var(--secondary)]/10 rounded-lg">
                <Package className="h-4 w-4 text-[var(--secondary)]" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10 space-y-3">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-muted-foreground">Salud del Sistema</span>
                <span className="text-lg font-bold text-[var(--secondary)]">88%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-[var(--secondary)] h-2 rounded-full" style={{ width: '88%' }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
              <div>
                <p className="text-xs text-muted-foreground">Items</p>
                <p className="text-lg font-bold">{inventoryData.items}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Stock Bajo</p>
                <p className="text-lg font-bold text-[var(--brand-rojo)]">{inventoryData.lowStock}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alerts */}
      <Card className="border-[var(--brand-rojo)]/30 bg-[var(--brand-rojo)]/5 dark:bg-red-950">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-[var(--brand-rojo)] flex-shrink-0 mt-0.5" />
            <div>
              <CardTitle className="text-red-900 dark:text-red-100">
                Alertas Críticas del Sistema
              </CardTitle>
              <CardDescription className="text-[var(--brand-rojo)] dark:text-red-200">
                5 documentos por vencer, 2 órdenes de mantenimiento vencidas, 3 items con stock crítico
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Module Activity */}
        <Card className="border-border lg:col-span-2">
          <CardHeader>
            <CardTitle>Actividad por Módulo</CardTitle>
            <CardDescription>Estado actual de operaciones</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" />
                <YAxis stroke="var(--color-muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                  }}
                />
                <Legend />
                <Bar dataKey="vigentes" fill="var(--color-chart-1)" name="Vigentes" radius={[4, 4, 0, 0]} />
                <Bar dataKey="preventivas" fill="var(--color-chart-2)" name="Preventivas" radius={[4, 4, 0, 0]} />
                <Bar dataKey="items" fill="var(--color-chart-3)" name="Items" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Health Score */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Puntuación de Salud</CardTitle>
            <CardDescription>Por módulo operacional</CardDescription>
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
                  {modulesHealth.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-6 pt-4 border-t border-border">
              {modulesHealth.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-bold">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Trends */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Tendencias de Rendimiento (Últimos 6 Meses)</CardTitle>
          <CardDescription>Evolución de KPIs consolidados</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={[
              { mes: 'Oct', documentos: 85, mantenimiento: 78, inventario: 82 },
              { mes: 'Nov', documentos: 87, mantenimiento: 80, inventario: 84 },
              { mes: 'Dic', documentos: 89, mantenimiento: 82, inventario: 86 },
              { mes: 'Ene', documentos: 88, mantenimiento: 81, inventario: 87 },
              { mes: 'Feb', documentos: 90, mantenimiento: 83, inventario: 88 },
              { mes: 'Mar', documentos: 91, mantenimiento: 85, inventario: 88 },
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="mes" stroke="var(--color-muted-foreground)" />
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
                dataKey="documentos"
                stroke="var(--color-chart-1)"
                name="Documentos"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="mantenimiento"
                stroke="var(--color-chart-2)"
                name="Mantenimiento"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="inventario"
                stroke="var(--color-chart-3)"
                name="Inventario"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
