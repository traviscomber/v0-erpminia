'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, AlertCircle, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const fetcher = async (url: string) => {
  const response = await fetch(url);
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar KPIs');
  return payload;
};

export default function KPIDashboardPage() {
  const [selectedKPI, setSelectedKPI] = useState<string | null>(null);

  const { data, error, isLoading, mutate } = useSWR('/api/dashboard/kpi-dashboard', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    refreshInterval: 60000,
  });

  const kpisData = data?.kpis || {};
  const trendData = data?.trendData || [];
  const alertDistribution = data?.alertsDistribution || [];
  const recommendations = data?.recommendations || [];

  const kpis = [
    {
      id: '1',
      name: 'Equipos Operacionales',
      value: kpisData.operating_equipment || 0,
      unit: 'equipos',
      status: (kpisData.operating_equipment || 0) > 3 ? 'success' : 'warning',
      description: 'Equipos en operacion',
      trend: 'up',
      change: 5,
    },
    {
      id: '2',
      name: 'MTBF',
      value: kpisData.mtbf_hours || 0,
      unit: 'horas',
      status: (kpisData.mtbf_hours || 0) > 300 ? 'success' : 'warning',
      description: 'Tiempo estimado entre fallos',
      trend: 'up',
      change: 3,
    },
    {
      id: '3',
      name: 'Stock Critico',
      value: kpisData.critical_stock_items || 0,
      unit: 'items',
      status: (kpisData.critical_stock_items || 0) === 0 ? 'success' : 'danger',
      description: 'Items bajo minimo',
      trend: 'down',
      change: 2,
    },
    {
      id: '4',
      name: 'Documentos Validos',
      value: `${kpisData.valid_documents_pct || 0}%`,
      unit: 'vigencia',
      status: (kpisData.valid_documents_pct || 0) > 90 ? 'success' : 'warning',
      description: 'Documentos al dia',
      trend: 'up',
      change: 1,
    },
    {
      id: '5',
      name: 'Dias sin Incidentes',
      value: kpisData.days_no_incidents || 0,
      unit: 'dias',
      status: (kpisData.days_no_incidents || 0) > 15 ? 'success' : 'warning',
      description: 'Continuidad HSE',
      trend: 'up',
      change: 0,
    },
    {
      id: '6',
      name: 'Compras a Tiempo',
      value: `${kpisData.on_time_purchase_orders_pct || 0}%`,
      unit: 'cumplimiento',
      status: (kpisData.on_time_purchase_orders_pct || 0) > 85 ? 'success' : 'warning',
      description: 'Compromisos al dia',
      trend: 'up',
      change: 2,
    },
    {
      id: '7',
      name: 'Costo Mensual',
      value: new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(kpisData.operational_costs_monthly || 0),
      unit: 'CLP',
      status: 'neutral',
      description: 'Compromisos del mes',
      trend: 'down',
      change: 5,
    },
    {
      id: '8',
      name: 'Alertas Activas',
      value: kpisData.active_alerts || 0,
      unit: 'alertas',
      status: (kpisData.active_alerts || 0) > 3 ? 'danger' : 'success',
      description: 'Eventos en seguimiento',
      trend: (kpisData.active_alerts || 0) > 3 ? 'down' : 'up',
      change: (kpisData.active_alerts || 0) > 3 ? 1 : 0,
    },
  ];

  const getStatusBg = (status: string) => {
    const colors: Record<string, string> = {
      success: 'bg-[var(--brand-verde)]/10 border-[var(--brand-verde)]/20',
      warning: 'bg-[var(--brand-gold)]/10 border-[var(--brand-gold)]/20',
      danger: 'bg-[var(--brand-rojo)]/10 border-[var(--brand-rojo)]/20',
      neutral: 'bg-muted/40 border-border',
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

  if (error) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de KPIs Mineros</h1>
          <p className="mt-2 text-muted-foreground">Monitoreo consolidado de operacion, costos y alertas.</p>
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
    return <div className="text-muted-foreground">Cargando KPIs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de KPIs Mineros</h1>
          <p className="mt-2 text-muted-foreground">Monitoreo consolidado de operacion, costos y alertas.</p>
        </div>
        <Button variant="outline" onClick={() => mutate()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi: any) => (
          <Card
            key={kpi.id}
            className={`cursor-pointer transition-all border ${getStatusBg(kpi.status)} ${selectedKPI === kpi.id ? 'ring-2 ring-accent' : ''}`}
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
                  {kpi.trend === 'up' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  <span className="text-xs font-semibold">{Math.abs(kpi.change)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Tendencias Semanales</CardTitle>
            <CardDescription>Equipos, MTBF y presion de stock</CardDescription>
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
                <Line type="monotone" dataKey="mtbf" stroke="var(--brand-naranja)" name="MTBF" strokeWidth={2} />
                <Line type="monotone" dataKey="stock" stroke="var(--brand-rojo)" name="Stock Critico" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>Distribucion de Alertas</CardTitle>
            <CardDescription>Origen de la presion operacional actual</CardDescription>
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
                  dataKey="value"
                >
                  {alertDistribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>Recomendaciones Prioritarias</CardTitle>
          <CardDescription>Acciones sugeridas segun el estado actual del sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {recommendations.length > 0 ? (
            recommendations.map((item: any, index: number) => (
              <div key={item.id || index} className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
                <Badge variant="outline">{index + 1}</Badge>
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No hay recomendaciones pendientes.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
