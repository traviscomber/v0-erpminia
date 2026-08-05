'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, CircleDollarSign, FileSearch, ShieldCheck, Truck } from 'lucide-react';

type Row = Record<string, string | number | null>;
type Response = {
  overview?: Row | null;
  topAssets?: Row[];
  topProducts?: Row[];
  topSuppliers?: Row[];
  topCostCenters?: Row[];
  validation?: Row | null;
  recentEvents?: Row[];
};

type ConcentrationKey = 'assets' | 'products' | 'suppliers' | 'costCenters';

const fetcher = async (url: string): Promise<Response> => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar Finanzas');
  return payload;
};

const money = (value: unknown) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const number = (value: unknown) => new Intl.NumberFormat('es-CL').format(Number(value || 0));

const concentrationConfig: Record<ConcentrationKey, { label: string; labelKey: string; amountKey: string }> = {
  assets: { label: 'Activos', labelKey: 'asset_name', amountKey: 'recognized_clp' },
  products: { label: 'Productos', labelKey: 'product_name', amountKey: 'committed_clp' },
  suppliers: { label: 'Proveedores', labelKey: 'supplier_name', amountKey: 'committed_clp' },
  costCenters: { label: 'Centros de costo', labelKey: 'cost_center_code', amountKey: 'committed_clp' },
};

export default function FinanzasPage() {
  const { data, error, isLoading } = useSWR<Response>('/api/finance/executive', fetcher);
  const [activeConcentration, setActiveConcentration] = useState<ConcentrationKey>('assets');
  const overview = data?.overview || {};
  const validationPassed = String(data?.validation?.status || '').toLowerCase() === 'passed';

  const rowsByType: Record<ConcentrationKey, Row[]> = {
    assets: data?.topAssets || [],
    products: data?.topProducts || [],
    suppliers: data?.topSuppliers || [],
    costCenters: data?.topCostCenters || [],
  };

  const config = concentrationConfig[activeConcentration];
  const rows = rowsByType[activeConcentration].slice(0, 5);
  const rankingTotal = rows.reduce((sum, row) => sum + Number(row[config.amountKey] || 0), 0);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b border-border/70 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Finanzas</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Resumen financiero</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Montos canónicos en CLP. El costo reconocido y los compromisos de compra se muestran por separado.
          </p>
        </div>
        <Link
          href="/dashboard/finanzas/trazabilidad"
          className="inline-flex h-9 w-fit items-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-muted"
        >
          <FileSearch className="h-4 w-4" />
          Ver trazabilidad
        </Link>
      </section>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error.message}
        </div>
      ) : null}
      {isLoading ? <p className="text-sm text-muted-foreground">Validando información financiera...</p> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="shadow-none">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Costo histórico reconocido</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{money(overview.recognized_clp)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Costo realizado</p>
            </div>
            <CircleDollarSign className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Compromisos de compra</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{money(overview.committed_clp)}</p>
              <p className="mt-1 text-xs text-muted-foreground">No es gasto reconocido</p>
            </div>
            <Truck className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Eventos certificados</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{number(overview.event_count)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Origen canónico</p>
            </div>
            <ShieldCheck className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Validación</p>
              <div className="mt-2">
                <Badge variant={validationPassed ? 'secondary' : 'destructive'}>
                  {validationPassed ? 'Aprobada' : 'Revisar'}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Moneda, origen y montos</p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </section>

      <Card className="shadow-none">
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 border-b pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-semibold">Dónde se concentra</h2>
              <p className="mt-1 text-sm text-muted-foreground">Cinco principales registros por dimensión.</p>
            </div>
            <div className="flex flex-wrap gap-1 rounded-md bg-muted p-1">
              {(Object.keys(concentrationConfig) as ConcentrationKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveConcentration(key)}
                  className={`rounded px-3 py-1.5 text-sm transition-colors ${
                    activeConcentration === key ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {concentrationConfig[key].label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-2 divide-y">
            {!rows.length ? (
              <p className="py-6 text-sm text-muted-foreground">Sin datos canónicos vinculados.</p>
            ) : (
              rows.map((row, index) => {
                const amount = Number(row[config.amountKey] || 0);
                const percentage = rankingTotal > 0 ? (amount / rankingTotal) * 100 : 0;
                return (
                  <div key={`${String(row[config.labelKey])}-${index}`} className="grid gap-2 py-3 md:grid-cols-[32px_1fr_160px_64px] md:items-center">
                    <span className="text-sm text-muted-foreground">{index + 1}</span>
                    <span className="min-w-0 truncate text-sm font-medium">{String(row[config.labelKey] || 'Sin identificar')}</span>
                    <span className="text-sm font-semibold tabular-nums md:text-right">{money(amount)}</span>
                    <span className="text-xs text-muted-foreground md:text-right">{percentage.toFixed(1)}%</span>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardContent className="p-5">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="font-semibold">Últimos registros auditados</h2>
              <p className="mt-1 text-sm text-muted-foreground">Cada monto conserva su tabla y fila de origen.</p>
            </div>
          </div>

          <div className="divide-y">
            {(data?.recentEvents || []).slice(0, 5).map((event) => (
              <div key={String(event.event_id)} className="grid gap-2 py-3 md:grid-cols-[110px_1fr_150px] md:items-center">
                <Badge variant="outline" className="w-fit">
                  {String(event.recognition_status) === 'recognized' ? 'Reconocido' : 'Comprometido'}
                </Badge>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{String(event.description || 'Evento financiero')}</p>
                  <p className="text-xs text-muted-foreground">
                    {String(event.source_table)} · fila {String(event.source_record_id)}
                  </p>
                </div>
                <p className="text-sm font-semibold tabular-nums md:text-right">{money(event.amount)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
