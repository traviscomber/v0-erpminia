'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Boxes, CircleDollarSign, ClipboardList, PackageSearch, Search, ShoppingCart, Wrench } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';

type Product = { id: string; product_code: string; name: string; family?: string | null; subfamily?: string | null; unit?: string | null; standard_cost?: number | null; minimum_stock?: number | null; maximum_stock?: number | null; is_active: boolean; validation_status: string };
type Detail = { product: Product; summary: any; stock: any[]; snapshots: any[]; movements: any[]; workOrderUsage: any[]; maintenanceOrders: any[]; assets: any[]; purchaseLines: any[]; purchaseOrders: any[]; receipts: any[]; returns: any[]; suppliers: any[] };
const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

export default function Products360Page() {
  const [q, setQ] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const search = useCallback(async (term = '') => {
    const response = await apiFetch(`/api/inventory/products-360?q=${encodeURIComponent(term)}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'No se pudieron cargar los productos.');
    setProducts(payload.products || []);
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    setLoading(true); setError('');
    try {
      const response = await apiFetch(`/api/inventory/products-360?productId=${id}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'No se pudo cargar la ficha.');
      setDetail(payload);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo cargar la ficha.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { search().catch((cause) => setError(cause instanceof Error ? cause.message : 'Error de carga.')); }, [search]);
  useEffect(() => { if (selectedId) loadDetail(selectedId); }, [selectedId, loadDetail]);

  const relations = useMemo(() => {
    if (!detail) return { orders: new Map(), workOrders: new Map(), assets: new Map() };
    return {
      orders: new Map(detail.purchaseOrders.map((row) => [row.id, row])),
      workOrders: new Map(detail.maintenanceOrders.map((row) => [row.id, row])),
      assets: new Map(detail.assets.map((row) => [row.id, row])),
    };
  }, [detail]);

  const cards = detail ? [
    { label: 'Existencia', value: Number(detail.summary.quantity_on_hand || 0).toLocaleString('es-CL'), Icon: Boxes },
    { label: 'Disponible', value: Number(detail.summary.quantity_available || 0).toLocaleString('es-CL'), Icon: PackageSearch },
    { label: 'Reservado', value: Number(detail.summary.quantity_reserved || 0).toLocaleString('es-CL'), Icon: ClipboardList },
    { label: 'Valor inventario', value: money.format(Number(detail.summary.inventory_value || 0)), Icon: CircleDollarSign },
    { label: 'Proveedores', value: detail.suppliers.length, Icon: ShoppingCart },
    { label: 'Órdenes de trabajo', value: detail.workOrderUsage.length, Icon: Wrench },
  ] : [];

  return <main className="space-y-6">
    <header><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Bodega</p><h1 className="mt-1 text-2xl font-semibold">Producto 360°</h1><p className="mt-1 text-sm text-muted-foreground">Stock, lotes, movimientos, compras, proveedores, consumo, equipos y costos en una sola ficha.</p></header>
    <section className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <aside className="rounded-lg border bg-card">
        <form onSubmit={(e) => { e.preventDefault(); search(q).catch((cause) => setError(cause.message)); }} className="flex gap-2 border-b p-3"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Código, nombre o familia" className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm"/><button className="rounded-md border px-3" aria-label="Buscar"><Search className="h-4 w-4"/></button></form>
        <div className="max-h-[70vh] divide-y overflow-y-auto">{products.map((product) => <button key={product.id} onClick={() => setSelectedId(product.id)} className={`w-full p-3 text-left text-sm hover:bg-muted ${selectedId === product.id ? 'bg-muted' : ''}`}><p className="font-medium">{product.name}</p><p className="text-xs text-muted-foreground">{product.product_code} · {product.family || 'Sin familia'}</p></button>)}</div>
      </aside>
      <div className="space-y-5">
        {!selectedId && <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">Selecciona un producto para abrir su trazabilidad completa.</div>}
        {loading && <div className="rounded-lg border p-6 text-sm text-muted-foreground">Cargando ficha…</div>}
        {error && <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}
        {detail && !loading && <>
          <section className="rounded-lg border bg-card p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">{detail.product.name}</h2><p className="text-sm text-muted-foreground">{detail.product.product_code} · {detail.product.family || 'Sin familia'}{detail.product.subfamily ? ` / ${detail.product.subfamily}` : ''}</p></div><div className="text-right text-sm"><p>Unidad: {detail.product.unit || 'No informada'}</p><p>Costo estándar: {money.format(Number(detail.product.standard_cost || 0))}</p><p>Estado: {detail.product.is_active ? 'Activo' : 'Inactivo'}</p></div></div></section>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">{cards.map(({ label, value, Icon }) => <article key={label} className="rounded-lg border bg-card p-4"><div className="flex justify-between text-muted-foreground"><span className="text-xs">{label}</span><Icon className="h-4 w-4"/></div><p className="mt-2 text-xl font-semibold">{value}</p></article>)}</section>
          {(detail.summary.expiring_lots > 0 || Number(detail.summary.quantity_available || 0) <= Number(detail.product.minimum_stock || 0)) && <div className="space-y-2">{detail.summary.expiring_lots > 0 && <p className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 text-sm">{detail.summary.expiring_lots} lote(s) vencen dentro de los próximos 90 días.</p>}{Number(detail.summary.quantity_available || 0) <= Number(detail.product.minimum_stock || 0) && <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">La disponibilidad está en o bajo el stock mínimo definido.</p>}</div>}
          <section className="grid gap-5 xl:grid-cols-2">
            <Panel title="Existencias, lotes y vencimientos" empty="No hay existencias vinculadas al producto.">{detail.stock.slice(0, 15).map((row: any) => <Row key={row.id} title={`${row.part_code || detail.product.product_code} · ${row.batch_number || 'Sin lote'}`} meta={`Disponible ${Number(row.quantity_available || 0)} · Vence ${row.expiry_date || 'sin fecha'}`} value={money.format(Number(row.quantity_on_hand || 0) * Number(row.unit_cost || 0))}/>)}</Panel>
            <Panel title="Proveedores y precios históricos" empty="No hay compras con proveedores identificados.">{detail.suppliers.slice(0, 15).map((row: any, index: number) => <Row key={`${row.supplier_id || row.supplier_tax_id}-${index}`} title={row.supplier_name} meta={`${row.purchases} compra(s) · ${row.last_order_date || 'sin fecha'}`} value={`${money.format(Number(row.min_unit_cost || 0))} — ${money.format(Number(row.max_unit_cost || 0))}`}/>)}</Panel>
            <Panel title="Compras y recepciones" empty="No hay compras relacionadas.">{detail.purchaseLines.slice(0, 15).map((line: any) => { const order: any = relations.orders.get(line.purchase_order_id); return <Row key={line.id} title={line.order_number || order?.order_number || 'Orden'} meta={`${order?.supplier_name || 'Proveedor no identificado'} · Recibido ${Number(line.quantity_received || 0)}/${Number(line.quantity || 0)}`} value={money.format(Number(line.net_amount || 0))}/>; })}</Panel>
            <Panel title="Consumo en mantenimiento" empty="No hay consumo en órdenes de trabajo.">{detail.workOrderUsage.slice(0, 15).map((row: any) => { const workOrder: any = relations.workOrders.get(row.work_order_id); const asset: any = relations.assets.get(row.canonical_asset_id); return <Row key={row.id} title={workOrder?.work_order_number || 'Orden de trabajo'} meta={`${asset?.asset_code || 'Sin equipo'} · Instalado ${Number(row.quantity_installed || 0)} · Devuelto ${Number(row.quantity_returned || 0)}`} value={money.format(Number(row.total_cost || 0))}/>; })}</Panel>
          </section>
          <Panel title="Movimientos recientes" empty="No hay movimientos relacionados.">{detail.movements.slice(0, 20).map((row: any) => <Row key={row.id} title={row.movement_type} meta={`${new Date(row.created_at).toLocaleString('es-CL')} · ${row.reason || row.reference_doc || 'Sin referencia'}`} value={`${Number(row.quantity || 0)} ${detail.product.unit || ''}`}/>)}</Panel>
        </>}
      </div>
    </section>
  </main>;
}

function Panel({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) { const count = Array.isArray(children) ? children.length : 1; return <section className="rounded-lg border bg-card"><div className="border-b p-4"><h3 className="font-semibold">{title}</h3></div><div className="divide-y">{count ? children : <p className="p-5 text-sm text-muted-foreground">{empty}</p>}</div></section>; }
function Row({ title, meta, value }: { title: string; meta: string; value: string }) { return <div className="flex items-start justify-between gap-4 p-4"><div><p className="font-medium">{title}</p><p className="text-xs text-muted-foreground">{meta}</p></div><span className="shrink-0 text-sm">{value}</span></div>; }
