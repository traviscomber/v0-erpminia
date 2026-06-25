'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertCircle, PackageSearch, RefreshCw, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

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

type ReservedPart = {
  id: string;
  quantity: number;
  status?: string;
  part?: {
    id?: string;
    part_code?: string;
    part_name?: string;
    unit_cost?: number;
    quantity_on_hand?: number;
    quantity_reserved?: number;
  };
};

type MovementRow = {
  id: string;
  movement_type?: string;
  quantity?: number;
  notes?: string;
  created_at?: string;
  stock?: {
    part_code?: string;
    part_name?: string;
  };
};

function money(value: number) {
  return `$${Number(value || 0).toLocaleString('es-CL')}`;
}

export function WorkOrderPartsPanel({ workOrderId }: { workOrderId: string }) {
  const [query, setQuery] = useState('');
  const [selectedPartId, setSelectedPartId] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: stockData, isLoading: stockLoading, mutate: mutateStock } = useSWR(
    '/api/warehouse/stock',
    fetcher,
  );
  const { data: reservationData, isLoading: reservationLoading, mutate: mutateReservations } = useSWR(
    workOrderId ? `/api/maintenance/work-orders/${workOrderId}/reserve-parts` : null,
    fetcher,
  );

  const stockItems = Array.isArray(stockData?.stock) ? (stockData.stock as StockItem[]) : [];
  const reservedParts = Array.isArray(reservationData?.reservedParts)
    ? (reservationData.reservedParts as ReservedPart[])
    : [];
  const movements = Array.isArray(reservationData?.movements) ? (reservationData.movements as MovementRow[]) : [];

  const filteredStock = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return stockItems;
    return stockItems.filter((item) => {
      const searchable = [
        item.part_code,
        item.part_name,
        item.bin?.bin_code,
        item.bin?.bin_location,
      ]
        .map((value) => String(value || '').toLowerCase())
        .join(' ');
      return searchable.includes(term);
    });
  }, [query, stockItems]);

  const selectedPart = stockItems.find((item) => item.id === selectedPartId);

  const handleReserve = async () => {
    if (!selectedPartId || quantity <= 0) return;
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
      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo reservar el repuesto');
      }

      setSelectedPartId('');
      setQuantity(1);
      await mutateStock();
      await mutateReservations();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo reservar el repuesto');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PackageSearch className="h-4 w-4" />
          Repuestos y bodega
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Buscar repuesto</Label>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Codigo, nombre o ubicacion"
            />
          </div>
          <div className="space-y-2">
            <Label>Cantidad a reservar</Label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value || 1))}
            />
          </div>
        </div>

        <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
          {stockLoading ? (
            <div className="text-sm text-muted-foreground">Cargando stock de bodega...</div>
          ) : filteredStock.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              <Search className="h-4 w-4" />
              No hay repuestos visibles con ese filtro.
            </div>
          ) : (
            filteredStock.map((item) => {
              const available = Number(item.quantity_available ?? Math.max(0, (item.quantity_on_hand || 0) - (item.quantity_reserved || 0)));
              const lowStock = available <= Number(item.reorder_level || 0);
              const isSelected = selectedPartId === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedPartId(item.id)}
                  className={`w-full rounded-lg border p-4 text-left transition-colors ${
                    isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
                  }`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{item.part_name}</span>
                        <Badge variant="outline">{item.part_code}</Badge>
                        {lowStock ? <Badge variant="destructive">Bajo stock</Badge> : <Badge variant="secondary">Disponible</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.bin?.bin_code || 'Sin bin'}{item.bin?.bin_location ? ` · ${item.bin.bin_location}` : ''}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm md:min-w-72">
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
          <Button onClick={handleReserve} disabled={submitting || !selectedPartId}>
            {submitting ? 'Reservando...' : 'Reservar para la OT'}
          </Button>
          <Button variant="outline" onClick={() => void mutateStock()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualizar stock
          </Button>
          {selectedPart ? (
            <span className="text-sm text-muted-foreground">
              Seleccionado: {selectedPart.part_name} - {selectedPart.part_code}
            </span>
          ) : null}
        </div>

        {errorMessage ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Repuestos reservados</h3>
            {reservationLoading ? <span className="text-xs text-muted-foreground">Cargando...</span> : null}
          </div>

          {reservedParts.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              Aun no hay repuestos reservados para esta OT.
            </div>
          ) : (
            <div className="space-y-2">
              {reservedParts.map((part) => (
                <div key={part.id} className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{part.part?.part_name || 'Repuesto'}</p>
                      <p className="text-muted-foreground">{part.part?.part_code || '-'}</p>
                    </div>
                    <Badge variant="outline">{part.quantity} un</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Trazabilidad de repuestos</h3>
          {movements.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              Todavia no hay movimientos de repuestos para esta OT.
            </div>
          ) : (
            <div className="space-y-2">
              {movements.map((movement) => (
                <div key={movement.id} className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-medium">
                        {movement.stock?.part_name || 'Repuesto'} {movement.stock?.part_code ? `(${movement.stock.part_code})` : ''}
                      </p>
                      <p className="text-muted-foreground">
                        {movement.movement_type || 'movimiento'} · {movement.notes || 'Sin nota'}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">
                        {movement.quantity ? `${movement.quantity > 0 ? '+' : ''}${movement.quantity}` : '0'}
                      </Badge>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {movement.created_at ? new Date(movement.created_at).toLocaleString('es-CL') : 'Sin fecha'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
