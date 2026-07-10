'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import useSWR from 'swr';
import { AlertCircle, ArrowRight, Fuel, Layers3, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FuelInventoryItem {
  id: string;
  name?: string | null;
  sku?: string | null;
  quantity?: number | string | null;
  unit_cost?: number | string | null;
  min_stock?: number | string | null;
}

interface FuelInventoryResponse {
  inventory?: FuelInventoryItem[];
}

const fetcher = async (url: string): Promise<FuelInventoryResponse> => {
  const response = await fetch(url, { credentials: 'include' });
  return response.json();
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatNumber(value: number) {
  return Number(value || 0).toLocaleString('es-CL');
}

export function MaintenanceFuelBoard() {
  const { data, error, isLoading, mutate } = useSWR<FuelInventoryResponse>('/api/bodega/inventory?category=Combustible&pageSize=100', fetcher);

  const fuelItems: FuelInventoryItem[] = Array.isArray(data?.inventory) ? data.inventory : [];

  const summary = useMemo(() => {
    const totalQuantity = fuelItems.reduce((sum: number, item: FuelInventoryItem) => sum + Number(item.quantity || 0), 0);
    const totalValue = fuelItems.reduce((sum: number, item: FuelInventoryItem) => sum + Number(item.quantity || 0) * Number(item.unit_cost || 0), 0);
    const lowStock = fuelItems.filter((item: FuelInventoryItem) => Number(item.quantity || 0) <= Number(item.min_stock || 0)).length;

    return {
      totalItems: fuelItems.length,
      totalQuantity,
      totalValue,
      lowStock,
    };
  }, [fuelItems]);

  const topItems = [...fuelItems]
    .sort((a: FuelInventoryItem, b: FuelInventoryItem) => Number(b.quantity || 0) - Number(a.quantity || 0))
    .slice(0, 6);

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        No fue posible cargar el combustible real desde bodega.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Combustible</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Resumen real del stock de combustible que vive en bodega y sirve de soporte al plan de mantenimiento.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void mutate()} className="gap-2" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Recargar
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard/bodega">
              Ir a bodega
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild className="gap-2">
            <Link href="/dashboard/inventario">
              Ver inventario
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Fuel className="h-4 w-4 text-primary" />
              Ítems
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatNumber(summary.totalItems)}</div>
            <p className="text-xs text-muted-foreground">Registros de combustible</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Cantidad total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatNumber(summary.totalQuantity)}</div>
            <p className="text-xs text-muted-foreground">Unidades en stock</p>
          </CardContent>
        </Card>
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Bajo stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-500">{formatNumber(summary.lowStock)}</div>
            <p className="text-xs text-muted-foreground">Revisar pronto</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Valor estimado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(summary.totalValue)}</div>
            <p className="text-xs text-muted-foreground">Valor real del inventario</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers3 className="h-4 w-4 text-primary" />
            Desglose de combustible
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Cargando combustible...</div>
          ) : topItems.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              No hay ítems de combustible cargados todavía.
            </div>
          ) : (
            <div className="space-y-3">
              {topItems.map((item) => (
                <div key={item.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{item.name || item.sku || 'Combustible'}</p>
                      <p className="text-sm text-muted-foreground">{item.sku}</p>
                    </div>
                    <Badge variant={Number(item.quantity || 0) <= Number(item.min_stock || 0) ? 'destructive' : 'outline'}>
                      {Number(item.quantity || 0) <= Number(item.min_stock || 0) ? 'Bajo minimo' : 'Normal'}
                    </Badge>
                  </div>
                  <div className="mt-3 grid gap-3 text-sm md:grid-cols-4">
                    <div>
                      <p className="text-muted-foreground">Stock</p>
                      <p className="font-semibold">{formatNumber(Number(item.quantity || 0))}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Minimo</p>
                      <p className="font-semibold">{formatNumber(Number(item.min_stock || 0))}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Costo unitario</p>
                      <p className="font-semibold">{formatCurrency(Number(item.unit_cost || 0))}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Valor total</p>
                      <p className="font-semibold">{formatCurrency(Number(item.quantity || 0) * Number(item.unit_cost || 0))}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Accesos relacionados</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <Button asChild variant="outline" className="justify-between">
            <Link href="/dashboard/mantenimiento/costos">
              Costo por equipo
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
            <Link href="/dashboard/mantenimiento/personal">
              Personal mantención
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
