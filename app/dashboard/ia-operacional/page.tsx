'use client';

import useSWR from 'swr';
import { AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type CriticalEquipmentItem = {
  name?: string | null;
  title?: string | null;
  description?: string | null;
  issue?: string | null;
  status?: string | null;
  action?: string | null;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function IAOperacionalPage() {
  const { data, error, isLoading } = useSWR('/api/dashboard/ia-operacional', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    refreshInterval: 30000,
  });

  if (error) return <div className="text-red-500">Error al cargar perspectivas IA</div>;
  if (isLoading) return <div className="text-gray-500">Cargando inteligencia operacional...</div>;

  const insightsData = data?.insights || {};
  const detailsData = data?.details || {};

  const criticalCount = insightsData.equipment_risks || 0;
  const warningCount = insightsData.expiring_documents || 0;
  const efficiency = insightsData.operational_efficiency || 0;
  const predictions = insightsData.pending_maintenance || 0;

  const criticalEquipment = (detailsData.critical_equipment || []) as CriticalEquipmentItem[];
  const expiringDocs = detailsData.expiring_documents || [];
  const criticalStock = detailsData.critical_stock || [];
  const pendingMaint = detailsData.pending_maintenance || [];
  const overdueOrders = detailsData.overdue_orders || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">IA Operacional Minera</h1>
        <p className="mt-2 text-muted-foreground">
          Sistema inteligente que analiza datos en vivo de equipos, documentos, inventario y operaciones para generar insights accionables.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alertas Críticas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-rojo)]">{criticalCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">Requieren atención inmediata</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Advertencias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--secondary)]">{warningCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">Monitoreo recomendado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Eficiencia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-verde)]">{efficiency}%</div>
            <p className="mt-1 text-xs text-muted-foreground">Operación normal</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Predicciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--secondary)]">{predictions}</div>
            <p className="mt-1 text-xs text-muted-foreground">Falla potencial detectada</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Insights Actuales</h2>

        {criticalEquipment.length === 0 ? (
          <p className="py-4 text-center text-muted-foreground">No hay insights disponibles</p>
        ) : (
          <div className="space-y-4">
            {criticalEquipment.map((item, idx: number) => (
              <div key={idx} className="rounded-lg border border-[var(--brand-rojo)]/30 bg-[var(--brand-rojo)]/5 p-4">
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 text-[var(--brand-rojo)]">⚠️</div>
                  <div className="flex-1">
                    <AlertDescription className="mb-1 text-base font-semibold">
                      {item.name || item.title || 'Equipo Crítico'}
                    </AlertDescription>
                    <AlertDescription className="mb-3 text-sm">
                      {item.description || item.issue || 'Requiere atención inmediata'}
                    </AlertDescription>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {String(item.status || 'CRITICO').toUpperCase()}
                      </Badge>
                      {item.action && <button className="text-xs font-semibold hover:underline">→ {item.action}</button>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Documentos en riesgo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--secondary)]">{expiringDocs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stock critico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-rojo)]">{criticalStock.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendientes de mantencion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-verde)]">{pendingMaint.length + overdueOrders.length}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}