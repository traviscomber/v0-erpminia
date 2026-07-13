'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { AlertCircle, ArrowRight, Copy, History, LayoutDashboard, QrCode, Smartphone, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { inferMachineFamilyFromText } from '@/lib/maintenance/cost-center-machines';

type MaintenanceAsset = {
  id: string;
  asset_code?: string;
  asset_name?: string;
  asset_type?: string;
  location?: string;
  status?: string;
  manufacturer?: string;
  model?: string;
  criticality?: string;
  mtbf_hours?: number | null;
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

type HistoryRow = {
  id: string;
  maintenance_type?: string | null;
  performed_by_name?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  parts_replaced?: string | null;
  parts_cost?: number | null;
  labor_hours?: number | null;
  labor_cost?: number | null;
  notes?: string | null;
  created_at?: string | null;
  work_order?: {
    work_order_number?: string | null;
    title?: string | null;
    status?: string | null;
    priority?: string | null;
  } | null;
};

type MachineCatalogItem = {
  id: string;
  family?: string | null;
  name?: string | null;
  code?: string | null;
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
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
    critical: 'Crítica',
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

export function AssetDetailView() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const assetId = decodeURIComponent(String(params.id || ''));
  const [origin, setOrigin] = useState('https://www.motil.app');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const { data: historyData, error: historyError, isLoading: historyCargando, mutate: mutateHistory } = useSWR(
    assetId ? `/api/maintenance/assets/${assetId}/history` : null,
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  const { data: workOrderData, error: workOrderError, isLoading: workOrdersCargando, mutate: mutateWorkOrders } = useSWR(
    '/api/maintenance/work-orders',
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );
  const { data: machineCatalogData } = useSWR('/api/maintenance/cost-center-machines', fetcher, {
    revalidateOnFocus: false,
  });

  const asset = historyData?.asset as MaintenanceAsset | undefined;
  const history = Array.isArray(historyData?.history) ? (historyData.history as HistoryRow[]) : [];
  const workOrders = (workOrderData?.workOrders || []) as WorkOrder[];

  const assetOrders = useMemo(
    () => workOrders.filter((order) => String(order.asset_id || '') === assetId),
    [assetId, workOrders],
  );
  const machineCatalog: MachineCatalogItem[] = Array.isArray(machineCatalogData?.machines) ? machineCatalogData.machines : [];
  const machineFamily = useMemo(() => {
    const text = `${asset?.asset_name || ''} ${asset?.asset_type || ''} ${asset?.model || ''} ${asset?.manufacturer || ''}`;
    return inferMachineFamilyFromText(text);
  }, [asset?.asset_name, asset?.asset_type, asset?.model, asset?.manufacturer]);
  const relatedMachines = useMemo(
    () =>
      machineFamily
        ? machineCatalog.filter((machine) => String(machine.family || '').toLowerCase() === machineFamily.toLowerCase()).slice(0, 10)
        : [],
    [machineCatalog, machineFamily],
  );

  const openOrders = assetOrders.filter((order) => order.status === 'open' || order.status === 'assigned');
  const progressOrders = assetOrders.filter((order) => order.status === 'in_progress');
  const closedOrders = assetOrders.filter((order) => order.status === 'completed' || order.status === 'closed');
  const latestHistory = history[0];
  const totalMaintenanceCost = history.reduce((sum, item) => sum + Number(item.parts_cost || 0) + Number(item.labor_cost || 0), 0);
  const totalLaborHours = history.reduce((sum, item) => sum + Number(item.labor_hours || 0), 0);

  const qrTargetUrl = `${origin}/dashboard/mantenimiento/vehiculos/${assetId}/ficha`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrTargetUrl)}`;

  const copyQrLink = async () => {
    if (typeof navigator !== 'undefined') {
      await navigator.clipboard.writeText(qrTargetUrl);
    }
  };

  const isLoading = historyCargando || workOrdersCargando;

  if (isLoading) {
    return <div className="text-muted-foreground">Cargando información del activo...</div>;
  }

  if (historyError || workOrderError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        No fue posible cargar el historial real del activo.
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activo no encontrado</h1>
          <p className="mt-2 text-muted-foreground">No pudimos ubicar el equipo solicitado en la base real.</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/dashboard/mantenimiento/vehiculos')}>
          Volver a vehículos
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{asset.asset_name || 'Activo'}</h1>
          <p className="mt-2 text-muted-foreground">Vista real del activo con su historial de mantención, QR y órdenes.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="gap-2">
            <Link href={`/dashboard/work-orders/create?assetId=${asset.id}`}>
              <Wrench className="h-4 w-4" />
              Crear orden de trabajo
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard/mantenimiento/movil">
              <Smartphone className="h-4 w-4" />
              Vista móvil
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard/mantenimiento/gerencial">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard gerencial
            </Link>
          </Button>
        </div>
      </div>

      <Card className="border-border/70 bg-card/90">
        <CardHeader className="pb-3">
          <CardTitle>Atajos del activo</CardTitle>
          <CardDescription>Todo lo importante del equipo queda a un clic para terreno y supervisión.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Button asChild variant="outline" className="justify-between">
              <Link href={`/dashboard/mantenimiento/vehiculos/${asset.id}/qr`}>
                Tarjeta QR
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href={`/dashboard/work-orders/create?assetId=${asset.id}`}>
                Crear OT
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/telemetria">
                Telemetría
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/bodega">
                Bodega
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total órdenes</CardTitle>
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

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Costo acumulado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${Number(totalMaintenanceCost).toLocaleString('es-CL')}</div>
            <p className="text-xs text-muted-foreground">{totalLaborHours.toFixed(1)} horas registradas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>QR del equipo</CardTitle>
            <CardDescription>Apunta a la ficha real del activo y su historial.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center rounded-lg border border-border bg-white p-4">
              <img src={qrImageUrl} alt={`QR de ${asset.asset_name || 'activo'}`} className="h-56 w-56 object-contain" />
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">Destino</p>
              <p className="break-all font-medium">{qrTargetUrl}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="gap-2" onClick={copyQrLink}>
                <Copy className="h-4 w-4" />
                Copiar enlace
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/dashboard/mantenimiento/vehiculos/${asset.id}/qr`}>Tarjeta QR</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/dashboard/mantenimiento/vehiculos/${asset.id}/arbol`}>Ver árbol de fallas</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/dashboard/work-orders/create?assetId=${asset.id}`}>Nueva OT</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Ficha del activo</CardTitle>
            <CardDescription>Datos reales del sistema</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <p className="text-muted-foreground">Código</p>
              <p className="font-semibold">{asset.asset_code || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Tipo</p>
              <p className="font-semibold">{asset.asset_type || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Ubicación</p>
              <p className="font-semibold">{asset.location || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Fabricante</p>
              <p className="font-semibold">{asset.manufacturer || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Modelo</p>
              <p className="font-semibold">{asset.model || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Criticidad</p>
              <p className="font-semibold">{asset.criticality || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Familia derivada</p>
              <p className="font-semibold">{machineFamily || 'Sin familia'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Horómetro técnico</p>
              <p className="font-semibold">{asset.mtbf_hours ? `${asset.mtbf_hours} h` : 'Sin lectura'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Última mantención</p>
              <p className="font-semibold">
                {latestHistory?.created_at ? new Date(latestHistory.created_at).toLocaleDateString('es-CL') : '-'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Último técnico</p>
              <p className="font-semibold">{latestHistory?.performed_by_name || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Costo histórico</p>
              <p className="font-semibold">${Number(totalMaintenanceCost).toLocaleString('es-CL')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trazabilidad rápida</CardTitle>
          <CardDescription>Accesos útiles para terreno y supervisión</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground">OT activas</p>
            <p className="text-2xl font-bold">{openOrders.length + progressOrders.length}</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground">Mantenciones cerradas</p>
            <p className="text-2xl font-bold">{closedOrders.length}</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground">Acceso directo</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" asChild>
                <Link href="/dashboard/mantenimiento/documentos">Documentos</Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href="/dashboard/mantenimiento/bitacora">Bitácora</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
        <CardTitle>Máquinas relacionadas</CardTitle>
          <CardDescription>
            {machineFamily
              ? `Modelos detectados en la familia ${machineFamily}`
              : 'No pudimos derivar una familia clara desde el nombre del equipo'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {machineFamily && relatedMachines.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {relatedMachines.map((machine) => (
                <div key={machine.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">{machine.family}</p>
                      <p className="font-semibold">{machine.name}</p>
                      <p className="text-sm text-muted-foreground">{machine.code}</p>
                    </div>
                    <Badge variant="outline">Centro</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              Todavía no hay máquinas relacionadas para mostrar.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de mantención</CardTitle>
          <CardDescription>Registro real de mantenciones y repuestos instalados</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              No hay historial de mantención registrado para este equipo.
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div key={item.id} className="rounded-lg border border-border bg-background p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{item.work_order?.work_order_number || 'Sin OT'}</p>
                        <Badge className={badgeClass(String(item.work_order?.status || 'open'))}>
                          {statusLabel(String(item.work_order?.status || 'open'))}
                        </Badge>
                        <Badge variant="outline">
                          {priorityLabel(String(item.work_order?.priority || 'medium'))}
                        </Badge>
                        <Badge variant="outline">{workTypeLabel(String(item.maintenance_type || 'corrective'))}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{item.work_order?.title || 'Mantención registrada'}</p>
                      {item.notes ? <p className="mt-1 text-xs text-muted-foreground">{item.notes}</p> : null}
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>{item.created_at ? new Date(item.created_at).toLocaleDateString('es-CL') : 'Sin fecha'}</p>
                      {item.performed_by_name ? <p className="mt-1 font-semibold text-foreground">{item.performed_by_name}</p> : null}
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                    <div>
                      <p className="text-muted-foreground">Horas</p>
                      <p className="font-medium">{item.labor_hours || '-'} h</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Repuestos</p>
                      <p className="font-medium">{item.parts_replaced || 'Sin detalle'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Costo total</p>
                      <p className="font-medium">
                        ${Number((item.parts_cost || 0) + (item.labor_cost || 0)).toLocaleString('es-CL')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Órdenes relacionadas</CardTitle>
          <CardDescription>Historial operativo del activo con estados reales</CardDescription>
        </CardHeader>
        <CardContent>
          {assetOrders.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              No hay órdenes de trabajo asociadas a este activo.
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
                      <p className="text-muted-foreground">Técnico</p>
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

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <History className="h-4 w-4" />
        El QR lleva a esta ficha y el historial sale de la base real de mantenimiento.
      </div>
    </div>
  );
}

export { AssetDetailView as AssetDetailVer };
