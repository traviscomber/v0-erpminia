'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { Activity, AlertCircle, ArrowRight, CalendarClock, History, Route, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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

type HistoryRow = {
  id: string;
  maintenance_type?: string | null;
  performed_by_name?: string | null;
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

type WorkOrder = {
  id: string;
  work_order_number: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  work_type: string;
  root_cause?: string | null;
  preventive_actions?: string | null;
  created_at?: string;
  scheduled_date?: string;
  completion_date?: string;
  asset_id?: string | null;
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || 'No fue posible cargar la informacion');
  }
  return payload;
};

function normalizeText(value: string | null | undefined) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function labelWorkType(workType?: string | null) {
  const normalized = normalizeText(workType);
  if (['preventive', 'preventivo'].includes(normalized)) return 'Preventivo';
  if (['corrective', 'correctivo'].includes(normalized)) return 'Correctivo';
  if (['predictive', 'predictivo'].includes(normalized)) return 'Predictivo';
  return workType || 'Sin tipo';
}

function labelPriority(priority?: string | null) {
  const normalized = normalizeText(priority);
  if (['critical', 'critico', 'critica'].includes(normalized)) return 'Critica';
  if (['high', 'alta'].includes(normalized)) return 'Alta';
  if (['medium', 'media'].includes(normalized)) return 'Media';
  if (['low', 'baja'].includes(normalized)) return 'Baja';
  return priority || 'Sin prioridad';
}

function labelStatus(status?: string | null) {
  const normalized = normalizeText(status);
  if (['open', 'abierta', 'pendiente'].includes(normalized)) return 'Abierta';
  if (['assigned', 'asignada'].includes(normalized)) return 'Asignada';
  if (['in_progress', 'en_progreso'].includes(normalized)) return 'En progreso';
  if (['completed', 'completada'].includes(normalized)) return 'Completada';
  if (['closed', 'cerrada'].includes(normalized)) return 'Cerrada';
  return status || 'Sin estado';
}

function labelCause(row: HistoryRow | WorkOrder) {
  if ('root_cause' in row && row.root_cause) return row.root_cause;
  if ('maintenance_type' in row && row.maintenance_type) return row.maintenance_type;
  if ('preventive_actions' in row && row.preventive_actions) return row.preventive_actions;
  if ('notes' in row && row.notes) return row.notes;
  if ('description' in row && row.description) return row.description;
  if ('work_order' in row && row.work_order?.title) return row.work_order.title;
  if ('title' in row && row.title) return row.title;
  return 'Sin causa registrada';
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('es-CL') : 'Sin fecha';
}

type AssetFaultTreeViewProps = {
  scope?: 'vehiculos' | 'equipos';
};

type TechnicalSheetResponse = {
  referenceSheet?: {
    brand?: string;
    model?: string;
    family?: string;
    sourceUrl?: string;
    sourceLabel?: string;
    summary?: string;
    keySpecs?: Array<{ label: string; value: string }>;
    components?: Array<{
      code: string;
      name: string;
      level: number;
      criticality: string;
      description: string;
      faults: Array<{
        code: string;
        name: string;
        severity: string;
        symptom: string;
        cause: string;
        effect: string;
        recommendedAction: string;
      }>;
    }>;
  } | null;
  preventiveAlerts?: Array<{
    code: string;
    componentCode: string;
    componentName: string;
    severity: string;
    priority: string;
    title: string;
    symptom: string;
    cause: string;
    effect: string;
    recommendedAction: string;
    workType: 'preventive';
  }>;
};

export function AssetFaultTreeView({ scope }: AssetFaultTreeViewProps) {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const assetId = decodeURIComponent(String(params.id || ''));
  const [origin, setOrigin] = useState('https://www.motil.app');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const { data: historyData, error: historyError, isLoading: historyLoading } = useSWR(
    assetId ? `/api/maintenance/assets/${assetId}/history` : null,
    fetcher,
    { revalidateOnFocus: false },
  );
  const { data: technicalSheetData, error: technicalSheetError } = useSWR<TechnicalSheetResponse>(
    assetId ? `/api/maintenance/assets/${assetId}/technical-sheet` : null,
    fetcher,
    { revalidateOnFocus: false },
  );
  const { data: workOrderData, error: workOrderError, isLoading: ordersLoading } = useSWR(
    '/api/maintenance/work-orders',
    fetcher,
    { revalidateOnFocus: false },
  );

  const asset = historyData?.asset as MaintenanceAsset | undefined;
  const history = Array.isArray(historyData?.history) ? (historyData.history as HistoryRow[]) : [];
  const workOrders = Array.isArray(workOrderData?.workOrders) ? (workOrderData.workOrders as WorkOrder[]) : [];
  const assetOrders = useMemo(
    () => workOrders.filter((order) => String(order.asset_id || '') === assetId),
    [assetId, workOrders],
  );
  const referenceSheet = technicalSheetData?.referenceSheet || null;
  const preventiveAlerts = Array.isArray(technicalSheetData?.preventiveAlerts) ? technicalSheetData.preventiveAlerts : [];

  const combinedEvents = useMemo(() => {
    const historyEvents = history.map((item) => ({
      id: `h-${item.id}`,
      source: 'historial',
      cause: labelCause(item),
      status: item.work_order?.status || 'completed',
      priority: item.work_order?.priority || 'medium',
      workType: item.maintenance_type || 'corrective',
      performedBy: item.performed_by_name || 'Sin tecnico',
      details: item.notes || item.parts_replaced || 'Sin detalle',
      date: item.created_at || null,
      orderNumber: item.work_order?.work_order_number || null,
      cost: Number(item.parts_cost || 0) + Number(item.labor_cost || 0),
      laborHours: Number(item.labor_hours || 0),
    }));

    const orderEvents = assetOrders.map((order) => ({
      id: `o-${order.id}`,
      source: 'OT',
      cause: labelCause(order),
      status: order.status,
      priority: order.priority,
      workType: order.work_type,
      performedBy: order.asset_id || 'Sin activo',
      details: order.preventive_actions || order.description || 'Sin detalle',
      date: order.completion_date || order.scheduled_date || order.created_at || null,
      orderNumber: order.work_order_number,
      cost: 0,
      laborHours: 0,
    }));

    return [...historyEvents, ...orderEvents].sort((a, b) => {
      const aTime = new Date(a.date || 0).getTime();
      const bTime = new Date(b.date || 0).getTime();
      return bTime - aTime;
    });
  }, [assetOrders, history]);

  const referenceGroups = useMemo(() => {
    if (!referenceSheet?.components?.length) return [];

    return referenceSheet.components.map((component) => {
      const faults = component.faults || [];
      return {
        component: component.name,
        code: component.code,
        level: component.level,
        criticality: component.criticality,
        description: component.description,
        faults,
      };
    });
  }, [referenceSheet]);

  const causeGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        cause: string;
        count: number;
        lastDate: string | null;
        statuses: Set<string>;
        priorities: Set<string>;
        workTypes: Set<string>;
        sampleDetails: string[];
        totalCost: number;
        totalHours: number;
        orderNumbers: string[];
      }
    >();

    combinedEvents.forEach((event) => {
      const key = normalizeText(event.cause || 'sin causa registrada');
      const current = map.get(key) || {
        cause: event.cause || 'Sin causa registrada',
        count: 0,
        lastDate: null,
        statuses: new Set<string>(),
        priorities: new Set<string>(),
        workTypes: new Set<string>(),
        sampleDetails: [],
        totalCost: 0,
        totalHours: 0,
        orderNumbers: [],
      };

      current.count += 1;
      current.lastDate = current.lastDate && new Date(current.lastDate).getTime() > new Date(event.date || 0).getTime()
        ? current.lastDate
        : event.date || current.lastDate;
      current.statuses.add(labelStatus(event.status));
      current.priorities.add(labelPriority(event.priority));
      current.workTypes.add(labelWorkType(event.workType));
      current.totalCost += event.cost;
      current.totalHours += event.laborHours;
      if (event.details && current.sampleDetails.length < 3) {
        current.sampleDetails.push(event.details);
      }
      if (event.orderNumber && current.orderNumbers.length < 4) {
        current.orderNumbers.push(event.orderNumber);
      }

      map.set(key, current);
    });

    return Array.from(map.values()).sort((a, b) => b.count - a.count || new Date(b.lastDate || 0).getTime() - new Date(a.lastDate || 0).getTime());
  }, [combinedEvents]);

  const openOrders = assetOrders.filter((order) => ['open', 'assigned', 'in_progress'].includes(normalizeText(order.status)));
  const criticalOrders = assetOrders.filter((order) => ['critical', 'critico', 'critica', 'high', 'alta'].includes(normalizeText(order.priority)));
  const totalCost = history.reduce((sum, item) => sum + Number(item.parts_cost || 0) + Number(item.labor_cost || 0), 0);
  const totalHours = history.reduce((sum, item) => sum + Number(item.labor_hours || 0), 0);
  const resolvedScope = scope || (pathname.includes('/mantenimiento/equipos/') ? 'equipos' : 'vehiculos');
  const backHref = resolvedScope === 'equipos' ? '/dashboard/mantenimiento/equipos' : '/dashboard/mantenimiento/vehiculos';
  const preventiveActionHref = `/dashboard/work-orders/create?assetId=${assetId}&workType=preventive`;

  if (historyLoading || ordersLoading) {
    return <div className="text-sm text-muted-foreground">Cargando arbol de fallas...</div>;
  }

  if (historyError || workOrderError || technicalSheetError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        No se pudo cargar el arbol de fallas real del activo.
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
        <Button variant="outline" onClick={() => router.push(backHref)}>
          Volver a {resolvedScope === 'equipos' ? 'equipos' : 'vehiculos'}
        </Button>
      </div>
    );
  }

  const assetDetailHref =
    resolvedScope === 'equipos' ? '/dashboard/mantenimiento/equipos' : `/dashboard/mantenimiento/vehiculos/${asset.id}/ficha`;
  const assetDetailLabel = resolvedScope === 'equipos' ? 'Volver a equipos' : 'Ficha completa';
  const secondaryActionHref =
    resolvedScope === 'equipos' ? '/dashboard/mantenimiento/equipos' : `/dashboard/mantenimiento/vehiculos/${asset.id}/qr`;
  const secondaryActionLabel = resolvedScope === 'equipos' ? 'Lista de equipos' : 'Tarjeta QR';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Arbol de fallas</h1>
          <p className="mt-2 text-muted-foreground">
            Analisis real de causas, eventos y acciones del activo {asset.asset_name || asset.asset_code || 'seleccionado'}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {preventiveAlerts.length > 0 ? (
            <Button asChild className="gap-2">
              <Link
                href={`${preventiveActionHref}&title=${encodeURIComponent(preventiveAlerts[0]?.title || `Preventivo ${asset.asset_name || asset.asset_code || ''}`)}`}
              >
                <CalendarClock className="h-4 w-4" />
                Crear OT preventiva
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="outline" className="gap-2">
            <Link href={assetDetailHref}>
              {assetDetailLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href={secondaryActionHref}>
              {secondaryActionLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild className="gap-2">
            <Link href={`/dashboard/work-orders/create?assetId=${asset.id}`}>
              <Wrench className="h-4 w-4" />
              Crear OT
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Eventos analizados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{combinedEvents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Causas unicas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{causeGroups.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">OT activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{openOrders.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Costo acumulado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${Number(totalCost).toLocaleString('es-CL')}</div>
            <p className="text-xs text-muted-foreground">{totalHours.toFixed(1)} horas registradas</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/90">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="h-5 w-5" />
            Jerarquia de causas
          </CardTitle>
          <CardDescription>
            Cada bloque agrupa mantenciones y OT bajo la causa mas repetida encontrada en el historial real.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {causeGroups.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
              No hay suficientes eventos para construir un arbol de fallas todavia.
            </div>
          ) : (
            <div className="space-y-4">
              {causeGroups.map((group) => (
                <div key={group.cause} className="rounded-lg border border-border bg-background p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold">{group.cause}</h3>
                        <Badge variant="secondary">{group.count} eventos</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Ultimo evento: {formatDate(group.lastDate)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {Array.from(group.statuses).slice(0, 2).map((status) => (
                        <Badge key={status} variant="outline">
                          {status}
                        </Badge>
                      ))}
                      {Array.from(group.priorities).slice(0, 2).map((priority) => (
                        <Badge key={priority} variant="outline">
                          {priority}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-md border border-border p-3">
                      <p className="text-xs text-muted-foreground">Tipos de trabajo</p>
                      <p className="mt-1 font-medium">{Array.from(group.workTypes).join(', ') || 'Sin tipo'}</p>
                    </div>
                    <div className="rounded-md border border-border p-3">
                      <p className="text-xs text-muted-foreground">Horas asociadas</p>
                      <p className="mt-1 font-medium">{group.totalHours.toFixed(1)} h</p>
                    </div>
                    <div className="rounded-md border border-border p-3">
                      <p className="text-xs text-muted-foreground">Costo asociado</p>
                      <p className="mt-1 font-medium">${Number(group.totalCost).toLocaleString('es-CL')}</p>
                    </div>
                  </div>

                  {group.sampleDetails.length > 0 ? (
                    <div className="mt-4 rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide">Detalle observado</p>
                      <p>{group.sampleDetails.join(' | ')}</p>
                    </div>
                  ) : null}

                  {group.orderNumbers.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {group.orderNumbers.map((orderNumber) => (
                        <Badge key={orderNumber} variant="outline">
                          {orderNumber}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {referenceGroups.length > 0 ? (
        <Card className="border-border/70 bg-card/90">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Route className="h-5 w-5" />
              Base tecnica de referencia
            </CardTitle>
            <CardDescription>
              La ficha tecnica oficial aporta una base de componentes y fallas para este activo, aun cuando el historial real sea corto.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {referenceSheet?.summary ? <p className="text-sm text-muted-foreground">{referenceSheet.summary}</p> : null}
            {referenceGroups.map((component) => (
              <div key={component.code} className="rounded-lg border border-border bg-background p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold">{component.component}</h3>
                      <Badge variant="secondary">Nivel {component.level}</Badge>
                      <Badge variant="outline">{component.criticality}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{component.description}</p>
                  </div>
                  <Badge variant="outline">{component.faults.length} fallas</Badge>
                </div>
                <div className="mt-3 space-y-2">
                  {component.faults.map((fault) => (
                    <div key={fault.code} className="rounded-md bg-muted/40 p-3 text-sm">
                      <p className="font-semibold">{fault.name}</p>
                      <p className="text-muted-foreground">{fault.symptom}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Causa: {fault.cause}</p>
                      <p className="text-xs text-muted-foreground">Efecto: {fault.effect}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Accion: {fault.recommendedAction}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {preventiveAlerts.length > 0 ? (
        <Card className="border-border/70 bg-card/90">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              Alertas preventivas sugeridas
            </CardTitle>
            <CardDescription>
              Estas alertas salen de la ficha tecnica de referencia y se pueden convertir en OT preventivas sin salir de la vista.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {preventiveAlerts.slice(0, 6).map((alert) => (
              <div key={alert.code} className="rounded-lg border border-border bg-background p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold">{alert.title}</h3>
                      <Badge variant="secondary">{alert.priority}</Badge>
                      <Badge variant="outline">{alert.componentName}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{alert.symptom}</p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`${preventiveActionHref}&title=${encodeURIComponent(alert.title)}`}>Crear OT</Link>
                  </Button>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div className="rounded-md bg-muted/40 p-3 text-sm">
                    <p className="text-xs text-muted-foreground">Causa</p>
                    <p className="mt-1">{alert.cause}</p>
                  </div>
                  <div className="rounded-md bg-muted/40 p-3 text-sm">
                    <p className="text-xs text-muted-foreground">Efecto</p>
                    <p className="mt-1">{alert.effect}</p>
                  </div>
                  <div className="rounded-md bg-muted/40 p-3 text-sm">
                    <p className="text-xs text-muted-foreground">Accion</p>
                    <p className="mt-1">{alert.recommendedAction}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-border/70 bg-card/90">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Linea de tiempo reciente
          </CardTitle>
          <CardDescription>Eventos combinados de historial y ordenes reales del activo.</CardDescription>
        </CardHeader>
        <CardContent>
          {combinedEvents.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
              No hay eventos suficientes para mostrar una linea de tiempo.
            </div>
          ) : (
            <div className="space-y-3">
              {combinedEvents.slice(0, 8).map((event) => (
                <div key={event.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{event.orderNumber || event.source}</p>
                        <Badge variant="outline">{labelStatus(event.status)}</Badge>
                        <Badge variant="outline">{labelPriority(event.priority)}</Badge>
                        <Badge variant="outline">{labelWorkType(event.workType)}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{event.cause}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{formatDate(event.date)}</p>
                  </div>
                  <p className="mt-3 text-sm">{event.details}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Fuente: {event.source}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Activity className="h-4 w-4" />
        Esta vista usa historial, OT y causa raiz reales. Si faltan causas, la base todavia no las trae.
      </div>
    </div>
  );
}
