'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { AlertCircle, ArrowRight, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type MaintenanceAsset = {
  id: string;
  assetCode?: string;
  assetName?: string;
  assetType?: string;
  location?: string;
  status?: string;
  manufacturer?: string;
  model?: string;
  criticality?: string;
};

type WorkOrder = {
  id: string;
  work_order_number: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  work_type: string;
  progress_percentage?: number;
  planned_duration_hours?: number;
  actual_duration_hours?: number;
  assigned_to_name?: string;
  created_at?: string;
  scheduled_date?: string;
  completion_date?: string;
  asset_id?: string | null;
};

const fetcher = async (url: string) => {
  const response = await fetch(url);
  const payload = await response.json().catch(() => null);
  if (!response.ok) return null;
  return payload;
};

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    open: 'Abierta',
    assigned: 'Asignada',
    in_progress: 'En progreso',
    completed: 'Completada',
    closed: 'Cerrada',
  };
  return labels[status] || status || 'Sin estado';
}

function priorityLabel(priority: string) {
  const labels: Record<string, string> = {
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
    critical: 'Critica',
  };
  return labels[priority] || priority || 'Sin prioridad';
}

function workTypeLabel(workType: string) {
  const labels: Record<string, string> = {
    preventive: 'Preventivo',
    corrective: 'Correctivo',
    predictive: 'Predictivo',
  };
  return labels[workType] || workType || 'Sin tipo';
}

function badgeClass(status: string) {
  switch (status) {
    case 'completed':
      return 'bg-green-600/10 text-green-700';
    case 'in_progress':
      return 'bg-blue-600/10 text-blue-700';
    case 'open':
      return 'bg-orange-600/10 text-orange-700';
    case 'closed':
      return 'bg-slate-600/10 text-slate-700';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export default function VehicleFaultTreePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const assetId = decodeURIComponent(String(params.id || ''));

  const { data: assetData, error: assetError, isLoading: assetLoading } = useSWR('/api/maintenance/assets', fetcher, {
    revalidateOnFocus: false,
  });

  const { data: workOrderData, error: workOrderError, isLoading: workOrdersLoading } = useSWR(
    '/api/maintenance/work-orders',
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  const assets = ((assetData?.assets || []) as MaintenanceAsset[]).map((asset) => ({
    ...asset,
    assetCode: asset.assetCode || '',
    assetName: asset.assetName || '',
    assetType: asset.assetType || '',
  }));

  const workOrders = (workOrderData?.workOrders || []) as WorkOrder[];

  const selectedAsset = assets.find((asset) => asset.id === assetId) || null;
  const assetOrders = useMemo(
    () => workOrders.filter((order) => String(order.asset_id || '') === assetId),
    [assetId, workOrders],
  );

  const openOrders = assetOrders.filter((order) => order.status === 'open' || order.status === 'assigned');
  const progressOrders = assetOrders.filter((order) => order.status === 'in_progress');
  const closedOrders = assetOrders.filter((order) => order.status === 'completed' || order.status === 'closed');

  if (assetLoading || workOrdersLoading) {
    return <div className="text-muted-foreground">Cargando informacion del activo...</div>;
  }

  if (assetError || workOrderError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        No fue posible cargar el historial real del activo.
      </div>
    );
  }

  if (!selectedAsset) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activo no encontrado</h1>
          <p className="mt-2 text-muted-foreground">No pudimos ubicar el equipo solicitado en la base real.</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/dashboard/mantenimiento/vehiculos')}>
          Volver a vehiculos
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{selectedAsset.assetName || 'Activo'}</h1>
          <p className="mt-2 text-muted-foreground">Vista real del activo con su historial de ordenes de trabajo.</p>
        </div>
        <Link href={`/dashboard/work-orders/create?assetId=${selectedAsset.id}`}>
          <Button className="gap-2">
            <Wrench className="h-4 w-4" />
            Crear orden de trabajo
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total ordenes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{assetOrders.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Abiertas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{openOrders.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">En progreso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{progressOrders.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cerradas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{closedOrders.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Ficha del activo</CardTitle>
            <CardDescription>Datos reales del sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">Codigo</p>
              <p className="font-semibold">{selectedAsset.assetCode || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Tipo</p>
              <p className="font-semibold">{selectedAsset.assetType || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Ubicacion</p>
              <p className="font-semibold">{selectedAsset.location || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Fabricante</p>
              <p className="font-semibold">{selectedAsset.manufacturer || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Modelo</p>
              <p className="font-semibold">{selectedAsset.model || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Criticidad</p>
              <p className="font-semibold">{selectedAsset.criticality || '-'}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Ordenes relacionadas</CardTitle>
            <CardDescription>Historial operativo del activo con estados reales</CardDescription>
          </CardHeader>
          <CardContent>
            {assetOrders.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                No hay ordenes de trabajo asociadas a este activo.
              </div>
            ) : (
              <div className="space-y-3">
                {assetOrders.map((order) => (
                  <div key={order.id} className="rounded-lg border border-border bg-background p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{order.work_order_number}</p>
                          <Badge className={badgeClass(order.status)}>{statusLabel(order.status)}</Badge>
                          <Badge variant="outline">{priorityLabel(order.priority)}</Badge>
                          <Badge variant="outline">{workTypeLabel(order.work_type)}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{order.title}</p>
                        {order.description ? <p className="mt-1 text-xs text-muted-foreground">{order.description}</p> : null}
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <p>{order.scheduled_date ? new Date(order.scheduled_date).toLocaleDateString('es-CL') : 'Sin fecha'}</p>
                        {typeof order.progress_percentage === 'number' ? (
                          <p className="mt-1 font-semibold text-foreground">{order.progress_percentage}% completado</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                      <div>
                        <p className="text-muted-foreground">Tecnico</p>
                        <p className="font-medium">{order.assigned_to_name || 'Sin asignar'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Horas</p>
                        <p className="font-medium">
                          {order.actual_duration_hours || '-'} / {order.planned_duration_hours || '-'} h
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Creada</p>
                        <p className="font-medium">
                          {order.created_at ? new Date(order.created_at).toLocaleDateString('es-CL') : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
