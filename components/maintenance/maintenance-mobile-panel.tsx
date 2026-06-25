'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { AlertCircle, ArrowRight, Gauge, QrCode, Smartphone, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    open: 'Abierta',
    pending: 'Pendiente',
    in_progress: 'En progreso',
    completed: 'Completada',
    closed: 'Cerrada',
  };
  return labels[status] || status || 'Sin estado';
}

export function MaintenanceMobilePanel() {
  const searchParams = useSearchParams();
  const assetId = searchParams.get('assetId') || '';

  const { data: assetsData } = useSWR('/api/maintenance/assets', fetcher);
  const { data: ordersData } = useSWR('/api/maintenance/work-orders', fetcher);
  const { data: mttrData } = useSWR('/api/maintenance/mttr', fetcher);
  const { data: assetHistoryData } = useSWR(assetId ? `/api/maintenance/assets/${assetId}/history` : null, fetcher);

  const assets = Array.isArray(assetsData?.assets) ? assetsData.assets : [];
  const workOrders = Array.isArray(ordersData?.workOrders) ? ordersData.workOrders : [];
  const selectedAsset = assetHistoryData?.asset || null;
  const selectedHistory = Array.isArray(assetHistoryData?.history) ? assetHistoryData.history : [];

  const openOrders = useMemo(
    () => workOrders.filter((order: any) => ['open', 'pending', 'pendiente', 'in_progress'].includes(String(order.status || '').toLowerCase())).slice(0, 5),
    [workOrders],
  );

  const urgentOrders = useMemo(
    () => workOrders.filter((order: any) => ['high', 'critical', 'urgente'].includes(String(order.priority || '').toLowerCase())).slice(0, 3),
    [workOrders],
  );

  const stats = [
    { label: 'Equipos', value: String(assets.length), icon: Smartphone },
    { label: 'OT abiertas', value: String(openOrders.length), icon: Wrench },
    { label: 'Urgentes', value: String(urgentOrders.length), icon: AlertCircle },
    { label: 'MTTR', value: `${Number(mttrData?.averageMTTR || 0).toFixed(1)} h`, icon: Gauge },
  ];

  return (
    <div className="mx-auto max-w-md space-y-4 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Panel movil de mantencion</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Vista optimizada para terreno con accesos rapidos, OT abiertas y ficha del equipo.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
              <stat.icon className="h-5 w-5 text-primary" />
            </CardContent>
          </Card>
        ))}
      </div>

      {assetId ? (
        <Card>
          <CardHeader>
            <CardTitle>Equipo seleccionado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {selectedAsset ? (
              <>
                <div className="rounded-lg border border-border p-3">
                  <p className="font-semibold">{selectedAsset.asset_name || 'Equipo'}</p>
                  <p className="text-muted-foreground">{selectedAsset.asset_code || 'Sin codigo'}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Tipo</p>
                    <p className="font-semibold">{selectedAsset.asset_type || '-'}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Ubicacion</p>
                    <p className="font-semibold">{selectedAsset.location || '-'}</p>
                  </div>
                </div>
                <Button asChild className="w-full justify-between">
                  <Link href={`/dashboard/mantenimiento/vehiculos/${assetId}/ficha`}>
                    Abrir ficha completa
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-3 text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                No pudimos cargar el equipo indicado.
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Acciones rapidas</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3">
          <Button asChild className="justify-between">
            <Link href="/dashboard/work-orders/create">
              Crear orden de trabajo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-between">
            <Link href="/dashboard/mantenimiento/bitacora">
              Ver bitacora
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-between">
            <Link href="/dashboard/mantenimiento/planificacion">
              Ver planificacion
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-between">
            <Link href="/dashboard/mantenimiento/gerencial">
              Dashboard gerencial
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-between">
            <Link href="/dashboard/mantenimiento/vehiculos">
              Escanear o buscar QR
              <QrCode className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>OT abiertas y urgentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {openOrders.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              No hay ordenes abiertas en este momento.
            </div>
          ) : (
            openOrders.map((order: any) => (
              <div key={order.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{order.work_order_number || order.code || order.title}</p>
                    <p className="text-muted-foreground">{order.title}</p>
                  </div>
                  <Badge variant="outline">{statusLabel(String(order.status || ''))}</Badge>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{order.asset_name || 'Sin equipo'}</span>
                  {order.scheduled_date ? <span>{new Date(order.scheduled_date).toLocaleDateString('es-CL')}</span> : null}
                </div>
              </div>
            ))
          )}

          {urgentOrders.length > 0 ? (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Urgentes</p>
              {urgentOrders.map((order: any) => (
                <div key={order.id} className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700">
                  <p className="font-medium">{order.work_order_number || order.code || order.title}</p>
                  <p className="text-xs">{order.title}</p>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {selectedHistory.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Ultima trazabilidad</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {selectedHistory.slice(0, 3).map((item: any) => (
              <div key={item.id} className="rounded-lg border border-border p-3">
                <p className="font-semibold">{item.work_order?.work_order_number || 'Sin OT'}</p>
                <p className="text-muted-foreground">{item.notes || item.parts_replaced || 'Mantencion registrada'}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.created_at ? new Date(item.created_at).toLocaleDateString('es-CL') : 'Sin fecha'}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
