'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingUp, TrendingDown, Plus, Download } from 'lucide-react';
import useSWR from 'swr';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

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
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    mes_ano: new Date().toISOString().split('T')[0],
    tasa_accidentabilidad: 0,
    tasa_frecuencia: 0,
    tasa_gravedad: 0,
    dias_sin_accidentes: 0,
  });

  const { data: kpiData, isLoading, mutate } = useSWR('/api/sostenibilidad/kpi', fetcher);

  const kpis = (((kpiData?.data || []) as KPIData[])).sort((a: KPIData, b: KPIData) =>
    new Date(a.mes_ano).getTime() - new Date(b.mes_ano).getTime()
  );

  const currentMonth = kpis[kpis.length - 1];
  const previousMonth = kpis[kpis.length - 2];

  const calculateTrend = (current: number, previous: number) => {
    if (!current || !previous) return null;
    return current < previous ? 'down' : current > previous ? 'up' : 'stable';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
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

      if (response.ok) {
        toast.success('KPI registrado correctamente');
        setIsOpen(false);
        setFormData({
          mes_ano: new Date().toISOString().split('T')[0],
          tasa_accidentabilidad: 0,
          tasa_frecuencia: 0,
          tasa_gravedad: 0,
          dias_sin_accidentes: 0,
        });
        mutate();
      } else {
        toast.error('Error al registrar KPI');
      }
    } catch (error) {
      console.error('[v0] Error creating KPI:', error);
      toast.error('Error al registrar KPI');
    }
  };

  // Brandbook: secondary=verde (good), destructive=rojo (bad), muted=gris (neutral)
  const getTrendColor = (trend: string | null) => {
    if (trend === 'down') return 'text-secondary';
    if (trend === 'up') return 'text-destructive';
    return 'text-muted-foreground';
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
      <div className="mb-8 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-foreground">KPIs de Prevención</h1>
          </div>
          <p className="text-muted-foreground">Indicadores de salud y seguridad ocupacional (SSO)</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Agregar Mes
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Registrar KPI Mensual</DialogTitle>
              <DialogDescription>
                Ingresa los indicadores de seguridad para el período
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="mes_ano">Mes/Año</Label>
                <Input
                  id="mes_ano"
                  type="date"
                  name="mes_ano"
                  value={formData.mes_ano}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="accidentabilidad">Tasa Accidentabilidad (%)</Label>
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
                <Label htmlFor="frecuencia">Tasa Frecuencia</Label>
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
                <Label htmlFor="gravedad">Tasa Gravedad</Label>
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
                <Label htmlFor="dias">Días sin Accidentes</Label>
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
              <div className="flex gap-2 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Registrar KPI
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
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
              <div className="text-2xl font-bold">{currentMonth.tasa_accidentabilidad.toFixed(2) || 'N/A'}%</div>
              <div className="flex items-center gap-1 mt-2">
                {calculateTrend(currentMonth.tasa_accidentabilidad, previousMonth.tasa_accidentabilidad) === 'down' && (
                  <>
                    <TrendingDown className={getTrendColor('down')} />
                    <p className="text-xs text-secondary">Mejorando</p>
                  </>
                )}
                {calculateTrend(currentMonth.tasa_accidentabilidad, previousMonth.tasa_accidentabilidad) === 'up' && (
                  <>
                    <TrendingUp className={getTrendColor('up')} />
                    <p className="text-xs text-destructive">Aumentando</p>
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
              <div className="text-2xl font-bold">{currentMonth.tasa_frecuencia.toFixed(2) || 'N/A'}</div>
              <p className="text-xs text-muted-foreground mt-2">Accidentes por millón horas trabajadas</p>
            </CardContent>
          </Card>

          {/* Tasa Gravedad */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tasa Gravedad</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentMonth.tasa_gravedad.toFixed(2) || 'N/A'}</div>
              <p className="text-xs text-muted-foreground mt-2">Días perdidos por accidente</p>
            </CardContent>
          </Card>

          {/* Días sin Accidentes */}
          <Card className="rounded-xl border border-secondary/20 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Días sin Accidentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary">{currentMonth.dias_sin_accidentes || 0}</div>
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
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                />
                <Legend />
                <Line type="monotone" dataKey="accidentabilidad" stroke="hsl(var(--destructive))" strokeWidth={2} name="Accidentabilidad %" />
                <Line type="monotone" dataKey="frecuencia" stroke="hsl(var(--primary))" strokeWidth={2} name="Frecuencia" />
                <Line type="monotone" dataKey="gravedad" stroke="hsl(var(--secondary))" strokeWidth={2} name="Gravedad" />
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
                  <tr className="border-b border-border">
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
                    <tr key={kpi.id} className="border-b border-border hover:bg-muted transition">
                      <td className="py-3 px-4 font-medium">
                        {new Date(kpi.mes_ano).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
                      </td>
                      <td className="py-3 px-4 text-center">{kpi.tasa_accidentabilidad.toFixed(2)}%</td>
                      <td className="py-3 px-4 text-center">{kpi.tasa_frecuencia.toFixed(2)}</td>
                      <td className="py-3 px-4 text-center">{kpi.tasa_gravedad.toFixed(2)}</td>
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
