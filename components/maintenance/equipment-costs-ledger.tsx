'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { AlertCircle, ArrowRight, Download, RefreshCw, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Summary = {
  rows?: number;
  totalCost?: number | string;
  matchedRows?: number;
  matchedCost?: number | string;
  unmatchedRows?: number;
  unmatchedCost?: number | string;
  assets?: number;
  averageCostPerAsset?: number | string;
};

type AssetCostRow = {
  id: string;
  assetName: string;
  assetCode?: string | null;
  category?: string | null;
  totalCost?: number | string | null;
  rows?: number;
  lastDate?: string | null;
};

type CategoryCostRow = {
  category: string;
  totalCost: number | string;
  rows: number;
};

type MonthlyCostRow = {
  month: string;
  value: number | string;
};

type RecentRow = {
  id: string;
  costDate?: string | null;
  accountName?: string | null;
  documentNumber?: string | null;
  equipmentName?: string | null;
  category?: string | null;
  totalCost?: number | string | null;
  assetName?: string | null;
  assetCode?: string | null;
  costCenterName?: string | null;
  matchedBy?: string | null;
  matchConfidence?: number | string | null;
};

type EquipmentCostsResponse = {
  summary?: Summary;
  assetCosts?: AssetCostRow[];
  categoryCosts?: CategoryCostRow[];
  monthlyCosts?: MonthlyCostRow[];
  recentRows?: RecentRow[];
  error?: string;
};

const fetcher = async (url: string): Promise<EquipmentCostsResponse> => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || 'No se pudieron leer los costos de equipos');
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

export function EquipmentCostsLedger() {
  const { data, error, isLoading, mutate } = useSWR<EquipmentCostsResponse>('/api/maintenance/equipment-costs?view=summary', fetcher);

  const summary: Summary = data?.summary || {
    rows: 0,
    totalCost: 0,
    matchedRows: 0,
    matchedCost: 0,
    unmatchedRows: 0,
    unmatchedCost: 0,
    assets: 0,
    averageCostPerAsset: 0,
  };
  const assetCosts: AssetCostRow[] = Array.isArray(data?.assetCosts) ? data.assetCosts : [];
  const categoryCosts: CategoryCostRow[] = Array.isArray(data?.categoryCosts) ? data.categoryCosts : [];
  const monthlyCosts: MonthlyCostRow[] = Array.isArray(data?.monthlyCosts) ? data.monthlyCosts : [];
  const recentRows: RecentRow[] = Array.isArray(data?.recentRows) ? data.recentRows : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Costos de equipos</h1>
          <p className="mt-2 text-muted-foreground">
            Ledger importado desde Excel con cruce a maquinaria, equipos y centros de costo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard/mantenimiento/costos/equipos/importar">
              <Upload className="h-4 w-4" />
              Importar Excel
            </Link>
          </Button>
          <Button variant="outline" onClick={() => void mutate()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Recargar
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard/mantenimiento/costos">
              Costo por OT
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Registros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : toNumber(summary.rows)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Costo total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : money(summary.totalCost)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Emparejados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : toNumber(summary.matchedRows)}</div>
            <p className="text-xs text-muted-foreground">{money(summary.matchedCost)} cruzados con activo real</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Sin cruce</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : toNumber(summary.unmatchedRows)}</div>
            <p className="text-xs text-muted-foreground">{money(summary.unmatchedCost)} pendientes de revisar</p>
          </CardContent>
        </Card>
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error.message}
        </div>
      ) : null}

      <Card className="border-border/70 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle>Acceso rápido</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Button asChild variant="outline" className="justify-between">
            <Link href="/dashboard/mantenimiento/costos/equipos/importar">
              <span>Importar costos</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-between">
            <Link href="/dashboard/mantenimiento/equipos">
              Maquinaria y equipos
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-between">
            <Link href="/dashboard/mantenimiento/vehiculos">
              Vehiculos y QR
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-between">
            <a href="/api/maintenance/equipment-costs?view=summary" target="_blank" rel="noreferrer">
              <Download className="h-4 w-4" />
              Descargar JSON
            </a>
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Equipos con mayor costo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {assetCosts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                No hay costos importados aun.
              </div>
            ) : (
              assetCosts.map((asset) => (
                <div key={asset.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{asset.assetName}</p>
                      <p className="text-xs text-muted-foreground">{asset.assetCode || 'Sin codigo'}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{asset.category || 'Sin categoría'}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {asset.rows || 0} registros | ultima fecha {asset.lastDate || 'Sin fecha'}
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
            <CardTitle>Costo por categoría</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {categoryCosts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                No hay categorías cargadas.
              </div>
            ) : (
              categoryCosts.map((row) => (
                <div key={row.category} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="font-medium">{row.category}</p>
                    <p className="text-xs text-muted-foreground">{row.rows} registros</p>
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
          <CardTitle>Costo mensual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {monthlyCosts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              Sin serie mensual disponible.
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

      <Card>
        <CardHeader>
          <CardTitle>Últimos movimientos importados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentRows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              No hay movimientos recientes.
            </div>
          ) : (
            recentRows.map((row) => (
              <div key={row.id} className="rounded-lg border border-border p-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold">{row.equipmentName || row.assetName || 'Sin equipo'}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.accountName || 'Sin cuenta'} | {row.documentNumber || 'Sin comprobante'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {row.category || 'Sin categoría'} | {row.costDate || 'Sin fecha'} | {row.costCenterName || 'Sin centro de costo'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Cruce: {row.matchedBy || 'sin cruce'} ({toNumber(row.matchConfidence).toFixed(2)})
                    </p>
                  </div>
                  <Badge variant="secondary">{money(row.totalCost)}</Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
