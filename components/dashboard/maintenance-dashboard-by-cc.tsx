'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, ChevronRight, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCostCenters } from '@/hooks/use-cost-centers';
import { formatCostCenterLabel, sortCostCenters } from '@/lib/cost-centers';

type WorkOrderRecord = {
  id: string;
  cost_center_id: string | null;
  status: string;
  work_order_number?: string | null;
  code?: string | null;
  title?: string | null;
};

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    open: 'Abierta',
    pending: 'Pendiente',
    in_progress: 'En progreso',
    completed: 'Completada',
  };

  return labels[status] || status;
}

export function MaintenanceDashboardByCC() {
  const { costCenters } = useCostCenters();
  const { data: workOrdersData } = useSWR('/api/maintenance/work-orders', fetcher);
  const [expandedCC, setExpandedCC] = useState<string | null>(null);
  const orderedCostCenters = sortCostCenters(costCenters);
  const workOrders = Array.isArray(workOrdersData?.workOrders) ? (workOrdersData.workOrders as WorkOrderRecord[]) : [];
  const summary = useMemo(() => {
    const open = workOrders.filter((order) => order.status === 'open' || order.status === 'pending').length;
    const inProgress = workOrders.filter((order) => order.status === 'in_progress').length;
    const completed = workOrders.filter((order) => order.status === 'completed').length;
    const withoutOrders = orderedCostCenters.filter((cc) => !workOrders.some((order) => order.cost_center_id === cc.id)).length;
    return {
      totalCostCenters: orderedCostCenters.length,
      totalOrders: workOrders.length,
      open,
      inProgress,
      completed,
      withoutOrders,
    };
  }, [orderedCostCenters, workOrders]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mantenimiento por centro de costo</h1>
        <p className="text-muted-foreground">Seguimiento real de ordenes agrupadas por centro de costo. Cada tarjeta se puede abrir para ver todas sus ordenes.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" className="gap-2">
          <Link href="/dashboard/mantenimiento/centro-costo/importar">
            <Download className="h-4 w-4" />
            Importar Excel
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Centros visibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalCostCenters}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Ordenes totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Abiertas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{summary.open}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Completadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Sin ordenes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{summary.withoutOrders}</div>
          </CardContent>
        </Card>
      </div>

      <p className="text-sm text-muted-foreground">
        Haz clic en cada centro para ver todas sus ordenes y el detalle operativo.
      </p>

      <div className="space-y-4">
        {orderedCostCenters.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No hay centros de costo cargados todavía.
            </CardContent>
          </Card>
        ) : orderedCostCenters.map((cc) => {
          const ccOrders = workOrders.filter((order) => order.cost_center_id === cc.id);
          const completed = ccOrders.filter((order) => order.status === 'completed').length;
          const inProgress = ccOrders.filter((order) => order.status === 'in_progress').length;
          const open = ccOrders.filter((order) => order.status === 'open' || order.status === 'pending').length;

          return (
            <Card key={cc.id}>
              <CardHeader className="pb-3">
                <button
                  type="button"
                  onClick={() => setExpandedCC(expandedCC === cc.id ? null : cc.id)}
                  aria-expanded={expandedCC === cc.id}
                  className="flex w-full cursor-pointer items-center justify-between rounded p-2 text-left hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    {expandedCC === cc.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <div>
                      <CardTitle className="text-lg">{cc.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{formatCostCenterLabel(cc)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Badge variant="secondary">{ccOrders.length} ordenes</Badge>
                    <Badge className="bg-green-100 text-green-800">{completed} completadas</Badge>
                    <Badge className="bg-blue-100 text-blue-800">{inProgress} en progreso</Badge>
                  </div>
                </button>
              </CardHeader>

              {expandedCC === cc.id && (
                <CardContent>
                  {ccOrders.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        {open} abiertas, {inProgress} en progreso y {completed} completadas.
                      </p>
                      <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                        {ccOrders.map((order) => (
                          <div key={order.id} className="flex items-center justify-between rounded border border-border p-3 text-sm">
                            <div className="min-w-0">
                              <p className="font-medium">{order.work_order_number || order.code || order.title}</p>
                              <p className="truncate text-muted-foreground">{order.title}</p>
                            </div>
                            <Badge variant="outline">{statusLabel(order.status)}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Este centro de costo aun no tiene ordenes registradas.</p>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
