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
  const [selectedKPI, setSelectedKPI] = useState<string | null>(null);

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

  const kpisData = data?.kpis || {};
  const trendData = data?.trendData || [];
  const alertDistribution = data?.alertsDistribution || [];
  const recommendations = data?.recommendations || [];

  // Transform KPI object into array of KPI cards
  const kpis = [
    {
      id: '1',
      name: 'Equipos Operacionales',
      value: kpisData.operating_equipment || 0,
      unit: 'equipos',
      status: (kpisData.operating_equipment || 0) > 80 ? 'success' : 'warning',
      description: 'Equipos en operación',
      trend: 'up',
      change: 5,
    },
    {
      id: '2',
      name: 'MTBF',
      value: kpisData.mtbf_hours || 0,
      unit: 'horas',
      status: (kpisData.mtbf_hours || 0) > 500 ? 'success' : 'warning',
      description: 'Tiempo promedio entre fallos',
      trend: 'up',
      change: 3,
    },
    {
      id: '3',
      name: 'Stock Crítico',
      value: kpisData.critical_stock_items || 0,
      unit: 'items',
      status: (kpisData.critical_stock_items || 0) < 50 ? 'success' : 'danger',
      description: 'Items en bajo stock',
      trend: 'down',
      change: 2,
    },
    {
      id: '4',
      name: 'Documentos Válidos',
      value: `${kpisData.valid_documents_pct || 0}%`,
      unit: 'validez',
      status: (kpisData.valid_documents_pct || 0) > 90 ? 'success' : 'warning',
      description: 'Documentos vigentes',
      trend: 'up',
      change: 1,
    },
    {
      id: '5',
      name: 'Días sin Incidentes',
      value: kpisData.days_no_incidents || 0,
      unit: 'días',
      status: (kpisData.days_no_incidents || 0) > 30 ? 'success' : 'warning',
      description: 'Seguridad operacional',
      trend: 'up',
      change: 0,
    },
    {
      id: '6',
      name: 'OCs a Tiempo',
      value: `${kpisData.on_time_purchase_orders_pct || 0}%`,
      unit: 'puntualidad',
      status: (kpisData.on_time_purchase_orders_pct || 0) > 85 ? 'success' : 'warning',
      description: 'Órdenes de compra cumplidas',
      trend: 'up',
      change: 2,
    },
    {
      id: '7',
      name: 'Costos Operacionales',
      value: `$${(kpisData.operational_costs_monthly || 0).toLocaleString()}`,
      unit: 'CLP',
      status: 'neutral',
      description: 'Gastos del mes',
      trend: 'down',
      change: 5,
    },
    {
      id: '8',
      name: 'Alertas Activas',
      value: kpisData.active_alerts || 0,
      unit: 'alertas',
      status: (kpisData.active_alerts || 0) > 3 ? 'danger' : 'success',
      description: 'Sistema de alertas',
      trend: (kpisData.active_alerts || 0) > 3 ? 'down' : 'up',
      change: (kpisData.active_alerts || 0) > 3 ? 1 : 0,
    },
  ];

  // Helper function to get status background color - now with transparency
  const getStatusBg = (status: string) => {
    const colors: Record<string, string> = {
      success: 'bg-[var(--brand-verde)]/10 backdrop-blur-md border-[var(--brand-verde)]/20',
      warning: 'bg-[var(--brand-gold)]/10 backdrop-blur-md border-[var(--brand-gold)]/20',
      danger: 'bg-[var(--brand-rojo)]/10 backdrop-blur-md border-[var(--brand-rojo)]/20',
      neutral: 'bg-white/5 backdrop-blur-md border-white/10',
    };
    return colors[status] || colors.neutral;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      success: 'text-[var(--brand-verde)]',
      warning: 'text-[var(--brand-gold)]',
      danger: 'text-[var(--brand-rojo)]',
      neutral: 'text-muted-foreground',
    };
    return colors[status] || colors.neutral;
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
        {kpis.map((kpi: KPI) => (
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
        <Card className="bg-white/5 backdrop-blur-md border-white/10">
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
                <Line type="monotone" dataKey="equipos" stroke="var(--brand-verde)" name="Equipos Op." strokeWidth={2} />
                <Line type="monotone" dataKey="mtbf" stroke="var(--brand-naranja)" name="MTBF (hrs)" strokeWidth={2} />
                <Line type="monotone" dataKey="stock" stroke="var(--brand-rojo)" name="Stock Crítico" strokeWidth={2} />
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
      <Card className="bg-white/5 backdrop-blur-md border-white/10">
        <CardHeader>
          <CardTitle>Resumen de Desempeño</CardTitle>
          <CardDescription>Estado general de operaciones mineras</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-green-50 border border-[var(--brand-verde)] rounded-lg">
              <div className="mt-0.5 text-[var(--brand-verde)]">✓</div>
              <div>
                <p className="font-semibold text-sm">Seguridad (HSE)</p>
                <p className="text-xs text-muted-foreground">47 días sin incidentes. Cumplimiento SERNAGEOMIN vigente.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-[var(--brand-gold)] rounded-lg">
              <AlertCircle className="h-5 w-5 text-[var(--brand-gold)] mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Operación</p>
                <p className="text-xs text-muted-foreground">2 equipos en mantención. MTBF bajo target. 3 repuestos en stock crítico.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-[var(--brand-naranja)] rounded-lg">
              <div className="mt-0.5 text-[var(--brand-naranja)]">ℹ</div>
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
