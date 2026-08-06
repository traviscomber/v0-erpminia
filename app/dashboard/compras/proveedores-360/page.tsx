'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText, PackageSearch, ReceiptText, Search, ShieldCheck, ShoppingCart } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';

type Supplier = { id: string; tax_id: string; legal_name: string; trade_name?: string | null; business_activity?: string | null; payment_terms?: string | null; email?: string | null; phone?: string | null; region?: string | null; is_active: boolean; validation_status: string };
type Detail = { supplier: Supplier; contractor: any; performance: any; orders: any[]; operationalOrders: any[]; quotations: any[]; contracts: any[]; documents: any[]; invoices: any[]; returns: any[]; suppliedProducts: any[] };
const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

export default function Suppliers360Page() {
  const [q, setQ] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const search = useCallback(async (term = '') => {
    const response = await apiFetch(`/api/procurement/suppliers-360?q=${encodeURIComponent(term)}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'No se pudieron cargar los proveedores.');
    setSuppliers(payload.suppliers || []);
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    setLoading(true); setError('');
    try {
      const response = await apiFetch(`/api/procurement/suppliers-360?supplierId=${id}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'No se pudo cargar la ficha.');
      setDetail(payload);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo cargar la ficha.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { search().catch((cause) => setError(cause instanceof Error ? cause.message : 'Error de carga.')); }, [search]);
  useEffect(() => { if (selectedId) loadDetail(selectedId); }, [selectedId, loadDetail]);

  const totals = useMemo(() => {
    if (!detail) return { spend: 0, invoices: 0, openDifferences: 0 };
    return {
      spend: detail.orders.reduce((sum, row) => sum + Number(row.total_amount || 0), 0) + detail.operationalOrders.reduce((sum, row) => sum + Number(row.total_amount || 0), 0),
      invoices: detail.invoices.reduce((sum, row) => sum + Number(row.total_amount || 0), 0),
      openDifferences: detail.invoices.reduce((sum, row) => sum + (row.procurement_match_exceptions || []).filter((item: any) => item.status === 'open').length, 0),
    };
  }, [detail]);

  const cards = detail ? [
    { label: 'Compras acumuladas', value: money.format(totals.spend), Icon: ShoppingCart },
    { label: 'Facturado', value: money.format(totals.invoices), Icon: ReceiptText },
    { label: 'Productos', value: detail.suppliedProducts.length, Icon: PackageSearch },
    { label: 'Contratos', value: detail.contracts.length, Icon: FileText },
    { label: 'Puntaje', value: detail.performance ? Number(detail.performance.performance_score || 0).toFixed(0) : '—', Icon: ShieldCheck },
  ] : [];

  return <main className="space-y-6">
    <header><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Compras</p><h1 className="mt-1 text-2xl font-semibold">Proveedor 360°</h1><p className="mt-1 text-sm text-muted-foreground">Ficha única con compras, contratos, documentos, productos, facturas, devoluciones y desempeño.</p></header>
    <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <aside className="rounded-lg border bg-card">
        <form onSubmit={(e) => { e.preventDefault(); search(q).catch((cause) => setError(cause.message)); }} className="flex gap-2 border-b p-3"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="RUT o nombre" className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm"/><button className="rounded-md border px-3" aria-label="Buscar"><Search className="h-4 w-4"/></button></form>
        <div className="max-h-[70vh] divide-y overflow-y-auto">{suppliers.map((supplier) => <button key={supplier.id} onClick={() => setSelectedId(supplier.id)} className={`w-full p-3 text-left text-sm hover:bg-muted ${selectedId === supplier.id ? 'bg-muted' : ''}`}><p className="font-medium">{supplier.trade_name || supplier.legal_name}</p><p className="text-xs text-muted-foreground">{supplier.tax_id} · {supplier.region || 'Sin región'}</p></button>)}</div>
      </aside>
      <div className="space-y-5">
        {!selectedId && <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">Selecciona un proveedor para abrir su ficha completa.</div>}
        {loading && <div className="rounded-lg border p-6 text-sm text-muted-foreground">Cargando ficha…</div>}
        {error && <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}
        {detail && !loading && <>
          <section className="rounded-lg border bg-card p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">{detail.supplier.trade_name || detail.supplier.legal_name}</h2><p className="text-sm text-muted-foreground">{detail.supplier.legal_name} · {detail.supplier.tax_id}</p><p className="mt-2 text-sm">{detail.supplier.business_activity || 'Actividad no informada'}</p></div><div className="text-right text-sm"><p>{detail.supplier.email || 'Sin correo'}</p><p>{detail.supplier.phone || 'Sin teléfono'}</p><p>{detail.supplier.payment_terms || 'Sin condición de pago'}</p></div></div></section>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{cards.map(({ label, value, Icon }) => <article key={label} className="rounded-lg border bg-card p-4"><div className="flex justify-between text-muted-foreground"><span className="text-xs">{label}</span><Icon className="h-4 w-4"/></div><p className="mt-2 text-xl font-semibold">{value}</p></article>)}</section>
          <section className="grid gap-5 xl:grid-cols-2">
            <Panel title="Órdenes recientes" empty="No hay órdenes relacionadas.">{[...detail.operationalOrders, ...detail.orders].slice(0, 10).map((row: any) => <Row key={`${row.id}-${row.order_number}`} title={row.order_number} meta={row.order_date || row.issued_at || ''} value={money.format(Number(row.total_amount || 0))}/>)}</Panel>
            <Panel title="Contratos y documentos" empty="No hay contratos compatibles por RUT.">{detail.contracts.slice(0, 8).map((row: any) => <Row key={row.id} title={`${row.contract_number} · ${row.title}`} meta={`${row.start_date} — ${row.end_date}`} value={money.format(Number(row.contract_value || 0))}/>)}</Panel>
            <Panel title="Productos suministrados" empty="No hay productos relacionados.">{detail.suppliedProducts.slice(0, 12).map((row: any, index: number) => <Row key={`${row.product_code}-${index}`} title={row.product_code || row.description || 'Producto'} meta={`Cantidad histórica: ${Number(row.quantity || 0).toFixed(0)}`} value={money.format(Number(row.spend || 0))}/>)}</Panel>
            <Panel title="Calidad y conciliación" empty="No hay devoluciones ni facturas operacionales.">{detail.returns.slice(0, 5).map((row: any) => <Row key={row.id} title={row.return_number} meta={row.reason} value={row.status}/>)}{detail.invoices.slice(0, 7).map((row: any) => <Row key={row.id} title={`Factura ${row.invoice_number}`} meta={row.invoice_date} value={row.status}/>)}</Panel>
          </section>
          {totals.openDifferences > 0 && <p className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 text-sm">Existen {totals.openDifferences} diferencias de factura pendientes de resolución.</p>}
        </>}
      </div>
    </section>
  </main>;
}

function Panel({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) { const count = Array.isArray(children) ? children.length : 1; return <section className="rounded-lg border bg-card"><div className="border-b p-4"><h3 className="font-semibold">{title}</h3></div><div className="divide-y">{count ? children : <p className="p-5 text-sm text-muted-foreground">{empty}</p>}</div></section>; }
function Row({ title, meta, value }: { title: string; meta: string; value: string }) { return <div className="flex items-start justify-between gap-4 p-4"><div><p className="font-medium">{title}</p><p className="text-xs text-muted-foreground">{meta}</p></div><span className="shrink-0 text-sm">{value}</span></div>; }
