'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertCircle, CheckCircle2, PackageSearch, RefreshCw, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la información');
  return payload;
};

type StockItem = {
  id: string;
  part_code: string;
  part_name: string;
  quantity_on_hand?: number;
  quantity_reserved?: number;
  quantity_available?: number;
  reorder_level?: number;
  unit_cost?: number;
  bin?: {
    bin_code?: string;
    bin_location?: string;
  } | null;
};

type DeliveredPart = {
  id: string;
  quantity: number;
  quantity_issued?: number;
  quantity_installed?: number;
  quantity_returned?: number;
  unit_cost?: number;
  total_cost?: number;
  status?: string;
  part?: {
    id?: string;
    part_code?: string;
    product_code?: string;
    part_name?: string;
    name?: string;
    unit_cost?: number;
  };
};

type MovementRow = {
  id: string;
  movement_type?: string;
  quantity?: number;
  total_cost?: number;
  notes?: string;
  created_at?: string;
  stock?: {
    part_code?: string;
    part_name?: string;
  };
};

type PartTotals = {
  issued?: number;
  installed?: number;
  returned?: number;
  cost?: number;
};

function money(value: number) {
  return `$${Number(value || 0).toLocaleString('es-CL')}`;
}

function movementLabel(value?: string) {
  const labels: Record<string, string> = {
    issue: 'Entregado a mantenimiento',
    issued: 'Entregado a mantenimiento',
    receipt: 'Recibido en bodega',
    receive: 'Recibido en bodega',
    return: 'Devuelto a bodega',
    adjustment: 'Ajuste de inventario',
    transfer: 'Traslado interno',
  };
  return labels[String(value || '').toLowerCase()] || 'Movimiento de inventario';
}

export function WorkOrderPartsPanel({ workOrderId }: { workOrderId: string }) {
  const [query, setQuery] = useState('');
  const [selectedPartId, setSelectedPartId] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: stockData, error: stockError, isLoading: stockLoading, mutate: mutateStock } = useSWR(
    '/api/warehouse/stock',
    fetcher,
  );
  const {
    data: deliveryData,
    error: deliveryError,
    isLoading: deliveryLoading,
    mutate: mutateDeliveries,
  } = useSWR(workOrderId ? `/api/maintenance/work-orders/${workOrderId}/reserve-parts` : null, fetcher);

  const stockItems = Array.isArray(stockData?.stock) ? (stockData.stock as StockItem[]) : [];
  const deliveredParts = Array.isArray(deliveryData?.reservedParts)
    ? (deliveryData.reservedParts as DeliveredPart[])
    : [];
  const movements = Array.isArray(deliveryData?.movements) ? (deliveryData.movements as MovementRow[]) : [];
  const totals = (deliveryData?.totals || {}) as PartTotals;

  const filteredStock = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return stockItems;
    return stockItems.filter((item) =>
      [item.part_code, item.part_name, item.bin?.bin_code, item.bin?.bin_location]
        .map((value) => String(value || '').toLowerCase())
        .join(' ')
        .includes(term),
    );
  }, [query, stockItems]);

  const selectedPart = stockItems.find((item) => item.id === selectedPartId);
  const selectedAvailable = Number(
    selectedPart?.quantity_available ??
      Math.max(0, Number(selectedPart?.quantity_on_hand || 0) - Number(selectedPart?.quantity_reserved || 0)),
  );

  const refreshAll = async () => {
    await Promise.all([mutateStock(), mutateDeliveries()]);
  };

  const handleDeliver = async () => {
    if (!selectedPartId || !Number.isInteger(quantity) || quantity <= 0) {
      setErrorMessage('Selecciona un repuesto y una cantidad entera mayor que cero.');
      return;
    }
    if (quantity > selectedAvailable) {
      setErrorMessage(`Solo hay ${selectedAvailable} unidades disponibles.`);
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/maintenance/work-orders/${workOrderId}/reserve-parts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ partId: selectedPartId, quantity }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No se pudo entregar el repuesto');

      setSelectedPartId('');
      setQuantity(1);
      await refreshAll();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo entregar el repuesto');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmInstallation = async (part: DeliveredPart) => {
    const issued = Number(part.quantity_issued || part.quantity || 0);
    const installed = Number(part.quantity_installed || 0);
    const returned = Number(part.quantity_returned || 0);
    const pending = Math.max(0, issued - installed - returned);
    if (pending <= 0) return;

    setInstallingId(part.id);
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/maintenance/work-orders/${workOrderId}/reserve-parts`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ partRecordId: part.id, quantity: pending }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No se pudo confirmar la instalación');
      await mutateDeliveries();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo confirmar la instalación');
    } finally {
      setInstallingId(null);
    }
  };

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PackageSearch className="h-4 w-4" />
          Repuestos utilizados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Entregados</p>
            <p className="mt-1 text-xl font-semibold">{Number(totals.issued || 0)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Instalados</p>
            <p className="mt-1 text-xl font-semibold">{Number(totals.installed || 0)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Pendientes de confirmar</p>
            <p className="mt-1 text-xl font-semibold">
              {Math.max(0, Number(totals.issued || 0) - Number(totals.installed || 0) - Number(totals.returned || 0))}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Costo de repuestos</p>
            <p className="mt-1 text-xl font-semibold">{money(Number(totals.cost || 0))}</p>
          </div>
        </div>

        <section className="space-y-4 rounded-lg border p-4">
          <div>
            <h3 className="font-medium">Entregar desde bodega</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Esta acción descuenta inventario y deja el repuesto asociado a esta orden.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`part-search-${workOrderId}`}>Buscar repuesto</Label>
              <Input
                id={`part-search-${workOrderId}`}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Código, nombre o ubicación"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`part-quantity-${workOrderId}`}>Cantidad a entregar</Label>
              <Input
                id={`part-quantity-${workOrderId}`}
                type="number"
                min={1}
                step={1}
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value || 1))}
              />
            </div>
          </div>

          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {stockLoading ? (
              <div className="text-sm text-muted-foreground">Cargando existencias…</div>
            ) : stockError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                No se pudieron cargar las existencias.
              </div>
            ) : filteredStock.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                <Search className="h-4 w-4" />
                No hay repuestos con ese filtro.
              </div>
            ) : (
              filteredStock.map((item) => {
                const available = Number(
                  item.quantity_available ??
                    Math.max(0, Number(item.quantity_on_hand || 0) - Number(item.quantity_reserved || 0)),
                );
                const lowStock = available <= Number(item.reorder_level || 0);
                const isSelected = selectedPartId === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedPartId(item.id)}
                    disabled={available <= 0}
                    className={`w-full rounded-lg border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{item.part_name}</span>
                          <Badge variant="outline">{item.part_code}</Badge>
                          {available <= 0 ? (
                            <Badge variant="outline">Sin existencias</Badge>
                          ) : lowStock ? (
                            <Badge variant="destructive">Reponer</Badge>
                          ) : (
                            <Badge variant="secondary">Disponible</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.bin?.bin_code || 'Sin ubicación'}
                          {item.bin?.bin_location ? ` · ${item.bin.bin_location}` : ''}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm md:min-w-64">
                        <div>
                          <p className="text-xs text-muted-foreground">Disponible</p>
                          <p className="font-medium">{available}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Costo unitario</p>
                          <p className="font-medium">{money(Number(item.unit_cost || 0))}</p>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleDeliver} disabled={submitting || !selectedPartId || quantity <= 0}>
              {submitting ? 'Entregando…' : 'Entregar a la orden'}
            </Button>
            <Button variant="outline" onClick={() => void refreshAll()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </Button>
            {selectedPart ? (
              <span className="text-sm text-muted-foreground">
                {selectedPart.part_name} · {selectedAvailable} disponibles
              </span>
            ) : null}
          </div>
        </section>

        {errorMessage ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Entregados a esta orden</h3>
            {deliveryLoading ? <span className="text-xs text-muted-foreground">Cargando…</span> : null}
          </div>

          {deliveryError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              No se pudo cargar la trazabilidad de repuestos.
            </div>
          ) : deliveredParts.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              Aún no hay repuestos entregados a esta orden.
            </div>
          ) : (
            <div className="space-y-2">
              {deliveredParts.map((part) => {
                const issued = Number(part.quantity_issued || part.quantity || 0);
                const installed = Number(part.quantity_installed || 0);
                const returned = Number(part.quantity_returned || 0);
                const pending = Math.max(0, issued - installed - returned);
                const name = part.part?.part_name || part.part?.name || 'Repuesto';
                const code = part.part?.part_code || part.part?.product_code || 'Sin código';

                return (
                  <div key={part.id} className="rounded-lg border p-4 text-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{name}</p>
                          <Badge variant="outline">{code}</Badge>
                          {pending === 0 ? (
                            <Badge variant="secondary">Instalación confirmada</Badge>
                          ) : (
                            <Badge variant="outline">Pendiente de instalación</Badge>
                          )}
                        </div>
                        <p className="mt-2 text-muted-foreground">
                          Entregado: {issued} · Instalado: {installed}
                          {returned > 0 ? ` · Devuelto: ${returned}` : ''}
                        </p>
                        <p className="mt-1 text-muted-foreground">Costo: {money(Number(part.total_cost || 0))}</p>
                      </div>
                      {pending > 0 ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void confirmInstallation(part)}
                          disabled={installingId === part.id}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          {installingId === part.id ? 'Confirmando…' : `Confirmar ${pending} instalados`}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Movimientos relacionados</h3>
          {movements.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              Todavía no hay movimientos de inventario para esta orden.
            </div>
          ) : (
            <div className="space-y-2">
              {movements.map((movement) => (
                <div key={movement.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-medium">
                        {movement.stock?.part_name || 'Repuesto'}
                        {movement.stock?.part_code ? ` · ${movement.stock.part_code}` : ''}
                      </p>
                      <p className="text-muted-foreground">
                        {movementLabel(movement.movement_type)}
                        {movement.notes ? ` · ${movement.notes}` : ''}
                      </p>
                    </div>
                    <div className="md:text-right">
                      <Badge variant="outline">
                        {movement.quantity ? `${movement.quantity > 0 ? '+' : ''}${movement.quantity}` : '0'}
                      </Badge>
                      {Number(movement.total_cost || 0) > 0 ? (
                        <p className="mt-1 text-xs text-muted-foreground">{money(Number(movement.total_cost || 0))}</p>
                      ) : null}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {movement.created_at ? new Date(movement.created_at).toLocaleString('es-CL') : 'Sin fecha'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
