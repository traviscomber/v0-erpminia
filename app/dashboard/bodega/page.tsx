'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, ArrowRight, Fuel, Search, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader, PageHeaderActions, PageHeaderContent, PageHeaderDescription, PageHeaderEyebrow, PageHeaderTitle } from '@/components/ui/page-header';
import { StatePanel } from '@/components/ui/state-panel';
import { useModuleAccess } from '@/hooks/use-module-access';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar el inventario.');
  return payload;
};

const number = (value: unknown) => new Intl.NumberFormat('es-CL').format(Number(value || 0));
const money = (value: unknown) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(value || 0));
const dateTime = (value: unknown) => value ? new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeZone: 'America/Santiago' }).format(new Date(String(value))) : 'Sin fecha';
const statusLabels: Record<string, string> = { healthy: 'Disponible', reorder: 'Reponer', out_of_stock: 'Sin stock', negative: 'Revisar saldo', expired: 'Vencido', expiring: 'Próximo a vencer' };
function statusVariant(status: string) { if (['out_of_stock', 'negative', 'expired'].includes(status)) return 'destructive' as const; if (['reorder', 'expiring'].includes(status)) return 'secondary' as const; return 'outline' as const; }

type InventoryPosition = { stock_id: string; product_id: string; product_code: string; product_name: string; family?: string | null; unit?: string | null; quantity_available: number; quantity_reserved: number; stock_value: number; stock_status: string; };
type DieselCurrent = InventoryPosition & { unit_cost?: number | null; last_counted_date?: string | null; warehouse_code?: string | null; validation_status?: string | null; };
type DieselReference = { product_code: string; name: string; unit?: string | null; standard_cost?: number | null; source_file?: string | null; source_payload?: { quantity_available?: number | null; quantity_on_hand?: number | null; unit_cost?: number | null } | null; imported_at?: string | null; updated_at?: string | null; };
type DieselEvidence = { current: DieselCurrent | null; reference: DieselReference | null; hasConflict: boolean };

export default function BodegaPage() {
  const { canEdit, ready } = useModuleAccess();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') || 'all';
  const dataHealth = searchParams.get('dataHealth');
  const negativeStockMode = dataHealth === 'negative_stock' || initialStatus === 'negative';
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState(initialStatus);
  const endpoint = useMemo(() => { const params = new URLSearchParams(); if (query.trim()) params.set('q', query.trim()); if (status !== 'all') params.set('status', status); return `/api/inventory/intelligence?${params.toString()}`; }, [query, status]);
  const { data, error, isLoading, mutate } = useSWR(endpoint, fetcher, { revalidateOnFocus: false, keepPreviousData: true });
  const overview = data?.overview || {};
  const positions: InventoryPosition[] = data?.positions || [];
  const diesel: DieselEvidence | null = data?.diesel || null;
  const dieselCurrent = diesel?.current || null;
  const dieselReference = diesel?.reference || null;
  const dieselReferenceQuantity = dieselReference?.source_payload?.quantity_available ?? dieselReference?.source_payload?.quantity_on_hand;
  const dieselReferenceCost = dieselReference?.source_payload?.unit_cost ?? dieselReference?.standard_cost;

  return <div className="space-y-6">
    <PageHeader><PageHeaderContent><PageHeaderEyebrow>Abastecimiento</PageHeaderEyebrow><PageHeaderTitle>{negativeStockMode ? 'Conciliar stock negativo' : 'Inventario'}</PageHeaderTitle><PageHeaderDescription>{negativeStockMode ? 'Revisa únicamente posiciones con saldo negativo antes de usar disponibilidad, reposición o cobertura para decidir.' : 'Busca existencias, revisa stock y detecta qué necesita reposición.'}</PageHeaderDescription></PageHeaderContent><PageHeaderActions>{negativeStockMode ? <Button asChild variant="outline"><Link href="/dashboard/bodega">Ver todo el inventario</Link></Button> : null}{ready && canEdit('bodega_inventario') && canEdit('fin_compras') ? <Button asChild><Link href="/dashboard/compras/importar-existencias"><Upload className="h-4 w-4" />Importar existencias</Link></Button> : null}</PageHeaderActions></PageHeader>

    {negativeStockMode ? <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive"/><div><p className="font-medium">Data Health · saldo negativo</p><p className="mt-1 text-muted-foreground">Esta vista filtra posiciones cuyo saldo disponible quedó bajo cero. Antes de corregir el saldo, concilia movimientos, reservas e importación fuente. Motil no ajusta cantidades automáticamente.</p></div></div> : null}

    {error ? <StatePanel tone="error" title="No fue posible cargar el inventario" description={error.message} actions={<Button variant="outline" onClick={() => void mutate()}>Reintentar</Button>} className="min-h-0 py-5" /> : null}

    {!negativeStockMode && diesel ? <section aria-label="Estado de petróleo diésel" className={`rounded-lg border p-5 ${diesel.hasConflict ? 'border-destructive/30 bg-destructive/5' : 'bg-card'}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-background"><Fuel className="h-5 w-5" /></div><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold">Petróleo Diesel</h2>{diesel.hasConflict ? <Badge variant="destructive">Datos en conflicto</Badge> : dieselCurrent ? <Badge variant={statusVariant(dieselCurrent.stock_status)}>{statusLabels[dieselCurrent.stock_status] || 'Revisar'}</Badge> : null}</div><p className="mt-1 max-w-3xl text-sm text-muted-foreground">{diesel.hasConflict ? 'Bodega y la referencia canónica más reciente no coinciden. MOTIL muestra ambas cifras y no declara stock vigente hasta que una persona concilie la fuente.' : 'Disponibilidad según la evidencia canónica vigente.'}</p></div></div>
        {dieselCurrent && !diesel.hasConflict ? <div className="text-left lg:text-right"><p className="text-xs text-muted-foreground">Disponible</p><p className="text-2xl font-semibold tabular-nums">{number(dieselCurrent.quantity_available)} {dieselCurrent.unit || 'unidad'}</p></div> : null}
      </div>
      {diesel.hasConflict ? <div className="mt-4 grid gap-px overflow-hidden rounded-md border bg-border md:grid-cols-2">
        <div className="bg-card p-4"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Registro operativo de Bodega</p><p className="mt-2 text-2xl font-semibold tabular-nums">{dieselCurrent ? `${number(dieselCurrent.quantity_available)} ${dieselCurrent.unit || 'unidad'}` : 'Sin registro'}</p><p className="mt-1 text-sm text-muted-foreground">Costo unitario: {dieselCurrent?.unit_cost != null ? money(dieselCurrent.unit_cost) : '—'}</p></div>
        <div className="bg-card p-4"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Referencia canónica más reciente</p><p className="mt-2 text-2xl font-semibold tabular-nums">{dieselReferenceQuantity != null ? `${number(dieselReferenceQuantity)} ${dieselReference?.unit || 'unidad'}` : 'Sin cantidad'}</p><p className="mt-1 text-sm text-muted-foreground">Costo unitario: {dieselReferenceCost != null ? money(dieselReferenceCost) : '—'} · actualizada {dateTime(dieselReference?.updated_at || dieselReference?.imported_at)}</p></div>
      </div> : null}
      {diesel.hasConflict ? <p className="mt-3 text-xs font-medium">No usar esta cifra para compra, consumo ni valorización hasta conciliar el origen.</p> : null}
    </section> : null}

    <section aria-label="Resumen de inventario" className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-4">{[
      ['Productos disponibles', number(overview.products_with_stock)],
      ['Valor del inventario', money(overview.total_stock_value)],
      ['Por reponer', number(overview.reorder_products)],
      ['Conteos pendientes', number(overview.count_overdue_products)],
    ].map(([label, value]) => <div key={label} className="bg-card px-5 py-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tracking-tight">{isLoading ? '—' : value}</p></div>)}</section>

    <section className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar código o producto" /></div><Select value={status} onValueChange={setStatus}><SelectTrigger className="w-full lg:w-52"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="healthy">Disponible</SelectItem><SelectItem value="reorder">Reponer</SelectItem><SelectItem value="out_of_stock">Sin stock</SelectItem><SelectItem value="negative">Revisar saldo</SelectItem><SelectItem value="expired">Vencido</SelectItem><SelectItem value="expiring">Próximo a vencer</SelectItem></SelectContent></Select></div>

      {isLoading ? <StatePanel tone="loading" title="Cargando inventario" description="Consultando las existencias registradas." /> : !error && positions.length === 0 ? <StatePanel tone="neutral" title={negativeStockMode ? 'No quedan saldos negativos' : 'No hay productos para mostrar'} description={negativeStockMode ? 'La cola Data Health está vacía para este filtro.' : 'Prueba con otros filtros o revisa si las existencias ya fueron importadas.'} /> : null}

      {!isLoading && positions.length > 0 ? <div className="overflow-hidden rounded-lg border bg-card"><div className="hidden grid-cols-[140px_1fr_120px_120px_130px_140px_36px] gap-4 border-b bg-muted/40 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground lg:grid"><span>Código</span><span>Producto</span><span>Disponible</span><span>Reservado</span><span>Valor</span><span>Estado</span><span /></div>{positions.map((row) => <Link key={row.stock_id} href={`/dashboard/bodega/productos/${row.product_id}`} className="group grid gap-2 border-b px-4 py-4 transition-colors last:border-0 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring lg:grid-cols-[140px_1fr_120px_120px_130px_140px_36px] lg:items-center lg:gap-4"><p className="font-mono text-sm">{row.product_code}</p><div><p className="font-medium group-hover:text-primary">{row.product_name}</p><p className="text-xs text-muted-foreground">{row.family || 'Sin familia'} · {row.unit || 'unidad'}</p></div><p className="text-sm"><span className="text-muted-foreground lg:hidden">Disponible: </span>{number(row.quantity_available)}</p><p className="text-sm"><span className="text-muted-foreground lg:hidden">Reservado: </span>{number(row.quantity_reserved)}</p><p className="text-sm font-medium">{money(row.stock_value)}</p><Badge variant={statusVariant(row.stock_status)}>{statusLabels[row.stock_status] || 'Revisar'}</Badge><ArrowRight className="hidden h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 lg:block" /></Link>)}</div> : null}
    </section>
  </div>;
}
