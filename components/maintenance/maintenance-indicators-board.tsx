'use client';

import useSWR from 'swr';
import { AlertCircle, Gauge, RefreshCw, TrendingDown, TrendingUp, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

function money(value: number) {
  return `$${Number(value || 0).toLocaleString('es-CL')}`;
}

function normalizeStatus(value: string | null | undefined) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

type WorkOrderRow = {
  status: string | null;
  scheduled_date: string | null;
};

type AssetRow = {
  status: string | null;
};

type SummaryCosts = {
  totalCost: number;
  totalWorkOrders: number;
  totalRecords: number;
  assets: number;
  averageCostPerAsset: number;
};

export function MaintenanceIndicatorsBoard() {
  const { data: mttrData, mutate: mutateMttr } = useSWR('/api/maintenance/mttr', fetcher);
  const { data: ordersData, mutate: mutateOrders } = useSWR('/api/maintenance/work-orders', fetcher);
  const { data: assetsData, mutate: mutateAssets } = useSWR('/api/maintenance/assets', fetcher);
  const { data: costsData, mutate: mutateCosts } = useSWR('/api/maintenance/costs', fetcher);

  const workOrders = (Array.isArray(ordersData?.workOrders) ? ordersData.workOrders : []) as WorkOrderRow[];
  const assets = (Array.isArray(assetsData?.assets) ? assetsData.assets : []) as AssetRow[];
  const summaryCosts: SummaryCosts = costsData?.summary || {
    totalCost: 0,
    totalWorkOrders: 0,
    totalRecords: 0,
    assets: 0,
    averageCostPerAsset: 0,
  };

  const openOrders = workOrders.filter((order) => ['open', 'pending', 'pendiente'].includes(String(order.status || '').toLowerCase())).length;
  const inProgressOrders = workOrders.filter((order) => ['in_progress', 'en_progreso'].includes(String(order.status || '').toLowerCase())).length;
  const completedOrders = workOrders.filter((order) => ['completed', 'completado', 'closed'].includes(String(order.status || '').toLowerCase())).length;
  const overdueOrders = workOrders.filter((order) => {
    if (!order.scheduled_date) return false;
    const due = new Date(order.scheduled_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    return due < today && !['completed', 'completado', 'closed'].includes(String(order.status || '').toLowerCase());
  }).length;
  const activeAssets = assets.filter((asset) => ['active', 'activo', 'operativo'].includes(normalizeStatus(asset.status))).length;
  const availability = assets.length > 0 ? Math.round((activeAssets / assets.length) * 100) : 0;

  const cards = [
    { label: 'MTTR promedio', value: `${Number(mttrData?.averageMTTR || 0).toFixed(1)} h`, icon: Gauge, tone: 'text-primary' },
    { label: 'Disponibilidad', value: `${Number(mttrData?.availability || availability || 0).toFixed(1)}%`, icon: TrendingUp, tone: 'text-green-500' },
    { label: 'Costo 30d', value: money(summaryCosts.totalCost || 0), icon: TrendingDown, tone: 'text-orange-500' },
    { label: 'OT cerradas', value: String(completedOrders), icon: Wrench, tone: 'text-secondary' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Indicadores de mantención</h1>
          <p className="mt-2 text-muted-foreground">Visibilidad ejecutiva con MTTR, disponibilidad, OT y costo real.</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            void mutateMttr();
            void mutateOrders();
            void mutateAssets();
            void mutateCosts();
          }}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Recargar indicadores
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <card.icon className={`h-4 w-4 ${card.tone}`} />
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Estado operativo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Activos</p>
                <p className="text-2xl font-bold">{assets.length}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Operativos</p>
                <p className="text-2xl font-bold text-green-500">{activeAssets}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Abiertas</p>
                <p className="text-2xl font-bold text-orange-500">{openOrders}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Atrasadas</p>
                <p className="text-2xl font-bold text-destructive">{overdueOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lectura ejecutiva</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="text-sm text-muted-foreground">Órdenes en progreso</span>
              <Badge variant="outline">{inProgressOrders}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="text-sm text-muted-foreground">Disponibilidad calculada</span>
              <Badge variant="secondary">{availability}%</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="text-sm text-muted-foreground">Costo promedio por equipo</span>
              <Badge variant="outline">{money(summaryCosts.averageCostPerAsset || 0)}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="text-sm text-muted-foreground">Horas MTTR</span>
              <Badge variant="outline">{Number(mttrData?.averageMTTR || 0).toFixed(1)} h</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notas de control</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p className="flex items-center gap-2"><AlertCircle className="h-4 w-4" />Estos indicadores usan OT, activos y costos reales del sistema.</p>
          <p className="flex items-center gap-2"><AlertCircle className="h-4 w-4" />La disponibilidad se calcula con activos operativos sobre total de activos visibles.</p>
        </CardContent>
      </Card>
    </div>
  );
}
