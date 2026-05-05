'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, TrendingDown, AlertTriangle, Package, FileCheck, Zap } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AIInsight {
  id: string;
  type: 'riesgo' | 'vencimiento' | 'stock' | 'mantencion' | 'oc' | 'resumen';
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  icon: React.ReactNode;
  action?: string;
  timestamp: Date;
}

export default function IAOperacionalPage() {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simular carga de insights IA
    setTimeout(() => {
      setInsights([
        {
          id: '1',
          type: 'riesgo',
          title: 'Riesgo Operacional - Equipo Crítico',
          description: 'Camión CAT 320 presenta 847 horas sin mantención preventiva. MTBF está 34% bajo lo esperado.',
          severity: 'critical',
          icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
          action: 'Programar mantención inmediata',
          timestamp: new Date(),
        },
        {
          id: '2',
          type: 'vencimiento',
          title: 'Documentos Vencidos - HSE',
          description: '7 certificaciones de seguridad vencen en 14 días. Requieren renovación urgente para compliance SERNAGEOMIN.',
          severity: 'warning',
          icon: <FileCheck className="h-5 w-5 text-yellow-600" />,
          action: 'Iniciar proceso de renovación',
          timestamp: new Date(),
        },
        {
          id: '3',
          type: 'stock',
          title: 'Stock Crítico - Repuestos',
          description: 'Filtros hidráulicos por debajo del nivel mínimo. Reorden automático activado para proveedor principal.',
          severity: 'warning',
          icon: <Package className="h-5 w-5 text-yellow-600" />,
          action: 'Acelerar entrega',
          timestamp: new Date(),
        },
        {
          id: '4',
          type: 'mantencion',
          title: 'Predicción - Falla Inminente',
          description: 'Basado en datos de telemetría, el compresor de aire tiene 78% de probabilidad de falla en 48-72 horas.',
          severity: 'critical',
          icon: <Zap className="h-5 w-5 text-red-600" />,
          action: 'Programar mantención preventiva',
          timestamp: new Date(),
        },
        {
          id: '5',
          type: 'oc',
          title: 'Órdenes de Compra Vencidas',
          description: '3 OCs están pendientes de pago y han excedido términos de pago con proveedores. Impacto reputacional y descuentos perdidos.',
          severity: 'warning',
          icon: <TrendingDown className="h-5 w-5 text-yellow-600" />,
          action: 'Revisar y procesar pagos',
          timestamp: new Date(),
        },
        {
          id: '6',
          type: 'resumen',
          title: 'Resumen Ejecutivo - Operación',
          description: 'Eficiencia operacional: 87%. 2 equipos requieren atención, 1 documento crítico por vencer. OCs al día. Recomendación: mantención preventiva hoy.',
          severity: 'info',
          icon: <AlertCircle className="h-5 w-5 text-blue-600" />,
          timestamp: new Date(),
        },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

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
            <div className="text-2xl font-bold text-red-600">2</div>
            <p className="text-xs text-muted-foreground mt-1">Requieren atención inmediata</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Advertencias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">3</div>
            <p className="text-xs text-muted-foreground mt-1">Monitoreo recomendado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Eficiencia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">87%</div>
            <p className="text-xs text-muted-foreground mt-1">Operación normal</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Predicciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">1</div>
            <p className="text-xs text-muted-foreground mt-1">Falla potencial detectada</p>
          </CardContent>
        </Card>
      </div>

      {/* Insights List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Insights Actuales</h2>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Analizando datos operacionales...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {insights.map((insight) => (
              <Alert key={insight.id} className={getSeverityColor(insight.severity)}>
                <div className="flex items-start gap-4">
                  <div className="mt-0.5">{insight.icon}</div>
                  <div className="flex-1">
                    <AlertDescription className="font-semibold text-base mb-1">
                      {insight.title}
                    </AlertDescription>
                    <AlertDescription className="text-sm mb-3">
                      {insight.description}
                    </AlertDescription>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {insight.type.toUpperCase()}
                      </Badge>
                      {insight.action && (
                        <button className="text-xs font-semibold hover:underline">
                          → {insight.action}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </Alert>
            ))}
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
