'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { AlertCircle, ArrowRight, DollarSign, Download, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MaintenanceCostsSummary {
  totalCost?: number | string;
  totalWorkOrders?: number | string;
  totalRecords?: number | string;
  assets?: number | string;
  averageCostPerAsset?: number | string;
}

interface AssetCostRow {
  id: string;
  assetName: string;
  assetCode?: string | null;
  partsCost?: number | string | null;
  laborCost?: number | string | null;
  workOrderCost?: number | string | null;
  totalCost?: number | string | null;
}

interface MonthlyCostRow {
  month: string;
  value: number | string;
}

interface MaintenanceCostsResponse {
  summary?: MaintenanceCostsSummary;
  assetCosts?: AssetCostRow[];
  monthlyCosts?: MonthlyCostRow[];
}

const fetcher = async (url: string): Promise<MaintenanceCostsResponse> => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || 'No se pudo calcular el costo por equipo');
  }
  return payload;
};

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: unknown) {
  return `$${Number(value || 0).toLocaleString('es-CL')}`;
}

export function MaintenanceCostsBoard() {
  const {
    data: summaryData,
    error: summaryError,
    isLoading: summaryLoading,
    mutate: mutateSummary,
  } = useSWR<MaintenanceCostsResponse>('/api/maintenance/costs?view=summary', fetcher);
  const {
    data: detailData,
    error: detailError,
    isLoading: detailLoading,
    mutate: mutateDetails,
  } = useSWR<MaintenanceCostsResponse>(
    summaryData ? '/api/maintenance/costs?view=full' : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const summary: MaintenanceCostsSummary = detailData?.summary || summaryData?.summary || { totalCost: 0, totalWorkOrders: 0, totalRecords: 0, assets: 0, averageCostPerAsset: 0 };
  const assetCosts: AssetCostRow[] = Array.isArray(detailData?.assetCosts) ? detailData.assetCosts : [];
  const monthlyCosts: MonthlyCostRow[] = Array.isArray(detailData?.monthlyCosts) ? detailData.monthlyCosts : [];
  const error = summaryError || detailError;
  const refreshCosts = () => {
    void mutateSummary();
    void mutateDetails();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Costo por equipo</h1>
          <p className="mt-2 text-muted-foreground">Costos reales acumulados por equipo, repuestos y mano de obra.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard/mantenimiento/costos/importar">
              <Download className="h-4 w-4" />
              Importar Excel
            </Link>
          </Button>
          <Button variant="outline" onClick={refreshCosts} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Recargar
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard/mantenimiento/bitacora">
              Bitacora
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard/mantenimiento/vehiculos">
              Vehiculos y QR
              <ArrowRight className="h-4 w-4" />
            </Link>
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Costo total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryLoading ? '...' : money(summary.totalCost)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Equipos con costo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryLoading ? '...' : toNumber(summary.assets)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">OT con costo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryLoading ? '...' : toNumber(summary.totalWorkOrders)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Promedio por equipo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryLoading ? '...' : money(summary.averageCostPerAsset)}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground">Acceso rapido a mantenimiento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/mantenimiento/componentes-mayores">
                Componentes mayores
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/mantenimiento/personal">
                Personal
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/mantenimiento/bitacora">
                Bitacora
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/mantenimiento/vehiculos">
                Vehiculos y QR
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Equipos mas costosos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {detailLoading ? (
              <div className="text-sm text-muted-foreground">Cargando detalle de costos...</div>
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
              assetCosts.slice(0, 8).map((asset) => (
                <div key={asset.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{asset.assetName}</p>
                      <p className="text-xs text-muted-foreground">{asset.assetCode || '-'}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Repuestos {money(asset.partsCost)} | Mano de obra {money(asset.laborCost)} | OT {money(asset.workOrderCost)}
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
            {detailLoading ? (
              <div className="text-sm text-muted-foreground">Cargando costos mensuales...</div>
            ) : monthlyCosts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                Sin datos mensuales todavia.
              </div>
            ) : (
              monthlyCosts.map((row) => (
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
