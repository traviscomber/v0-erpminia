'use client';

import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, TrendingDown, AlertTriangle, Package, FileCheck, Zap, RefreshCw } from 'lucide-react';

const fetcher = async (url: string) => {
  const response = await fetch(url);
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar inteligencia operacional');
  return payload;
};

const severityConfig: Record<string, string> = {
  critical: 'bg-[var(--brand-rojo)]/10 text-[var(--brand-rojo)] border-[var(--brand-rojo)]/30',
  warning: 'bg-[var(--secondary)]/10 text-[var(--secondary)] border-[var(--secondary)]/30',
  info: 'bg-muted text-muted-foreground border-border',
};

const typeIcon: Record<string, any> = {
  riesgo: AlertTriangle,
  vencimiento: FileCheck,
  stock: Package,
  mantencion: Zap,
  oc: TrendingDown,
  resumen: AlertCircle,
};

export default function IAOperacionalPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/dashboard/ia-operacional', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    refreshInterval: 30000,
  });

  const insights = data?.insights || {};
  const details = data?.details || {};
  const recommendations = data?.recommendations || [];
  const insightItems = details.all || [];

  if (error) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold">IA Operacional Minera</h1>
          <p className="mt-2 text-muted-foreground">
            Motor de insights para mantenimiento, documentos, bodega y compromisos operacionales.
          </p>
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
    return <div className="text-muted-foreground">Analizando operacion minera...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">IA Operacional Minera</h1>
          <p className="mt-2 text-muted-foreground">
            Motor de insights para mantenimiento, documentos, bodega y compromisos operacionales.
          </p>
        </div>
        <Button variant="outline" onClick={() => mutate()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alertas Criticas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-rojo)]">{insights.equipment_risks || 0}</div>
            <p className="mt-1 text-xs text-muted-foreground">equipos o OT prioritarias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Advertencias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--secondary)]">{insights.expiring_documents || 0}</div>
            <p className="mt-1 text-xs text-muted-foreground">documentos o contratos por gestionar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Eficiencia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-verde)]">{insights.efficiency || 0}%</div>
            <p className="mt-1 text-xs text-muted-foreground">lectura sintetica del sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Predicciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--secondary)]">{insights.pending_maintenance || 0}</div>
            <p className="mt-1 text-xs text-muted-foreground">casos con seguimiento recomendado</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Insights Actuales</CardTitle>
            <CardDescription>Hallazgos accionables detectados por el sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {insightItems.length > 0 ? (
              insightItems.map((item: any) => {
                const Icon = typeIcon[item.type] || AlertCircle;
                return (
                  <div key={item.id} className="rounded-lg border border-border bg-muted/30 p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-md bg-background p-2">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold">{item.title}</p>
                          <Badge className={severityConfig[item.severity] || severityConfig.info}>
                            {item.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                        {item.action && (
                          <p className="text-xs text-primary">Ruta sugerida: {item.action}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">No hay insights activos en este momento.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recomendaciones IA</CardTitle>
            <CardDescription>Acciones sugeridas para la siguiente ventana operativa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.length > 0 ? (
              recommendations.map((item: any) => (
                <div key={item.id} className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="font-semibold">{item.title}</p>
                    <Badge className={severityConfig[item.severity] || severityConfig.info}>
                      {item.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Sin recomendaciones pendientes.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
