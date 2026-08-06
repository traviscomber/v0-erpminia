'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, FileCheck2, RotateCcw, Star } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';

interface SupplierPerformance {
  supplier_id: string;
  total_orders: number;
  completed_orders: number;
  on_time_rate: number;
  returns_count: number;
  matched_invoices: number;
  open_exceptions: number;
  performance_score: number;
}

interface SupplierReturn {
  id: string;
  return_number: string;
  reason: string;
  status: string;
  resolution_type: string;
  requested_at: string;
}

interface SupplierInvoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  total_amount: number;
  status: string;
  procurement_match_exceptions?: Array<{ id: string; status: string }>;
}

interface SupplierControlResponse {
  returns: SupplierReturn[];
  invoices: SupplierInvoice[];
  supplierPerformance: SupplierPerformance[];
  error?: string;
}

const currency = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

const statusLabel: Record<string, string> = {
  draft: 'Borrador',
  approved: 'Aprobada',
  sent: 'Enviada',
  received_by_supplier: 'Recibida por proveedor',
  resolved: 'Resuelta',
  cancelled: 'Cancelada',
  pending_match: 'Pendiente de revisión',
  matched: 'Coincide',
  exception: 'Con diferencias',
  rejected: 'Rechazada',
};

export default function SupplierControlPage() {
  const [data, setData] = useState<SupplierControlResponse>({ returns: [], invoices: [], supplierPerformance: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiFetch('/api/procurement/supplier-control')
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'No se pudo cargar el control de proveedores.');
        if (active) setData(payload);
      })
      .catch((cause) => active && setError(cause instanceof Error ? cause.message : 'No se pudo cargar la información.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const summary = useMemo(() => ({
    returns: data.returns.filter((item) => !['resolved', 'cancelled'].includes(item.status)).length,
    exceptions: data.invoices.reduce((total, invoice) => total + (invoice.procurement_match_exceptions || []).filter((item) => item.status === 'open').length, 0),
    matched: data.invoices.filter((item) => item.status === 'matched').length,
    suppliers: data.supplierPerformance.length,
  }), [data]);

  return (
    <main className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Compras</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Control de proveedores</h1>
        <p className="mt-1 text-sm text-muted-foreground">Devoluciones, revisión de facturas y cumplimiento calculado desde órdenes y recepciones reales.</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Devoluciones abiertas', summary.returns, RotateCcw],
          ['Diferencias por resolver', summary.exceptions, AlertTriangle],
          ['Facturas coincidentes', summary.matched, FileCheck2],
          ['Proveedores evaluados', summary.suppliers, Star],
        ].map(([label, value, Icon]) => (
          <article key={String(label)} className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between text-muted-foreground"><span className="text-sm">{String(label)}</span><Icon className="h-4 w-4" /></div>
            <p className="mt-3 text-2xl font-semibold">{String(value)}</p>
          </article>
        ))}
      </section>

      {loading && <p className="rounded-lg border p-5 text-sm text-muted-foreground">Cargando información…</p>}
      {error && <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-5 text-sm text-destructive">{error}</p>}

      {!loading && !error && (
        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-lg border bg-card">
            <div className="border-b p-4"><h2 className="font-semibold">Facturas recientes</h2><p className="text-sm text-muted-foreground">Comparación entre lo comprado, recibido y facturado.</p></div>
            <div className="divide-y">
              {data.invoices.length === 0 && <p className="p-5 text-sm text-muted-foreground">Todavía no hay facturas vinculadas a órdenes operacionales.</p>}
              {data.invoices.slice(0, 12).map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between gap-4 p-4">
                  <div><p className="font-medium">{invoice.invoice_number}</p><p className="text-sm text-muted-foreground">{invoice.invoice_date}</p></div>
                  <div className="text-right"><p className="font-medium">{currency.format(Number(invoice.total_amount || 0))}</p><p className="text-sm text-muted-foreground">{statusLabel[invoice.status] || invoice.status}</p></div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border bg-card">
            <div className="border-b p-4"><h2 className="font-semibold">Devoluciones recientes</h2><p className="text-sm text-muted-foreground">Seguimiento hasta reposición, devolución de dinero o nota de crédito.</p></div>
            <div className="divide-y">
              {data.returns.length === 0 && <p className="p-5 text-sm text-muted-foreground">No existen devoluciones registradas.</p>}
              {data.returns.slice(0, 12).map((item) => (
                <div key={item.id} className="p-4"><div className="flex items-center justify-between gap-4"><p className="font-medium">{item.return_number}</p><span className="text-sm text-muted-foreground">{statusLabel[item.status] || item.status}</span></div><p className="mt-1 text-sm text-muted-foreground">{item.reason}</p></div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border bg-card xl:col-span-2">
            <div className="border-b p-4"><h2 className="font-semibold">Cumplimiento de proveedores</h2><p className="text-sm text-muted-foreground">Puntaje basado en entregas a tiempo, devoluciones y diferencias pendientes.</p></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30 text-left text-muted-foreground"><tr><th className="px-4 py-3 font-medium">Proveedor</th><th className="px-4 py-3 font-medium">Órdenes</th><th className="px-4 py-3 font-medium">A tiempo</th><th className="px-4 py-3 font-medium">Devoluciones</th><th className="px-4 py-3 font-medium">Diferencias</th><th className="px-4 py-3 text-right font-medium">Puntaje</th></tr></thead>
                <tbody className="divide-y">
                  {data.supplierPerformance.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">El puntaje aparecerá cuando existan órdenes operacionales vinculadas a proveedores.</td></tr>}
                  {data.supplierPerformance.map((supplier) => (
                    <tr key={supplier.supplier_id}><td className="px-4 py-3 font-medium">{supplier.supplier_id}</td><td className="px-4 py-3">{supplier.total_orders}</td><td className="px-4 py-3">{Number(supplier.on_time_rate || 0).toFixed(0)}%</td><td className="px-4 py-3">{supplier.returns_count}</td><td className="px-4 py-3">{supplier.open_exceptions}</td><td className="px-4 py-3 text-right font-semibold">{Number(supplier.performance_score || 0).toFixed(0)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
