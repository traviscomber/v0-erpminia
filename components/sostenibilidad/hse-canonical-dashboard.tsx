'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { Shield, Target, AlertCircle, Zap, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) return null;
  return response.json();
};

type HSESummary = {
  totalRoles: number;
  totalCommitments: number;
  totalFacilities: number;
  activeRoles: number;
  pendingCommitments: number;
  highRiskFacilities: number;
};

export function HSECanonicalDashboard() {
  const { data } = useSWR<HSESummary>('/api/sostenibilidad/hse-canonical-data?type=summary', fetcher, {
    refreshInterval: 60000,
  });

  const metrics = useMemo(() => {
    if (!data) return null;
    return [
      {
        label: 'Roles HSE',
        value: data.totalRoles,
        active: data.activeRoles,
        icon: Shield,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
      },
      {
        label: 'Compromisos',
        value: data.totalCommitments,
        pending: data.pendingCommitments,
        icon: Target,
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
      },
      {
        label: 'Instalaciones',
        value: data.totalFacilities,
        critical: data.highRiskFacilities,
        icon: Zap,
        color: 'text-amber-500',
        bgColor: 'bg-amber-500/10',
      },
    ];
  }, [data]);

  if (!metrics) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="shadow-none">
            <CardHeader className="pb-2">
              <CardDescription>Cargando...</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold tracking-tight">Datos Canónicos HSE</h3>
        <p className="text-sm text-muted-foreground">Resumen de información importada desde XLS</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label} className="shadow-none border-border/70">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
                  </div>
                  <div className={`rounded-lg p-2 ${metric.bgColor}`}>
                    <Icon className={`h-5 w-5 ${metric.color}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <div className="text-3xl font-bold">{metric.value}</div>
                  {metric.active && (
                    <Badge variant="secondary" className="text-xs">
                      {metric.active} activos
                    </Badge>
                  )}
                  {metric.pending && (
                    <Badge variant="secondary" className="text-xs">
                      {metric.pending} pendientes
                    </Badge>
                  )}
                  {metric.critical && (
                    <Badge variant="destructive" className="text-xs">
                      {metric.critical} críticas
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="shadow-none bg-muted/30 border-muted-foreground/20">
        <CardHeader>
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <CardTitle className="text-sm">Información Canónica</CardTitle>
              <CardDescription className="mt-1">
                Los datos que ves aquí provienen de un sistema de importación automatizado desde archivos XLS con deduplicación y trazabilidad completa.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
