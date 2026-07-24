'use client';
import { Loader2, Gauge } from 'lucide-react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ReportesNeumaticosPage() {
  const { data: tireData, isLoading } = useSWR('/api/maintenance/analytics/tire-lifecycle', async (url) => {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch tire data');
    const json = await res.json();
    return json.data;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Gauge className="h-8 w-8 text-primary" />
            Análisis de Neumaticos
          </h1>
          <p className="text-muted-foreground mt-2">Ciclo de vida, reparaciones y utilización</p>
        </div>

        {/* KPI Grid */}
        {tireData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="p-4 bg-card border-border">
              <p className="text-sm text-muted-foreground">Total Neumaticos</p>
              <p className="text-3xl font-bold text-foreground mt-2">{tireData.total_tires}</p>
            </Card>
            <Card className="p-4 bg-card border-border">
              <p className="text-sm text-muted-foreground">En Bodega</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{tireData.by_status.in_stock}</p>
            </Card>
            <Card className="p-4 bg-card border-border">
              <p className="text-sm text-muted-foreground">Operativos</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{tireData.by_status.installed}</p>
            </Card>
            <Card className="p-4 bg-card border-border">
              <p className="text-sm text-muted-foreground">En Reparación</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{tireData.by_status.in_repair}</p>
            </Card>
            <Card className="p-4 bg-card border-border">
              <p className="text-sm text-muted-foreground">Esperando Taller</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{tireData.by_status.waiting_repair}</p>
            </Card>
            <Card className="p-4 bg-card border-border">
              <p className="text-sm text-muted-foreground">Utilización</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">{tireData.utilization_percentage}%</p>
            </Card>
          </div>
        )}

        {/* Repair Stats */}
        {tireData && (
          <Card className="p-6 bg-card border-border space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Estadísticas de Reparación</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Total Reparaciones (90 días)</p>
                <p className="text-3xl font-bold text-foreground mt-2">{tireData.total_repairs_90days}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Eventos Reparación (30 días)</p>
                <p className="text-3xl font-bold text-foreground mt-2">{tireData.total_repair_events_30days}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tiempo Promedio Reparación</p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {Math.round(tireData.avg_repair_time_minutes / 60)}h
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Most Repaired Tires */}
        {tireData?.most_repaired && tireData.most_repaired.length > 0 && (
          <Card className="p-6 bg-card border-border space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Neumaticos Más Reparados</h3>
            <div className="space-y-2">
              {tireData.most_repaired.map((tire: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <div>
                    <p className="font-medium text-foreground">{tire.code}</p>
                    <p className="text-xs text-muted-foreground">{tire.name}</p>
                  </div>
                  <Badge>{tire.repairs} reparaciones</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
