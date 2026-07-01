'use client';

import useSWR from 'swr';
import { AlertCircle, RefreshCw, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type TireItem = {
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

type TireSummary = {
  totalItems?: number | string;
  lowStock?: number | string;
  totalQuantity?: number | string;
  totalValue?: number | string;
};

type NeumaticosResponse = {
  items?: TireItem[];
  summary?: TireSummary;
};

const fetcher = async (url: string): Promise<NeumaticosResponse> => {
  const response = await fetch(url, { credentials: 'include' });
  return response.json();
};

function money(value: unknown) {
  return `$${Number(value || 0).toLocaleString('es-CL')}`;
}

export function NeumaticosBoard() {
  const { data, error, isLoading, mutate } = useSWR<NeumaticosResponse>('/api/maintenance/neumaticos', fetcher);
  const items: TireItem[] = Array.isArray(data?.items) ? data.items : [];
  const summary: TireSummary = data?.summary || { totalItems: 0, lowStock: 0, totalQuantity: 0, totalValue: 0 };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion de neumaticos</h1>
          <p className="mt-2 text-muted-foreground">Stock real de neumaticos, llantas y repuestos asociados en bodega.</p>
        </div>
        <Button variant="outline" onClick={() => void mutate()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Recargar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Items</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summary.totalItems}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Bajo stock</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-destructive">{summary.lowStock}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Cantidad total</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summary.totalQuantity}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Valor total</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{money(summary.totalValue)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Detalle de neumaticos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Cargando neumaticos...</div>
          ) : error ? (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              No fue posible cargar la gestion de neumaticos.
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              No hay neumaticos detectados en la base real.
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
                      {item.binCode || 'Sin bin'}{item.binLocation ? ` · ${item.binLocation}` : ''}
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
    </div>
  );
}
