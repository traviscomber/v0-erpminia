'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingUp, TrendingDown, Plus, Download, Pencil, Trash2 } from 'lucide-react';
import useSWR from 'swr';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedKpi, setSelectedKpi] = useState<KPIData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
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

  const calculateTrend = (current?: number, previous?: number) => {
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

  useEffect(() => {
    if (!isOpen) return;
    if (selectedKpi) {
      setFormData({
        mes_ano: selectedKpi.mes_ano,
        tasa_accidentabilidad: selectedKpi.tasa_accidentabilidad,
        tasa_frecuencia: selectedKpi.tasa_frecuencia,
        tasa_gravedad: selectedKpi.tasa_gravedad,
        dias_sin_accidentes: selectedKpi.dias_sin_accidentes,
      });
    }
  }, [isOpen, selectedKpi]);

  const resetForm = () => {
    setSelectedKpi(null);
    setFormData({
      mes_ano: new Date().toISOString().split('T')[0],
      tasa_accidentabilidad: 0,
      tasa_frecuencia: 0,
      tasa_gravedad: 0,
      dias_sin_accidentes: 0,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/sostenibilidad/kpi', {
        method: selectedKpi ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedKpi ? { ...formData, id: selectedKpi.id } : formData),
      });

      if (response.ok) {
        toast.success(selectedKpi ? 'KPI actualizado correctamente' : 'KPI registrado correctamente');
        setIsOpen(false);
        resetForm();
        mutate();
      } else {
        toast.error(selectedKpi ? 'Error al actualizar KPI' : 'Error al registrar KPI');
      }
    } catch (error) {
      console.error('[v0] Error creating KPI:', error);
      toast.error(selectedKpi ? 'Error al actualizar KPI' : 'Error al registrar KPI');
    }
  };

  // Brandbook: secondary=verde (good), destructive=rojo (bad), muted=gris (neutral)
  const getTrendColor = (trend?: string | null) => {
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
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="mb-2 text-4xl font-bold text-foreground">KPIs de Prevención</h1>
          <p className="max-w-2xl text-muted-foreground">
            Indicadores de salud y seguridad ocupacional (SSO).
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline">Registros {kpis.length}</Badge>
            <Badge variant="outline">Último período {latestKpi?.mes_ano || 'Sin dato'}</Badge>
            <Badge className="bg-secondary/10 text-secondary border-secondary/30">
              Días sin accidentes {latestKpi?.dias_sin_accidentes ?? 0}
            </Badge>
          </div>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) resetForm();
        }}>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => {
              resetForm();
              setIsOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar Mes
          </Button>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedKpi ? 'Editar KPI Mensual' : 'Registrar KPI Mensual'}</DialogTitle>
              <DialogDescription>
                {selectedKpi ? 'Actualiza los indicadores de seguridad para el perÃ­odo' : 'Ingresa los indicadores de seguridad para el perÃ­odo'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="mes_ano">Mes/AÃ±o</Label>
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
                <Label htmlFor="dias">DÃ­as sin Accidentes</Label>
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
                  {selectedKpi ? 'Actualizar KPI' : 'Registrar KPI'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Current Month KPIs */}
      {currentMonth && (
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Resumen mensual</h2>
              <p className="text-sm text-muted-foreground">Lectura rápida del período más reciente</p>
            </div>
            <Badge variant="outline">{currentMonth.mes_ano}</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    <p className="text-xs text-secondary">Mejorando</p>
                  </>
                )}
                {calculateTrend(currentMonth.tasa_accidentabilidad, previousMonth?.tasa_accidentabilidad) === 'up' && (
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
              <div className="text-2xl font-bold">{currentMonth.tasa_frecuencia?.toFixed(2) || 'N/A'}</div>
              <p className="text-xs text-muted-foreground mt-2">Accidentes por millÃ³n horas trabajadas</p>
            </CardContent>
          </Card>

          {/* Tasa Gravedad */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tasa Gravedad</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentMonth.tasa_gravedad?.toFixed(2) || 'N/A'}</div>
              <p className="text-xs text-muted-foreground mt-2">DÃ­as perdidos por accidente</p>
            </CardContent>
          </Card>

          {/* DÃ­as sin Accidentes */}
          <Card className="rounded-xl shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">DÃ­as sin Accidentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary">{currentMonth.dias_sin_accidentes || 0}</div>
              <p className="text-xs text-muted-foreground mt-2">Jornadas sin incidentes</p>
            </CardContent>
          </Card>
          </div>
        </div>
      )}

      {/* Trends Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Tendencia de Indicadores (12 meses)</CardTitle>
          <CardDescription>EvoluciÃ³n de tasas de accidentabilidad, frecuencia y gravedad</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Cargando grÃ¡fico...</p>
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
          <CardTitle>HistÃ³rico de KPIs</CardTitle>
          <CardDescription>Registro mensual de indicadores de prevenciÃ³n</CardDescription>
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
                    <th className="text-left py-3 px-4 font-medium">PerÃ­odo</th>
                    <th className="text-center py-3 px-4 font-medium">Accidentabilidad %</th>
                    <th className="text-center py-3 px-4 font-medium">Tasa Frecuencia</th>
                    <th className="text-center py-3 px-4 font-medium">Tasa Gravedad</th>
                    <th className="text-center py-3 px-4 font-medium">DÃ­as sin Accidentes</th>
                    <th className="text-right py-3 px-4 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {kpis.map((kpi: KPIData) => (
                    <tr key={kpi.id} className="border-b border-border hover:bg-muted transition">
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
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedKpi(kpi);
                              setIsOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedKpi(kpi);
                              setDeleteOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Descargar">
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar KPI</DialogTitle>
            <DialogDescription>
              Se eliminarÃ¡ el KPI de {selectedKpi ? new Date(selectedKpi.mes_ano).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }) : 'este perÃ­odo'}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={async () => {
                if (!selectedKpi?.id) return;
                setIsDeleting(true);
                try {
                  const response = await fetch(`/api/sostenibilidad/kpi?id=${selectedKpi.id}`, { method: 'DELETE' });
                  if (!response.ok) throw new Error('Error');
                  toast.success('KPI eliminado');
                  await mutate();
                  setDeleteOpen(false);
                  setSelectedKpi(null);
                } catch {
                  toast.error('No se pudo eliminar el KPI');
                } finally {
                  setIsDeleting(false);
                }
              }}
            >
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
