'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Plus, TrendingDown, TrendingUp } from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface KPIData {
  id: string;
  mes_ano: string;
  tasa_accidentabilidad: number;
  tasa_frecuencia: number;
  tasa_gravedad: number;
  dias_sin_accidentes: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function KPIPrevenccionPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    mes_ano: new Date().toISOString().split('T')[0],
    tasa_accidentabilidad: 0,
    tasa_frecuencia: 0,
    tasa_gravedad: 0,
    dias_sin_accidentes: 0,
  });

  const { data: kpiData, isLoading, mutate } = useSWR('/api/sostenibilidad/kpi', fetcher);

  const kpis = useMemo(
    () =>
      (((kpiData?.data || []) as KPIData[]).slice().sort((a, b) => {
        return new Date(a.mes_ano).getTime() - new Date(b.mes_ano).getTime();
      })),
    [kpiData]
  );

  const currentMonth = kpis[kpis.length - 1];
  const previousMonth = kpis[kpis.length - 2];

  const chartData = kpis.map((item: KPIData) => ({
    mes: new Date(item.mes_ano).toLocaleDateString('es-CL', { month: 'short', year: '2-digit' }),
    accidentabilidad: item.tasa_accidentabilidad,
    frecuencia: item.tasa_frecuencia,
    gravedad: item.tasa_gravedad,
  }));

  const calculateTrend = (current?: number, previous?: number) => {
    if (typeof current !== 'number' || typeof previous !== 'number') return null;
    if (current < previous) return 'down';
    if (current > previous) return 'up';
    return 'stable';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'mes_ano' ? value : parseFloat(value) || 0,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/sostenibilidad/kpi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Error al registrar KPI');
      }

      toast.success('KPI registrado correctamente');
      setIsOpen(false);
      setFormData({
        mes_ano: new Date().toISOString().split('T')[0],
        tasa_accidentabilidad: 0,
        tasa_frecuencia: 0,
        tasa_gravedad: 0,
        dias_sin_accidentes: 0,
      });
      await mutate();
    } catch (error) {
      console.error('[v0] Error creating KPI:', error);
      toast.error(error instanceof Error ? error.message : 'Error al registrar KPI');
    }
  };

  const getTrendIcon = (trend: string | null) => {
    if (trend === 'down') {
      return <TrendingDown className="h-4 w-4 text-secondary" />;
    }
    if (trend === 'up') {
      return <TrendingUp className="h-4 w-4 text-destructive" />;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">KPIs de prevención</h1>
          <p className="text-muted-foreground">Indicadores de salud y seguridad ocupacional (SSO).</p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Agregar mes
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Registrar KPI mensual</DialogTitle>
              <DialogDescription>
                Ingresa los indicadores de seguridad para el período seleccionado.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="mes_ano">Mes/año</Label>
                <Input id="mes_ano" type="date" name="mes_ano" value={formData.mes_ano} onChange={handleInputChange} required />
              </div>

              <div>
                <Label htmlFor="accidentabilidad">Tasa de accidentabilidad (%)</Label>
                <Input
                  id="accidentabilidad"
                  type="number"
                  name="tasa_accidentabilidad"
                  value={formData.tasa_accidentabilidad}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              <div>
                <Label htmlFor="frecuencia">Tasa de frecuencia</Label>
                <Input
                  id="frecuencia"
                  type="number"
                  name="tasa_frecuencia"
                  value={formData.tasa_frecuencia}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              <div>
                <Label htmlFor="gravedad">Tasa de gravedad</Label>
                <Input
                  id="gravedad"
                  type="number"
                  name="tasa_gravedad"
                  value={formData.tasa_gravedad}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              <div>
                <Label htmlFor="dias">Días sin accidentes</Label>
                <Input
                  id="dias"
                  type="number"
                  name="dias_sin_accidentes"
                  value={formData.dias_sin_accidentes}
                  onChange={handleInputChange}
                  min="0"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Registrar KPI
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {currentMonth && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tasa de accidentabilidad</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentMonth?.tasa_accidentabilidad?.toFixed(2) || 'N/A'}%</div>
              <div className="mt-2 flex items-center gap-1">
                {getTrendIcon(calculateTrend(currentMonth.tasa_accidentabilidad, previousMonth?.tasa_accidentabilidad))}
                {calculateTrend(currentMonth.tasa_accidentabilidad, previousMonth?.tasa_accidentabilidad) === 'down' && (
                  <p className="text-xs text-secondary">Mejorando</p>
                )}
                {calculateTrend(currentMonth.tasa_accidentabilidad, previousMonth?.tasa_accidentabilidad) === 'up' && (
                  <p className="text-xs text-destructive">Aumentando</p>
                )}
                {calculateTrend(currentMonth.tasa_accidentabilidad, previousMonth?.tasa_accidentabilidad) === 'stable' && (
                  <p className="text-xs text-muted-foreground">Sin cambios</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tasa de frecuencia</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentMonth?.tasa_frecuencia?.toFixed(2) || 'N/A'}</div>
              <p className="mt-2 text-xs text-muted-foreground">Accidentes por millón de horas trabajadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tasa de gravedad</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentMonth?.tasa_gravedad?.toFixed(2) || 'N/A'}</div>
              <p className="mt-2 text-xs text-muted-foreground">Días perdidos por accidente</p>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-secondary/20 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Días sin accidentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary">{currentMonth.dias_sin_accidentes || 0}</div>
              <p className="mt-2 text-xs text-muted-foreground">Jornadas sin incidentes</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Tendencia de indicadores (12 meses)</CardTitle>
          <CardDescription>Evolución de tasas de accidentabilidad, frecuencia y gravedad.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Cargando gráfico...</p>
          ) : chartData.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">No hay datos de KPI disponibles.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <RechartsLineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="accidentabilidad"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2}
                  name="Accidentabilidad %"
                />
                <Line type="monotone" dataKey="frecuencia" stroke="hsl(var(--primary))" strokeWidth={2} name="Frecuencia" />
                <Line type="monotone" dataKey="gravedad" stroke="hsl(var(--secondary))" strokeWidth={2} name="Gravedad" />
              </RechartsLineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de KPIs</CardTitle>
          <CardDescription>Registro mensual de indicadores de prevención.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : kpis.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No hay datos registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left font-medium">Período</th>
                    <th className="px-4 py-3 text-center font-medium">Accidentabilidad %</th>
                    <th className="px-4 py-3 text-center font-medium">Tasa de frecuencia</th>
                    <th className="px-4 py-3 text-center font-medium">Tasa de gravedad</th>
                    <th className="px-4 py-3 text-center font-medium">Días sin accidentes</th>
                    <th className="px-4 py-3 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {kpis.map((kpi: KPIData) => (
                    <tr key={kpi.id} className="border-b border-border transition hover:bg-muted">
                      <td className="px-4 py-3 font-medium">
                        {new Date(kpi.mes_ano).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-center">{kpi?.tasa_accidentabilidad?.toFixed(2)}%</td>
                      <td className="px-4 py-3 text-center">{kpi?.tasa_frecuencia?.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">{kpi?.tasa_gravedad?.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="outline">{kpi.dias_sin_accidentes}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
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
