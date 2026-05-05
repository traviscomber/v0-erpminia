'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, AlertCircle, RefreshCw, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface KPI {
  id: string;
  name: string;
  value: number | string;
  unit: string;
  target: number;
  trend: 'up' | 'down' | 'stable';
  status: 'green' | 'yellow' | 'red';
  change: number;
  description: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const statusColors = {
  green: 'bg-green-50 border-green-200',
  yellow: 'bg-yellow-50 border-yellow-200',
  red: 'bg-red-50 border-red-200',
};

const statusBadgeColors = {
  green: 'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  red: 'bg-red-100 text-red-800',
};

export default function KPIDashboardPage() {
  // Fetch KPI data from API
  const { data, error, isLoading, mutate } = useSWR(
    '/api/dashboard/kpi-dashboard',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 60000, // 1 minute for KPI updates
    }
  );

  if (error) return <div className="text-red-500">Error loading KPI data</div>;
  if (isLoading) return <div className="text-gray-500">Loading KPI dashboard...</div>;

  const kpis = data?.kpis || [];
  const trendData = data?.trendData || [];
  const alertsDistribution = data?.alertsDistribution || [];
  const recommendations = data?.recommendations || [];
  {
    id: 'equipos',
    name: 'Equipos Operativos',
    value: 24,
    unit: 'de 26',
    target: 26,
    trend: 'down',
    status: 'yellow',
    change: -7.7,
    description: '2 equipos en mantención programada',
  },
  {
    id: 'mtbf',
    name: 'MTBF (Mean Time Between Failures)',
    value: '847',
    unit: 'horas',
    target: 1000,
    trend: 'down',
    status: 'red',
    change: -15.3,
    description: 'Bajo rendimiento respecto a target',
  },
  {
    id: 'stock',
    name: 'Stock Crítico',
    value: '3',
    unit: 'items',
    target: 0,
    trend: 'up',
    status: 'red',
    change: 8,
    description: 'Repuestos bajo nivel mínimo',
  },
  {
    id: 'documentos',
    name: 'Documentos Vigentes',
    value: '93',
    unit: '%',
    target: 100,
    trend: 'down',
    status: 'yellow',
    change: -2.1,
    description: '7 documentos vencen en 14 días',
  },
  {
    id: 'hse',
    name: 'Días sin Incidentes',
    value: '47',
    unit: 'días',
    target: 90,
    trend: 'stable',
    status: 'green',
    change: 0,
    description: 'Excelente récord de seguridad',
  },
  {
    id: 'ocs',
    name: 'OCs al Día',
    value: '97',
    unit: '%',
    target: 100,
    trend: 'down',
    status: 'yellow',
    change: -1.2,
    description: '3 OCs vencidas en términos de pago',
  },
  {
    id: 'costos',
    name: 'Costos Operacionales',
    value: 'CLP 12.4M',
    unit: 'mes actual',
    target: 12,
    trend: 'up',
    status: 'yellow',
    change: 3.3,
    description: '3.3% sobre presupuesto mes',
  },
  {
    id: 'alertas',
    name: 'Alertas Activas IA',
    value: '5',
    unit: 'alertas',
    target: 0,
    trend: 'down',
    status: 'red',
    change: -1,
    description: '2 críticas, 3 advertencias',
  },
];

const trendData = [
  { date: 'Sem 1', equipos: 26, mtbf: 900, stock: 1, documentos: 98 },
  { date: 'Sem 2', equipos: 25, mtbf: 880, stock: 2, documentos: 96 },
  { date: 'Sem 3', equipos: 24, mtbf: 850, stock: 2, documentos: 94 },
  { date: 'Sem 4', equipos: 24, mtbf: 847, stock: 3, documentos: 93 },
];

const alertDistribution = [
  { name: 'Críticas', value: 2, color: '#ef4444' },
  { name: 'Advertencias', value: 3, color: '#eab308' },
  { name: 'Info', value: 1, color: '#3b82f6' },
];

export default function KPIDashboardPage() {
  const [selectedKPI, setSelectedKPI] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'green':
        return 'text-green-600';
      case 'yellow':
        return 'text-yellow-600';
      case 'red':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'green':
        return 'bg-green-50 border-green-200';
      case 'yellow':
        return 'bg-yellow-50 border-yellow-200';
      case 'red':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard de KPIs Mineros</h1>
        <p className="text-muted-foreground mt-2">
          8 KPIs críticos de operación minera con visualización en vivo y análisis de tendencias.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {KPIS.map((kpi) => (
          <Card
            key={kpi.id}
            className={`cursor-pointer transition-all ${getStatusBg(kpi.status)} border-2 ${
              selectedKPI === kpi.id ? 'ring-2 ring-accent' : ''
            }`}
            onClick={() => setSelectedKPI(selectedKPI === kpi.id ? null : kpi.id)}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-2xl font-bold">{kpi.value}</div>
                <p className="text-xs text-muted-foreground">{kpi.unit}</p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="text-xs text-muted-foreground">{kpi.description}</div>
                <div className={`flex items-center gap-1 ${getStatusColor(kpi.status)}`}>
                  {kpi.trend === 'up' ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : kpi.trend === 'down' ? (
                    <TrendingDown className="h-4 w-4" />
                  ) : null}
                  <span className="text-xs font-semibold">{Math.abs(kpi.change)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Tendencias Semanales</CardTitle>
            <CardDescription>Seguimiento de KPIs clave en las últimas 4 semanas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="equipos" stroke="#10b981" name="Equipos Op." />
                <Line type="monotone" dataKey="mtbf" stroke="#3b82f6" name="MTBF (hrs)" />
                <Line type="monotone" dataKey="stock" stroke="#ef4444" name="Stock Crítico" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Alert Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Alertas IA</CardTitle>
            <CardDescription>5 alertas activas en el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={alertDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {alertDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Desempeño</CardTitle>
          <CardDescription>Estado general de operaciones mineras</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="mt-0.5">✓</div>
              <div>
                <p className="font-semibold text-sm">Seguridad (HSE)</p>
                <p className="text-xs text-muted-foreground">47 días sin incidentes. Cumplimiento SERNAGEOMIN vigente.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Operación</p>
                <p className="text-xs text-muted-foreground">2 equipos en mantención. MTBF bajo target. 3 repuestos en stock crítico.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="mt-0.5">ℹ</div>
              <div>
                <p className="font-semibold text-sm">Gestión</p>
                <p className="text-xs text-muted-foreground">OCs al día. Costos 3.3% sobre presupuesto. Documentos vigentes 93%.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recomendaciones IA</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-2">
              <span className="font-semibold text-red-600">1.</span>
              <span><strong>Mantención Inmediata:</strong> CAT 320 con 847 hrs MTBF. Riesgo de falla en 48-72 hrs.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-yellow-600">2.</span>
              <span><strong>Renovar Documentos:</strong> 7 certificados HSE vencen en 14 días. Iniciar trámite hoy.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-yellow-600">3.</span>
              <span><strong>Reorden de Stock:</strong> Filtros hidráulicos bajo nivel. Acelerar entrega con proveedor.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-yellow-600">4.</span>
              <span><strong>Gestión de Pagos:</strong> 3 OCs excedieron términos. Procesar pagos para mantener relaciones.</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
