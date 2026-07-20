'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { AlertCircle, Download, RefreshCw, ShieldCheck, Truck } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { tireConditionLabel, tireLifecycleLabel } from '@/lib/maintenance/tire-traceability';

type TireStockItem = {
  id: string;
  partName?: string | null;
  partCode?: string | null;
  lowStock?: boolean | null;
  binCode?: string | null;
  binLocation?: string | null;
  quantityAvailable?: number | string | null;
  quantityReserved?: number | string | null;
  unitCost?: number | string | null;
  totalValue?: number | string | null;
};

type TireTraceabilityItem = {
  id: string;
  tireCode?: string | null;
  tireName?: string | null;
  condition?: 'new' | 'used' | null;
  conditionLabel?: string | null;
  lifecycleStatus?: string | null;
  lifecycleLabel?: string | null;
  size?: string | null;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  purchaseOrderNumber?: string | null;
  installedAt?: string | null;
  removedAt?: string | null;
};

type TireEventItem = {
  id: string;
  eventType?: string | null;
  eventLabel?: string | null;
  eventDate?: string | null;
  tireCode?: string | null;
  tireName?: string | null;
  tireCondition?: 'new' | 'used' | null;
  lifecycleStatus?: string | null;
  purchaseOrderNumber?: string | null;
  workOrderNumber?: string | null;
  assetCode?: string | null;
  assetName?: string | null;
};

type TireSummary = {
  totalItems?: number | string;
  lowStock?: number | string;
  totalQuantity?: number | string;
  totalValue?: number | string;
};

type TireTraceabilitySummary = {
  totalTires?: number | string;
  newTires?: number | string;
  usedTires?: number | string;
  installed?: number | string;
  inStock?: number | string;
  replaced?: number | string;
  retired?: number | string;
};

type NeumaticosResponse = {
  items?: TireStockItem[];
  summary?: TireSummary;
  traceability?: {
    summary?: TireTraceabilitySummary;
    tires?: TireTraceabilityItem[];
    events?: TireEventItem[];
  };
};

type WorkOrdersResponse = {
  workOrders?: Array<{
    id: string;
    work_order_number?: string | null;
    title?: string | null;
    status?: string | null;
  }>;
};

type PurchaseOrdersResponse = {
  orders?: Array<{
    id: string;
    po_number?: string | null;
    vendor_name?: string | null;
    item_code?: string | null;
    status?: string | null;
  }>;
};

const fetcher = async (url: string): Promise<NeumaticosResponse> => {
  const response = await fetch(url, { credentials: 'include' });
  return response.json();
};

const fetchWorkOrders = async (url: string): Promise<WorkOrdersResponse> => {
  const response = await fetch(url, { credentials: 'include' });
  return response.json();
};

const fetchPurchaseOrders = async (url: string): Promise<PurchaseOrdersResponse> => {
  const response = await fetch(url, { credentials: 'include' });
  return response.json();
};

function money(value: unknown) {
  return `$${Number(value || 0).toLocaleString('es-CL')}`;
}

function number(value: unknown) {
  return Number(value || 0).toLocaleString('es-CL');
}

export function NeumaticosBoard() {
  const { data, error, isLoading, mutate } = useSWR<NeumaticosResponse>('/api/maintenance/neumaticos', fetcher);
  const { data: workOrdersData } = useSWR<WorkOrdersResponse>('/api/maintenance/work-orders?pageSize=100', fetchWorkOrders);
  const { data: purchaseOrdersData } = useSWR<PurchaseOrdersResponse>('/api/compras/purchase-orders?pageSize=100', fetchPurchaseOrders);
  const [eventForm, setEventForm] = useState({
    tireCode: '',
    tireName: '',
    condition: 'used',
    eventType: 'adjusted',
    purchaseOrderNumber: '',
    workOrderNumber: '',
    notes: '',
  });
  const [savingEvent, setSavingEvent] = useState(false);
  const [eventMessage, setEventMessage] = useState<string | null>(null);

  const items: TireStockItem[] = Array.isArray(data?.items) ? data.items : [];
  const summary: TireSummary = data?.summary || { totalItems: 0, lowStock: 0, totalQuantity: 0, totalValue: 0 };
  const traceabilitySummary: TireTraceabilitySummary = data?.traceability?.summary || {
    totalTires: 0,
    newTires: 0,
    usedTires: 0,
    installed: 0,
    inStock: 0,
    replaced: 0,
    retired: 0,
  };
  const tireTraceability = Array.isArray(data?.traceability?.tires) ? data.traceability.tires : [];
  const tireEvents = Array.isArray(data?.traceability?.events) ? data.traceability.events : [];
  const workOrders = Array.isArray(workOrdersData?.workOrders) ? workOrdersData.workOrders : [];
  const purchaseOrders = Array.isArray(purchaseOrdersData?.orders) ? purchaseOrdersData.orders : [];

  const submitEvent = async () => {
    if (!eventForm.tireCode.trim()) {
      setEventMessage('Debes ingresar un código de neumático.');
      return;
    }

    setSavingEvent(true);
    setEventMessage(null);

    try {
      const response = await fetch('/api/maintenance/neumaticos', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tireCode: eventForm.tireCode.trim(),
          tireName: eventForm.tireName.trim() || eventForm.tireCode.trim(),
          tireCondition: eventForm.condition,
          eventType: eventForm.eventType,
          purchaseOrderNumber: eventForm.purchaseOrderNumber.trim() || null,
          workOrderNumber: eventForm.workOrderNumber.trim() || null,
          notes: eventForm.notes.trim() || null,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo registrar el evento');
      }

      setEventMessage('Evento registrado correctamente.');
      setEventForm((current) => ({ ...current, notes: '' }));
      await mutate();
    } catch (error) {
      setEventMessage(error instanceof Error ? error.message : 'No se pudo registrar el evento');
    } finally {
      setSavingEvent(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de neumáticos</h1>
          <p className="mt-2 text-muted-foreground">
            Stock real, condición de uso y trazabilidad por compra, OT, instalación y reposición.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard/mantenimiento/neumaticos/importar">
              <Download className="h-4 w-4" />
              Importar Excel
            </Link>
          </Button>
          <Button variant="outline" onClick={() => void mutate()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Recargar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalItems || 0}</div>
            <p className="text-xs text-muted-foreground">Detectados en bodega</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Bajo stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{summary.lowStock || 0}</div>
            <p className="text-xs text-muted-foreground">Revisar pronto</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Cantidad total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalQuantity || 0}</div>
            <p className="text-xs text-muted-foreground">Unidades en stock</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Valor total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{money(summary.totalValue)}</div>
            <p className="text-xs text-muted-foreground">Valorización estimada</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registrar trazabilidad</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="tire-code">Código de neumático</Label>
            <Input
              id="tire-code"
              list="tire-codes"
              value={eventForm.tireCode}
              onChange={(event) => setEventForm((current) => ({ ...current, tireCode: event.target.value }))}
              placeholder="NEU-001"
            />
            <datalist id="tire-codes">
              {tireTraceability.map((tire) => (
                <option key={tire.id} value={tire.tireCode || ''}>
                  {tire.tireName || tire.tireCode}
                </option>
              ))}
            </datalist>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tire-name">Nombre</Label>
            <Input
              id="tire-name"
              value={eventForm.tireName}
              onChange={(event) => setEventForm((current) => ({ ...current, tireName: event.target.value }))}
              placeholder="Neumático 18.00R25"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-type">Evento</Label>
            <Input
              id="event-type"
              list="event-types"
              value={eventForm.eventType}
              onChange={(event) => setEventForm((current) => ({ ...current, eventType: event.target.value }))}
              placeholder="installed"
            />
            <datalist id="event-types">
              {['purchase_order', 'received', 'installed', 'removed', 'replaced', 'repositioned', 'repaired', 'returned', 'retired', 'adjusted'].map((value) => (
                <option key={value} value={value} />
              ))}
            </datalist>
          </div>
          <div className="space-y-2">
            <Label htmlFor="condition">Condición</Label>
            <Input
              id="condition"
              list="conditions"
              value={eventForm.condition}
              onChange={(event) => setEventForm((current) => ({ ...current, condition: event.target.value }))}
              placeholder="used"
            />
            <datalist id="conditions">
              <option value="new" />
              <option value="used" />
            </datalist>
          </div>
          <div className="space-y-2">
            <Label htmlFor="purchase-order">Orden de compra</Label>
            <Input
              id="purchase-order"
              list="purchase-orders"
              value={eventForm.purchaseOrderNumber}
              onChange={(event) => setEventForm((current) => ({ ...current, purchaseOrderNumber: event.target.value }))}
              placeholder="PO-2026-0001"
            />
            <datalist id="purchase-orders">
              {purchaseOrders.map((order) => (
                <option key={order.id} value={order.po_number || ''}>
                  {order.vendor_name || order.item_code || order.po_number}
                </option>
              ))}
            </datalist>
          </div>
          <div className="space-y-2">
            <Label htmlFor="work-order">Orden de trabajo</Label>
            <Input
              id="work-order"
              list="work-orders"
              value={eventForm.workOrderNumber}
              onChange={(event) => setEventForm((current) => ({ ...current, workOrderNumber: event.target.value }))}
              placeholder="WO-2026-0001"
            />
            <datalist id="work-orders">
              {workOrders.map((order) => (
                <option key={order.id} value={order.work_order_number || ''}>
                  {order.title || order.work_order_number}
                </option>
              ))}
            </datalist>
          </div>
          <div className="space-y-2 md:col-span-2 xl:col-span-3">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={eventForm.notes}
              onChange={(event) => setEventForm((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Instalado en equipo / retirado para reposición / observaciones"
            />
          </div>
          <div className="md:col-span-2 xl:col-span-3 flex flex-wrap items-center gap-3">
            <Button onClick={submitEvent} disabled={savingEvent} className="gap-2">
              {savingEvent ? 'Guardando...' : 'Guardar evento'}
            </Button>
            {eventMessage ? <p className="text-sm text-muted-foreground">{eventMessage}</p> : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Neumáticos nuevos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">{number(traceabilitySummary.newTires)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Neumáticos usados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{number(traceabilitySummary.usedTires)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Instalados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-sky-500">{number(traceabilitySummary.installed)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">En reposición</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{number(traceabilitySummary.replaced)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Detalle de neumáticos en bodega
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Cargando neumáticos...</div>
          ) : error ? (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              No fue posible cargar la gestión de neumáticos.
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              No hay neumáticos detectados en la base real.
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{item.partName}</p>
                      <Badge variant="outline">{item.partCode}</Badge>
                      {item.lowStock ? <Badge variant="destructive">Bajo stock</Badge> : <Badge variant="secondary">Ok</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {item.binCode || 'Sin bin'}
                      {item.binLocation ? ` · ${item.binLocation}` : ''}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm md:min-w-80">
                    <div>
                      <p className="text-xs text-muted-foreground">Disponible</p>
                      <p className="font-medium">{Number(item.quantityAvailable || 0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Reservado</p>
                      <p className="font-medium">{Number(item.quantityReserved || 0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Costo unitario</p>
                      <p className="font-medium">{money(item.unitCost)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Valor</p>
                      <p className="font-medium">{money(item.totalValue)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Trazabilidad por neumatico
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tireTraceability.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                Aún no hay neumáticos trazados con registro de condición y ciclo de vida.
              </div>
            ) : (
              tireTraceability.map((tire) => (
                <div key={tire.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{tire.tireName}</p>
                    <Badge variant="outline">{tire.tireCode}</Badge>
                    <Badge variant={tire.condition === 'new' ? 'secondary' : 'outline'}>
                      {tire.conditionLabel || tireConditionLabel(tire.condition || 'used')}
                    </Badge>
                    <Badge variant="default">{tire.lifecycleLabel || tireLifecycleLabel(tire.lifecycleStatus || 'in_stock')}</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-muted-foreground md:grid-cols-2">
                    <p>Medida: {tire.size || 'Sin medida'}</p>
                    <p>Marca: {tire.brand || 'Sin marca'}</p>
                    <p>Modelo: {tire.model || 'Sin modelo'}</p>
                    <p>Serie: {tire.serialNumber || 'Sin serie'}</p>
                    <p>OC: {tire.purchaseOrderNumber || 'Sin orden de compra'}</p>
                    <p>Instalacion: {tire.installedAt || 'Pendiente'}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Últimos eventos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tireEvents.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                No hay eventos de trazabilidad registrados aun.
              </div>
            ) : (
              tireEvents.map((event) => (
                <div key={event.id} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{event.eventLabel || event.eventType || 'Evento'}</Badge>
                    <span className="text-sm font-medium">{event.tireCode || event.tireName || 'Neumático'}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {event.eventDate || 'Sin fecha'} · {event.purchaseOrderNumber ? `OC ${event.purchaseOrderNumber}` : 'Sin OC'}
                    {event.workOrderNumber ? ` · OT ${event.workOrderNumber}` : ''}
                    {event.assetCode ? ` · Equipo ${event.assetCode}` : ''}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
