'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertTriangle, BrainCircuit, PackageSearch, Search, UsersRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la inteligencia de abastecimiento');
  return payload;
};

function money(value: unknown) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function number(value: unknown) {
  return Number(value || 0).toLocaleString('es-CL');
}

export default function ProcurementIntelligencePage() {
  const [search, setSearch] = useState('');
  const { data, error, isLoading } = useSWR('/api/procurement/intelligence', fetcher);

  const overview = data?.overview || {};
  const products = Array.isArray(data?.products) ? data.products : [];
  const suppliers = Array.isArray(data?.suppliers) ? data.suppliers : [];
  const qualityIssues = Array.isArray(data?.qualityIssues) ? data.qualityIssues : [];
  const reconciliation = Array.isArray(data?.supplierReconciliation) ? data.supplierReconciliation : [];

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products.slice(0, 20);
    return products.filter((item: Record<string, unknown>) =>
      [item.product_code, item.name, item.family].some((value) => String(value || '').toLowerCase().includes(query)),
    ).slice(0, 20);
  }, [products, search]);

  if (isLoading) {
    return <div className="space-y-4">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-lg bg-muted" />)}</div>;
  }

  if (error) {
    return <Card><CardContent className="p-8 text-center text-sm text-destructive">{error.message}</CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <section className="border-b border-border/70 pb-6">
        <p className="text-sm font-medium text-muted-foreground">Abastecimiento · Inteligencia canónica</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Inteligencia de compras</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Convierte órdenes históricas, productos y proveedores en decisiones operativas sin duplicar los datos maestros.</p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ['Órdenes', number(overview.purchase_orders)],
          ['Líneas', number(overview.purchase_lines)],
          ['Productos comprados', number(overview.purchased_products)],
          ['Proveedores usados', number(overview.suppliers_used)],
          ['Gasto histórico', money(overview.total_spend)],
        ].map(([label, value]) => (
          <Card key={label} className="shadow-none"><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></CardContent></Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-none"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><PackageSearch className="h-4 w-4" />Productos con historial</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">{number(overview.purchased_products)}</p><p className="mt-2 text-sm text-muted-foreground">Productos vinculados a líneas reales de compra.</p></CardContent></Card>
        <Card className="shadow-none"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><UsersRound className="h-4 w-4" />Conciliación de proveedores</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">{number(overview.suppliers_pending_reconciliation)}</p><p className="mt-2 text-sm text-muted-foreground">Nombres históricos que aún requieren vínculo manual al maestro.</p></CardContent></Card>
        <Card className="shadow-none"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4" />Órdenes con advertencias</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">{number(overview.warning_orders)}</p><p className="mt-2 text-sm text-muted-foreground">Diferencias de monto o líneas incompletas; no se eliminan automáticamente.</p></CardContent></Card>
      </div>

      <Card className="shadow-none">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BrainCircuit className="h-4 w-4" />Productos más comprados</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-xl"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar código, producto o familia" className="pl-9" /></div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr><th className="p-3">Producto</th><th className="p-3">Familia</th><th className="p-3 text-right">OC</th><th className="p-3 text-right">Proveedores</th><th className="p-3 text-right">Costo promedio</th><th className="p-3 text-right">Gasto</th></tr></thead>
              <tbody className="divide-y">{filteredProducts.map((item: Record<string, unknown>) => <tr key={String(item.product_id)}><td className="p-3"><p className="font-medium">{String(item.name || 'Sin nombre')}</p><p className="font-mono text-xs text-muted-foreground">{String(item.product_code || '')}</p></td><td className="p-3 text-muted-foreground">{String(item.family || 'Sin familia')}</td><td className="p-3 text-right">{number(item.purchase_order_count)}</td><td className="p-3 text-right">{number(item.supplier_count)}</td><td className="p-3 text-right">{money(item.weighted_average_unit_cost)}</td><td className="p-3 text-right font-medium">{money(item.total_spend)}</td></tr>)}</tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="shadow-none"><CardHeader><CardTitle className="text-base">Principales proveedores históricos</CardTitle></CardHeader><CardContent className="space-y-2">{suppliers.slice(0, 12).map((supplier: Record<string, unknown>) => <div key={String(supplier.normalized_supplier_key)} className="flex items-center justify-between gap-4 rounded-lg border p-3"><div className="min-w-0"><p className="truncate font-medium">{String(supplier.legal_name || supplier.source_supplier_name || 'Proveedor')}</p><p className="text-xs text-muted-foreground">{number(supplier.purchase_order_count)} OC · {number(supplier.distinct_product_count)} productos</p></div><div className="text-right"><p className="font-medium">{money(supplier.total_spend)}</p><Badge variant={supplier.match_status === 'pending' ? 'outline' : 'secondary'}>{supplier.match_status === 'pending' ? 'Pendiente' : 'Canónico'}</Badge></div></div>)}</CardContent></Card>
        <Card className="shadow-none"><CardHeader><CardTitle className="text-base">Control de calidad y conciliación</CardTitle></CardHeader><CardContent className="space-y-4"><div><p className="mb-2 text-sm font-medium">OC con advertencias</p>{qualityIssues.slice(0, 6).map((order: Record<string, unknown>) => <div key={String(order.purchase_order_id)} className="mb-2 flex items-center justify-between rounded-lg border p-3 text-sm"><div><p className="font-medium">{String(order.order_number)}</p><p className="text-xs text-muted-foreground">{String(order.supplier_name || 'Sin proveedor')}</p></div><p className="text-right text-xs text-muted-foreground">Variación {money(order.net_amount_variance)}</p></div>)}</div><div><p className="mb-2 text-sm font-medium">Proveedores pendientes</p>{reconciliation.slice(0, 6).map((item: Record<string, unknown>) => <div key={String(item.id)} className="mb-2 rounded-lg border p-3 text-sm"><p className="font-medium">{String(item.source_supplier_name)}</p><p className="text-xs text-muted-foreground">Pendiente de vínculo al maestro canónico</p></div>)}</div></CardContent></Card>
      </div>
    </div>
  );
}
