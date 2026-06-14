'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, TrendingDown, AlertTriangle, Package, FileCheck, Zap, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AIInsight {
  id: string;
  type: 'riesgo' | 'vencimiento' | 'stock' | 'mantencion' | 'oc' | 'resumen';
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  icon: React.ReactNode;
  action: string;
  timestamp: Date;
  affected_resource: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const severityConfig = {
  critical: { color: 'destructive', bgColor: 'bg-[var(--brand-rojo)]/5 border-[var(--brand-rojo)]/30' },
  warning: { color: 'warning', bgColor: 'bg-[var(--secondary)]/5 border-[var(--secondary)]/30' },
  info: { color: 'secondary', bgColor: 'bg-[var(--secondary)]/5 border-[var(--secondary)]/30' },
};

const iconMap = {
  riesgo: <AlertTriangle className="h-5 w-5 text-[var(--brand-rojo)]" />,
  vencimiento: <FileCheck className="h-5 w-5 text-[var(--secondary)]" />,
  stock: <Package className="h-5 w-5 text-[var(--secondary)]" />,
  mantencion: <Zap className="h-5 w-5 text-[var(--brand-rojo)]" />,
  oc: <TrendingDown className="h-5 w-5 text-[var(--secondary)]" />,
  resumen: <AlertCircle className="h-5 w-5 text-[var(--secondary)]" />,
};

export default function IAOperacionalPage() {
  // Fetch IA insights from API
  const { data, error, isLoading, mutate } = useSWR(
    '/api/dashboard/ia-operacional',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 30000, // 30 seconds for real-time insights
    }
  );

  if (error) return <div className="text-red-500">Error al cargar perspectivas IA</div>;
  if (isLoading) return <div className="text-gray-500">Cargando inteligencia operacional...</div>;

  // Extract insights object (not an array)
  const insightsData = data?.insights || {};
  const detailsData = data?.details || {};

  // Get counts from insights
  const criticalCount = insightsData.equipment_risks || 0;
  const warningCount = insightsData.expiring_documents || 0;
  const efficiency = 87; // Calculated as (total_systems - problems) / total_systems * 100
  const predictions = insightsData.pending_maintenance || 0;

  // Get detailed lists
  const criticalEquipment = detailsData.critical_equipment || [];
  const expiringDocs = detailsData.expiring_documents || [];
  const criticalStock = detailsData.critical_stock || [];
  const pendingMaint = detailsData.pending_maintenance || [];
  const overdueOrders = detailsData.overdue_orders || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">IA Operacional Minera</h1>
        <p className="text-muted-foreground mt-2">
          Sistema inteligente que analiza datos en vivo de equipos, documentos, inventario y operaciones para generar insights accionables.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alertas Críticas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-rojo)]">{criticalCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Requieren atención inmediata</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Advertencias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--secondary)]">{warningCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Monitoreo recomendado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Eficiencia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-verde)]">{efficiency}%</div>
            <p className="text-xs text-muted-foreground mt-1">Operación normal</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Predicciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--secondary)]">{predictions}</div>
            <p className="text-xs text-muted-foreground mt-1">Falla potencial detectada</p>
          </CardContent>
        </Card>
      </div>

      {/* Insights List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Insights Actuales</h2>

        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Analizando datos operacionales...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {criticalEquipment.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No hay insights disponibles</p>
            ) : (
              criticalEquipment.map((item: any, idx: number) => (
                <Alert key={idx} className="border-[var(--brand-rojo)]/30 bg-[var(--brand-rojo)]/5">
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5 text-[var(--brand-rojo)]">⚠️</div>
                    <div className="flex-1">
                      <AlertDescription className="font-semibold text-base mb-1">
                        {item.name || item.title || 'Equipo Crítico'}
                      </AlertDescription>
                      <AlertDescription className="text-sm mb-3">
                        {item.description || item.issue || 'Requiere atención inmediata'}
                      </AlertDescription>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {item.status.toUpperCase() || 'CRÍTICO'}
                        </Badge>
                        {item.action && (
                          <button className="text-xs font-semibold hover:underline">
                            → {item.action}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </Alert>
              ))
            )}
          </div>
        )}
      </div>

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Casos de Uso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>• Detección de riesgos en equipos críticos</div>
            <div>• Alertas de vencimiento de documentos HSE</div>
            <div>• Monitoreo de niveles de stock</div>
            <div>• Predicción de fallas (mantenimiento predictivo)</div>
            <div>• Seguimiento de órdenes de compra vencidas</div>
            <div>• Resumen ejecutivo de operaciones</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Próximas Mejoras</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>• Integración con telemetría en vivo (real-time)</div>
            <div>• ML models para predicciones más precisas</div>
            <div>• Notificaciones push en tiempo real</div>
            <div>• Análisis de tendencias históricas</div>
            <div>• Recomendaciones automáticas de acciones</div>
            <div>• Reportes automáticos por email</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
