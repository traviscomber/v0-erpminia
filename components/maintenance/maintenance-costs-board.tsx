'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { AlertCircle, ArrowRight, DollarSign, Download, RefreshCw, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MaintenanceCostsSummary {
  rows?: number | string;
  totalCost?: number | string;
  matchedRows?: number | string;
  unmatchedRows?: number | string;
  assets?: number | string;
  averageCostPerAsset?: number | string;
}

interface AssetCostRow {
  id: string;
  assetName: string;
  assetCode?: string | null;
  category?: string | null;
  totalCost?: number | string | null;
  rows?: number | string | null;
  lastDate?: string | null;
}

interface CategoryCostRow {
  category: string;
  totalCost: number | string;
  rows: number | string;
}

interface MonthlyCostRow {
  month: string;
  value: number | string;
}

interface MaintenanceCostsResponse {
  summary?: MaintenanceCostsSummary;
  assetCosts?: AssetCostRow[];
  categoryCosts?: CategoryCostRow[];
  monthlyCosts?: MonthlyCostRow[];
}

const fetcher = async (url: string): Promise<MaintenanceCostsResponse> => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || 'No se pudo leer el ledger de costos');
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
  const [loadDetails, setLoadDetails] = useState(false);
  const {
    data: summaryData,
    error: summaryError,
    isLoading: summaryLoading,
    mutate: mutateSummary,
  } = useSWR<MaintenanceCostsResponse>('/api/maintenance/equipment-costs?view=summary', fetcher);
  const {
    data: detailData,
    error: detailError,
    isLoading: detailLoading,
    mutate: mutateDetails,
  } = useSWR<MaintenanceCostsResponse>(
    loadDetails ? '/api/maintenance/equipment-costs?view=full' : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  useEffect(() => {
    if (!summaryData || loadDetails) return;
    const timeout = window.setTimeout(() => setLoadDetails(true), 500);
    return () => window.clearTimeout(timeout);
  }, [loadDetails, summaryData]);

  const summary: MaintenanceCostsSummary = detailData?.summary || summaryData?.summary || { rows: 0, totalCost: 0, matchedRows: 0, unmatchedRows: 0, assets: 0, averageCostPerAsset: 0 };
  const assetCosts: AssetCostRow[] = Array.isArray(detailData?.assetCosts) ? detailData.assetCosts : [];
  const categoryCosts: CategoryCostRow[] = Array.isArray(detailData?.categoryCosts) ? detailData.categoryCosts : [];
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
          <p className="mt-2 text-muted-foreground">Ledger real de costos importados desde Excel y cruzados con maquinaria y centros de costo.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard/mantenimiento/costos/importar">
              <Download className="h-4 w-4" />
              Importar Excel
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard/mantenimiento/costos/equipos/importar">
              <Upload className="h-4 w-4" />
              Importar costos de equipos
            </Link>
          </Button>
          <Button variant="outline" onClick={refreshCosts} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Recargar
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard/mantenimiento/bitacora">
              Bitácora
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard/mantenimiento/vehiculos">
              Vehículos y QR
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
            <CardTitle className="text-sm">Registros importados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryLoading ? '...' : toNumber(summary.rows)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Con cruce</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryLoading ? '...' : toNumber(summary.matchedRows)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Promedio por activo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryLoading ? '...' : money(summary.averageCostPerAsset)}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground">Acceso rápido a mantenimiento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/mantenimiento/costos/equipos">
                Costos de equipos
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
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
                Bitácora
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/mantenimiento/vehiculos">
                Vehículos y QR
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Equipos más costosos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {detailLoading ? (
              <div className="text-sm text-muted-foreground">Cargando detalle de costos...</div>
            ) : error ? (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                No fue posible leer el ledger de costos.
              </div>
            ) : assetCosts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                No hay costos registrados todavía.
              </div>
            ) : (
              assetCosts.map((asset) => (
                <div key={asset.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{asset.assetName}</p>
                      <p className="text-xs text-muted-foreground">{asset.assetCode || '-'}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{asset.category || 'Sin categoria'}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Filas {toNumber(asset.rows)} | Ultima fecha {asset.lastDate || '-'}
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
            <CardTitle>Costos por categoria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {detailLoading ? (
              <div className="text-sm text-muted-foreground">Cargando costos por categoria...</div>
            ) : categoryCosts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                Sin datos por categoria todavía.
              </div>
            ) : (
              categoryCosts.map((row) => (
                <div key={row.category} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="font-medium">{row.category}</p>
                    <p className="text-xs text-muted-foreground">Costo acumulado por categoria importada</p>
                  </div>
                  <Badge variant="outline">{money(row.totalCost)}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Costos mensuales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {detailLoading ? (
            <div className="text-sm text-muted-foreground">Cargando costos mensuales...</div>
          ) : monthlyCosts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              Sin datos mensuales todavía.
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
  );
}
