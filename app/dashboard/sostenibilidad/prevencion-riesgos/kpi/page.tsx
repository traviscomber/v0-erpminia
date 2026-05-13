'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Plus, Download, LineChart } from 'lucide-react';
import useSWR from 'swr';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface KPIData {
  id: string;
  mes_ano: string;
  tasa_accidentabilidad: number;
  tasa_frecuencia: number;
  tasa_gravedad: number;
  dias_sin_accidentes: number;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function KPIPrevenccionPage() {
  const { data: kpiData = [], isLoading } = useSWR('/api/sostenibilidad/kpi', fetcher);

  const kpis = (kpiData.data || []).sort((a: KPIData, b: KPIData) => 
    new Date(a.mes_ano).getTime() - new Date(b.mes_ano).getTime()
  );

  const currentMonth = kpis[kpis.length - 1];
  const previousMonth = kpis[kpis.length - 2];

  const calculateTrend = (current?: number, previous?: number) => {
    if (!current || !previous) return null;
    return current < previous ? 'down' : current > previous ? 'up' : 'stable';
  };

  const getTrendColor = (trend?: string | null) => {
    if (trend === 'down') return 'text-green-500';
    if (trend === 'up') return 'text-red-500';
    return 'text-gray-500';
  };

  const chartData = kpis.map((item: KPIData) => ({
    mes: new Date(item.mes_ano).toLocaleDateString('es-CL', { month: 'short', year: '2-digit' }),
    accidentabilidad: item.tasa_accidentabilidad,
    frecuencia: item.tasa_frecuencia,
    gravedad: item.tasa_gravedad,
  }));

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">KPIs de Prevención</h1>
          <p className="text-muted-foreground">Indicadores de salud y seguridad ocupacional (SSO)</p>
        </div>
        <Button className="bg-[var(--brand-naranja)] text-white hover:bg-[var(--brand-naranja)]/90">
          <Plus className="w-4 h-4 mr-2" />
          Agregar Mes
        </Button>
      </div>

      {/* Current Month KPIs */}
      {currentMonth && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Tasa Accidentabilidad */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tasa Accidentabilidad</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentMonth.tasa_accidentabilidad?.toFixed(2) || 'N/A'}%</div>
              <div className="flex items-center gap-1 mt-2">
                {calculateTrend(currentMonth.tasa_accidentabilidad, previousMonth?.tasa_accidentabilidad) === 'down' && (
                  <>
                    <TrendingDown className={getTrendColor('down')} />
                    <p className="text-xs text-green-500">Mejorando</p>
                  </>
                )}
                {calculateTrend(currentMonth.tasa_accidentabilidad, previousMonth?.tasa_accidentabilidad) === 'up' && (
                  <>
                    <TrendingUp className={getTrendColor('up')} />
                    <p className="text-xs text-red-500">Aumentando</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tasa Frecuencia */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tasa Frecuencia</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentMonth.tasa_frecuencia?.toFixed(2) || 'N/A'}</div>
              <p className="text-xs text-muted-foreground mt-2">Accidentes por millón horas trabajadas</p>
            </CardContent>
          </Card>

          {/* Tasa Gravedad */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tasa Gravedad</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentMonth.tasa_gravedad?.toFixed(2) || 'N/A'}</div>
              <p className="text-xs text-muted-foreground mt-2">Días perdidos por accidente</p>
            </CardContent>
          </Card>

          {/* Días sin Accidentes */}
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Días sin Accidentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{currentMonth.dias_sin_accidentes || 0}</div>
              <p className="text-xs text-muted-foreground mt-2">Jornadas sin incidentes</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Trends Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Tendencia de Indicadores (12 meses)</CardTitle>
          <CardDescription>Evolución de tasas de accidentabilidad, frecuencia y gravedad</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Cargando gráfico...</p>
          ) : chartData.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">No hay datos de KPI disponibles</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <RechartsLineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="white/10" />
                <XAxis dataKey="mes" stroke="white/50" />
                <YAxis stroke="white/50" />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
                <Legend />
                <Line type="monotone" dataKey="accidentabilidad" stroke="#ef4444" strokeWidth={2} name="Accidentabilidad %" />
                <Line type="monotone" dataKey="frecuencia" stroke="#f59e0b" strokeWidth={2} name="Frecuencia" />
                <Line type="monotone" dataKey="gravedad" stroke="#3b82f6" strokeWidth={2} name="Gravedad" />
              </RechartsLineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Historical Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de KPIs</CardTitle>
          <CardDescription>Registro mensual de indicadores de prevención</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : kpis.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No hay datos registrados</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 font-medium">Período</th>
                    <th className="text-center py-3 px-4 font-medium">Accidentabilidad %</th>
                    <th className="text-center py-3 px-4 font-medium">Tasa Frecuencia</th>
                    <th className="text-center py-3 px-4 font-medium">Tasa Gravedad</th>
                    <th className="text-center py-3 px-4 font-medium">Días sin Accidentes</th>
                    <th className="text-right py-3 px-4 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {kpis.map((kpi: KPIData) => (
                    <tr key={kpi.id} className="border-b border-white/10 hover:bg-white/5 transition">
                      <td className="py-3 px-4 font-medium">
                        {new Date(kpi.mes_ano).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
                      </td>
                      <td className="py-3 px-4 text-center">{kpi.tasa_accidentabilidad?.toFixed(2)}%</td>
                      <td className="py-3 px-4 text-center">{kpi.tasa_frecuencia?.toFixed(2)}</td>
                      <td className="py-3 px-4 text-center">{kpi.tasa_gravedad?.toFixed(2)}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="outline">{kpi.dias_sin_accidentes}</Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
