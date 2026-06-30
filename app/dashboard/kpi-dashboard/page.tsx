'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, AlertCircle, RefreshCw, Target } from 'lucide-react';

interface KPI {
  id: string;
  name: string;
  value: number | string;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  status: 'success' | 'warning' | 'danger' | 'neutral';
  change: number;
  description: string;
}

type AlertDistributionEntry = {
  name: string;
  value: number;
  color: string;
};

type RecommendationEntry = {
  message?: string | null;
  description?: string | null;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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

export default function KPIDashboardPage() {
  const [selectedKPI, setSelectedKPI] = useState<string | null>(null);

  const { data, error, isLoading } = useSWR('/api/dashboard/kpi-dashboard', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    refreshInterval: 60000,
  });

  if (error) return <div className="text-red-500">Error al cargar datos KPI</div>;
  if (isLoading) return <div className="text-gray-500">Cargando panel KPI...</div>;

  const kpisData = data?.kpis || {};
  const trendData = data?.trendData || [];
  const alertDistribution = (data?.alertsDistribution || []) as AlertDistributionEntry[];
  const recommendations = (data?.recommendations || []) as RecommendationEntry[];

  const kpis: KPI[] = [
    {
      id: '1',
      name: 'Equipos operacionales',
      value: kpisData.operating_equipment || 0,
      unit: 'equipos',
      status: (kpisData.operating_equipment || 0) > 80 ? 'success' : 'warning',
      description: 'Equipos en operacion',
      trend: 'up',
      change: 5,
    },
    {
      id: '2',
      name: 'MTBF',
      value: kpisData.mtbf_hours || 0,
      unit: 'horas',
      status: (kpisData.mtbf_hours || 0) > 500 ? 'success' : 'warning',
      description: 'Tiempo promedio entre fallas',
      trend: 'up',
      change: 3,
    },
    {
      id: '3',
      name: 'Stock critico',
      value: kpisData.critical_stock_items || 0,
      unit: 'items',
      status: (kpisData.critical_stock_items || 0) < 50 ? 'success' : 'danger',
      description: 'Items en bajo stock',
      trend: 'down',
      change: 2,
    },
    {
      id: '4',
      name: 'Documentos validos',
      value: `${kpisData.valid_documents_pct || 0}%`,
      unit: 'validez',
      status: (kpisData.valid_documents_pct || 0) > 90 ? 'success' : 'warning',
      description: 'Documentos vigentes',
      trend: 'up',
      change: 1,
    },
    {
      id: '5',
      name: 'Dias sin incidentes',
      value: kpisData.days_no_incidents || 0,
      unit: 'dias',
      status: (kpisData.days_no_incidents || 0) > 30 ? 'success' : 'warning',
      description: 'Seguridad operacional',
      trend: 'up',
      change: 0,
    },
    {
      id: '6',
      name: 'OCs a tiempo',
      value: `${kpisData.on_time_purchase_orders_pct || 0}%`,
      unit: 'puntualidad',
      status: (kpisData.on_time_purchase_orders_pct || 0) > 85 ? 'success' : 'warning',
      description: 'Ordenes de compra cumplidas',
      trend: 'up',
      change: 2,
    },
    {
      id: '7',
      name: 'Costos operacionales',
      value: `$${(kpisData.operational_costs_monthly || 0).toLocaleString()}`,
      unit: 'CLP',
      status: 'neutral',
      description: 'Gastos del mes',
      trend: 'down',
      change: 5,
    },
    {
      id: '8',
      name: 'Alertas activas',
      value: kpisData.active_alerts || 0,
      unit: 'alertas',
      status: (kpisData.active_alerts || 0) > 3 ? 'danger' : 'success',
      description: 'Sistema de alertas',
      trend: (kpisData.active_alerts || 0) > 3 ? 'down' : 'up',
      change: (kpisData.active_alerts || 0) > 3 ? 1 : 0,
    },
  ];

  const recommendations = data?.recommendations || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard de KPIs Mineros</h1>
        <p className="mt-2 text-muted-foreground">
          8 KPIs criticos de operacion minera con visualizacion en vivo y analisis de tendencias.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card
            key={kpi.id}
            className={`cursor-pointer border-2 transition-all ${getStatusBg(kpi.status)} ${selectedKPI === kpi.id ? 'ring-2 ring-accent' : ''}`}
            onClick={() => setSelectedKPI(selectedKPI === kpi.id ? null : kpi.id)}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-2xl font-bold">{kpi.value}</div>
                <p className="text-xs text-muted-foreground">{kpi.unit}</p>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <div className="text-xs text-muted-foreground">{kpi.description}</div>
                <div className={`flex items-center gap-1 ${getStatusColor(kpi.status)}`}>
                  {kpi.trend === 'up' ? <TrendingUp className="h-4 w-4" /> : kpi.trend === 'down' ? <TrendingDown className="h-4 w-4" /> : null}
                  <span className="text-xs font-semibold">{Math.abs(kpi.change)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-white/10 bg-white/5 backdrop-blur-md">
          <CardHeader>
            <CardTitle>Tendencias semanales</CardTitle>
            <CardDescription>Seguimiento de KPIs clave en las ultimas 4 semanas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="equipos" stroke="var(--brand-verde)" name="Equipos" strokeWidth={2} />
                <Line type="monotone" dataKey="mtbf" stroke="var(--brand-naranja)" name="MTBF (hrs)" strokeWidth={2} />
                <Line type="monotone" dataKey="stock" stroke="var(--brand-rojo)" name="Stock critico" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 backdrop-blur-md">
          <CardHeader>
            <CardTitle>Distribucion de alertas IA</CardTitle>
            <CardDescription>Alertas activas en el sistema</CardDescription>
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
                  {alertDistribution.map((entry, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/10 bg-white/5 backdrop-blur-md">
        <CardHeader>
          <CardTitle>Resumen de desempeno</CardTitle>
          <CardDescription>Estado general de operaciones mineras</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-[var(--brand-verde)]/50 bg-[var(--brand-verde)]/15 p-4 backdrop-blur-md">
              <div className="mt-0.5 text-[var(--brand-verde)]">OK</div>
              <div>
                <p className="text-sm font-semibold text-[var(--brand-verde)]">Seguridad (HSE)</p>
                <p className="text-xs text-gray-300">47 dias sin incidentes. Cumplimiento SERNAGEOMIN vigente.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-[var(--brand-gold)]/50 bg-[var(--brand-gold)]/15 p-4 backdrop-blur-md">
              <AlertCircle className="mt-0.5 h-5 w-5 text-[var(--brand-gold)]" />
              <div>
                <p className="text-sm font-semibold text-[var(--brand-gold)]">Operacion</p>
                <p className="text-xs text-gray-300">2 equipos en mantencion. MTBF bajo meta. 3 repuestos en stock critico.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-[var(--brand-naranja)]/50 bg-[var(--brand-naranja)]/15 p-4 backdrop-blur-md">
              <div className="mt-0.5 text-[var(--brand-naranja)]">i</div>
              <div>
                <p className="text-sm font-semibold text-[var(--brand-naranja)]">Gestion</p>
                <p className="text-xs text-gray-300">OCs al dia. Costos 3.3% sobre presupuesto. Documentos vigentes 93%.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-white/5 backdrop-blur-md">
        <CardHeader>
          <CardTitle>Recomendaciones IA</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-2">
              <span className="font-semibold text-[var(--brand-rojo)]">1.</span>
              <span className="text-gray-300">
                <strong className="text-white">Mantencion inmediata:</strong> CAT 320 con 847 hrs MTBF. Riesgo de falla en 48-72 hrs.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-[var(--brand-gold)]">2.</span>
              <span className="text-gray-300">
                <strong className="text-white">Renovar documentos:</strong> 7 certificados HSE vencen en 14 dias. Iniciar tramite hoy.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-[var(--brand-gold)]">3.</span>
              <span className="text-gray-300">
                <strong className="text-white">Reorden de stock:</strong> Filtros hidraulicos bajo nivel. Acelerar entrega con proveedor.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-[var(--secondary)]">4.</span>
              <span>
                <strong>Gestion de pagos:</strong> 3 OCs excedieron terminos. Procesar pagos para mantener relaciones.
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {recommendations?.length > 0 && (
        <Card className="border-white/10 bg-white/5 backdrop-blur-md">
          <CardHeader>
            <CardTitle>Recomendaciones adicionales</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {recommendations.slice(0, 4).map((item, index: number) => (
                <li key={index}>- {item.message || item.description || 'Sin detalle'}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
