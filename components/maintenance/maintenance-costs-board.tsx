'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { AlertCircle, ArrowRight, DollarSign, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

function money(value: number) {
  return `$${Number(value || 0).toLocaleString('es-CL')}`;
}

export function MaintenanceCostsBoard() {
  const { data, error, isLoading, mutate } = useSWR('/api/maintenance/costs', fetcher);

  const summary = data?.summary || { totalCost: 0, totalWorkOrders: 0, totalRecords: 0, assets: 0, averageCostPerAsset: 0 };
  const assetCosts = Array.isArray(data?.assetCosts) ? data.assetCosts : [];
  const monthlyCosts = Array.isArray(data?.monthlyCosts) ? data.monthlyCosts : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Costo por equipo</h1>
          <p className="mt-2 text-muted-foreground">Costos reales acumulados por equipo, repuestos y mano de obra.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void mutate()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Recargar
          </Button>
          <Button asChild className="gap-2">
            <Link href="/dashboard/mantenimiento/indicadores">
              <DollarSign className="h-4 w-4" />
              Ver indicadores
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Costo total</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{money(summary.totalCost)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Equipos con costo</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summary.assets}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">OT con costo</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summary.totalWorkOrders}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Promedio por equipo</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{money(summary.averageCostPerAsset)}</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Equipos mas costosos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Cargando costos...</div>
            ) : error ? (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                No fue posible calcular el costo por equipo.
              </div>
            ) : assetCosts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                No hay costos registrados todavia.
              </div>
            ) : (
              assetCosts.slice(0, 8).map((asset: any) => (
                <div key={asset.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{asset.assetName}</p>
                      <p className="text-xs text-muted-foreground">{asset.assetCode || '-'}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Repuestos {money(asset.partsCost)} · Mano de obra {money(asset.laborCost)} · OT {money(asset.workOrderCost)}
                      </p>
                    </div>
                    <Badge variant="secondary">{money(asset.totalCost)}</Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Costos mensuales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {monthlyCosts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                Sin datos mensuales todavia.
              </div>
            ) : (
              monthlyCosts.map((row: any) => (
                <div key={row.month} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="font-medium">{row.month}</p>
                    <p className="text-xs text-muted-foreground">Costo acumulado del mes</p>
                  </div>
                  <Badge variant="outline">{money(row.value)}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
