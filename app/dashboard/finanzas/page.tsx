'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { FileSearch } from 'lucide-react';

type Row = Record<string, string | number | null>;
type Response = { overview?: Row | null; topAssets?: Row[]; topProducts?: Row[]; topSuppliers?: Row[]; topCostCenters?: Row[]; validation?: Row | null; recentEvents?: Row[] };
type ConcentrationKey = 'assets' | 'products' | 'suppliers' | 'costCenters';

const fetcher = async (url: string): Promise<Response> => { const response = await fetch(url, { credentials: 'include' }); const payload = await response.json().catch(() => null); if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar Finanzas'); return payload; };
const money = (value: unknown) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(value || 0));
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
  const rowsByType: Record<ConcentrationKey, Row[]> = { assets: data?.topAssets || [], products: data?.topProducts || [], suppliers: data?.topSuppliers || [], costCenters: data?.topCostCenters || [] };
  const config = concentrationConfig[activeConcentration];
  const rows = rowsByType[activeConcentration].slice(0, 5);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Finanzas</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Resumen financiero</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Costo reconocido y compromisos de compra, separados y trazables.</p></div>
        <Link href="/dashboard/finanzas/trazabilidad" className="inline-flex h-9 w-fit items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"><FileSearch className="h-4 w-4"/>Ver trazabilidad</Link>
      </section>

      {error ? <div className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">{error.message}</div> : null}

      <section className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Costo reconocido', money(overview.recognized_clp)],
          ['Compras comprometidas', money(overview.committed_clp)],
          ['Eventos certificados', number(overview.event_count)],
          ['Validación', validationPassed ? 'Aprobada' : 'Revisar'],
        ].map(([label, value]) => <div key={label} className="bg-card px-5 py-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tracking-tight">{isLoading ? '—' : value}</p></div>)}
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-lg font-semibold">Dónde se concentra</h2><p className="text-sm text-muted-foreground">Cinco principales registros por dimensión.</p></div><div className="flex flex-wrap gap-1">{(Object.keys(concentrationConfig) as ConcentrationKey[]).map((key) => <button key={key} type="button" onClick={() => setActiveConcentration(key)} className={`rounded-md px-3 py-1.5 text-sm ${activeConcentration === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>{concentrationConfig[key].label}</button>)}</div></div>
        <div className="overflow-hidden rounded-lg border">{rows.length === 0 ? <p className="px-4 py-6 text-sm text-muted-foreground">Sin datos canónicos vinculados.</p> : rows.map((row, index) => <div key={`${String(row[config.labelKey])}-${index}`} className="grid gap-2 border-b px-4 py-3 last:border-b-0 md:grid-cols-[32px_1fr_180px] md:items-center"><span className="text-sm text-muted-foreground">{index + 1}</span><span className="truncate text-sm font-medium">{String(row[config.labelKey] || 'Sin identificar')}</span><span className="text-sm font-semibold tabular-nums md:text-right">{money(row[config.amountKey])}</span></div>)}</div>
      </section>

      {(data?.recentEvents || []).length ? <section className="border-t pt-4"><div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold">Últimos registros auditados</h2><p className="text-xs text-muted-foreground">Origen y monto conservados para revisión.</p></div><Link className="text-sm text-muted-foreground hover:text-foreground" href="/dashboard/finanzas/trazabilidad">Ver todos</Link></div></section> : null}
    </div>
  );
}
