'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatePanel } from '@/components/ui/state-panel';

type WorkOrder = {
  id: string;
  work_order_number?: string | null;
  title?: string | null;
  status?: string | null;
  priority?: string | null;
  scheduled_date?: string | null;
  completion_date?: string | null;
};

type AssetTimelineResponse = {
  asset?: {
    id: string;
    asset_code?: string | null;
    name?: string | null;
  };
  workOrders?: WorkOrder[];
  events?: Array<{ id: number; event_at?: string | null }>;
  totals?: {
    partsCost?: number;
    laborCost?: number;
    externalCost?: number;
    totalCost?: number;
  };
};

const fetcher = async (url: string): Promise<AssetTimelineResponse> => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la actividad relacionada');
  return payload;
};

const money = (value: number | null | undefined) =>
  `$${Number(value || 0).toLocaleString('es-CL', { maximumFractionDigits: 0 })}`;

const statusLabel: Record<string, string> = {
  open: 'Abierta',
  in_progress: 'En ejecución',
  completed: 'Completada',
  cancelled: 'Cancelada',
  pending: 'Pendiente',
};

const priorityLabel: Record<string, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  critical: 'Crítica',
};

export function AssetRelatedOperations({ assetId }: { assetId: string }) {
  const { data, error, isLoading, mutate } = useSWR<AssetTimelineResponse>(
    assetId ? `/api/maintenance/assets/${encodeURIComponent(assetId)}/timeline` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const orders = data?.workOrders || [];
  const activeOrders = orders.filter((order) => !['completed', 'cancelled'].includes(order.status || ''));
  const completedOrders = orders.filter((order) => order.status === 'completed');
  const recentOrders = orders.slice(0, 5);
  const lastActivity = data?.events?.[0]?.event_at;

  if (isLoading) {
    return <StatePanel tone="loading" title="Cargando actividad del equipo" description="Reuniendo órdenes y costos asociados." />;
  }

  if (error) {
    return (
      <StatePanel
        tone="error"
        title="No fue posible cargar la actividad del equipo"
        description={error instanceof Error ? error.message : 'Reintenta la consulta.'}
        actions={<Button variant="outline" onClick={() => void mutate()}><RefreshCw className="h-4 w-4" />Reintentar</Button>}
      />
    );
  }

  return (
    <Card className="shadow-none">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base">Actividad relacionada</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Órdenes, costos y movimientos vinculados a este equipo.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void mutate()}>
          <RefreshCw className="h-4 w-4" />Actualizar
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Órdenes activas', activeOrders.length.toLocaleString('es-CL')],
            ['Órdenes completadas', completedOrders.length.toLocaleString('es-CL')],
            ['Costo acumulado', money(data?.totals?.totalCost)],
            ['Última actividad', lastActivity ? new Date(lastActivity).toLocaleDateString('es-CL') : 'Sin registro'],
          ].map(([label, value]) => (
            <div key={label} className="bg-card px-4 py-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-2 text-xl font-semibold">{value}</p>
            </div>
          ))}
        </div>

        {recentOrders.length === 0 ? (
          <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
            Este equipo todavía no tiene órdenes de trabajo relacionadas.
          </div>
        ) : (
          <div className="divide-y rounded-lg border">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium">{order.work_order_number || 'Orden de trabajo'}</p>
                  <p className="truncate text-sm text-muted-foreground">{order.title || 'Sin descripción'}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {statusLabel[order.status || ''] || order.status || 'Sin estado'}
                    {order.priority ? ` · ${priorityLabel[order.priority] || order.priority}` : ''}
                    {order.scheduled_date ? ` · ${new Date(order.scheduled_date).toLocaleDateString('es-CL')}` : ''}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/dashboard/mantenimiento/ordenes-trabajo/${encodeURIComponent(order.id)}`}>
                    Abrir <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Repuestos</p>
            <p className="mt-1 font-semibold">{money(data?.totals?.partsCost)}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Mano de obra</p>
            <p className="mt-1 font-semibold">{money(data?.totals?.laborCost)}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Servicios externos</p>
            <p className="mt-1 font-semibold">{money(data?.totals?.externalCost)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
