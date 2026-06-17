'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, FileCheck, Package, RefreshCw, TrendingDown, Zap, AlertTriangle } from 'lucide-react';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

const iconByType = {
  riesgo: <AlertTriangle className="h-5 w-5 text-[var(--brand-rojo)]" />,
  vencimiento: <FileCheck className="h-5 w-5 text-[var(--secondary)]" />,
  stock: <Package className="h-5 w-5 text-[var(--secondary)]" />,
  mantencion: <Zap className="h-5 w-5 text-[var(--brand-rojo)]" />,
  oc: <TrendingDown className="h-5 w-5 text-[var(--secondary)]" />,
  resumen: <AlertCircle className="h-5 w-5 text-[var(--secondary)]" />,
} as const;

type InsightDetails = {
  critical_equipment?: Array<{ id: string; name?: string; title?: string; description?: string; issue?: string; action?: string; status?: string; timestamp?: string }>;
  expiring_documents?: Array<{ id: string; title?: string; expiresIn?: number }>;
  critical_stock?: Array<{ id: string; item?: string; qty?: number; level?: string }>;
  pending_maintenance?: Array<{ id: string; task?: string; dueDate?: string | null }>;
  overdue_orders?: Array<{ id: string; supplier?: string; days?: number }>;
};

export default function IAOperacionalPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/dashboard/ia-operacional', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    refreshInterval: 30000,
  });

  const insights = data?.insights || {};
  const details: InsightDetails = data?.details || {};

  const stats = useMemo(
    () => ({
      critical: Number(insights.equipment_risks || 0),
      warnings: Number(insights.expiring_documents || 0),
      stock: Number(insights.critical_stock || 0),
      maintenance: Number(insights.pending_maintenance || 0),
      orders: Number(insights.overdue_orders || 0),
      efficiency: Number(insights.operational_efficiency || 0),
    }),
    [insights]
  );

  const alerts = [
    ...(details.critical_equipment || []).map((item) => ({
      title: item.name || item.title || 'Equipo critico',
      description: item.description || item.issue || 'Requiere atencion inmediata',
      action: item.action || 'Revisar detalle',
      status: item.status || 'critical',
      type: 'riesgo' as const,
    })),
    ...(details.expiring_documents || []).map((item) => ({
      title: item.title || 'Documento por vencer',
      description: `Vence en ${item.expiresIn ?? 0} dia(s).`,
      action: 'Ir a documentos',
      status: 'warning',
      type: 'vencimiento' as const,
    })),
    ...(details.critical_stock || []).map((item) => ({
      title: item.item || 'Stock critico',
      description: `Disponibles: ${item.qty ?? 0}`,
      action: 'Ir a bodega',
      status: item.level || 'warning',
      type: 'stock' as const,
    })),
    ...(details.pending_maintenance || []).map((item) => ({
      title: item.task || 'Mantencion pendiente',
      description: item.dueDate ? `Vence el ${new Date(item.dueDate).toLocaleDateString('es-CL')}` : 'Sin fecha definida',
      action: 'Ir a OT',
      status: 'warning',
      type: 'mantencion' as const,
    })),
    ...(details.overdue_orders || []).map((item) => ({
      title: item.supplier || 'Orden vencida',
      description: `${item.days ?? 0} dia(s) de atraso`,
      action: 'Ir a compras',
      status: 'warning',
      type: 'oc' as const,
    })),
  ];

  if (error) {
    return <div className="text-red-500">Error al cargar perspectivas IA</div>;
  }

  if (isLoading) {
    return <div className="text-muted-foreground">Cargando inteligencia operacional...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">IA Operacional</h1>
          <p className="mt-2 text-muted-foreground">
            Resumen inteligente de equipos, documentos, inventario y operaciones.
          </p>
        </div>
        <Button variant="outline" onClick={() => void mutate()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alertas criticas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-rojo)]">{stats.critical}</div>
            <p className="mt-1 text-xs text-muted-foreground">Requieren atencion inmediata</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vencimientos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--secondary)]">{stats.warnings}</div>
            <p className="mt-1 text-xs text-muted-foreground">Monitoreo recomendado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Eficiencia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-verde)]">{stats.efficiency}%</div>
            <p className="mt-1 text-xs text-muted-foreground">Operacion normal</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Predicciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--secondary)]">
              {stats.maintenance + stats.orders}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Acciones sugeridas</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Insights actuales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {alerts.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground">No hay insights disponibles</p>
          ) : (
            alerts.slice(0, 8).map((item, index) => (
              <Alert key={`${item.title}-${index}`} className="border-border/60">
                <div className="flex items-start gap-4">
                  <div className="mt-0.5">{iconByType[item.type]}</div>
                  <div className="flex-1 space-y-2">
                    <AlertDescription className="font-semibold text-base">{item.title}</AlertDescription>
                    <AlertDescription className="text-sm">{item.description}</AlertDescription>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{item.status}</Badge>
                      <Button variant="ghost" size="sm">
                        {item.action}
                      </Button>
                    </div>
                  </div>
                </div>
              </Alert>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
