'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertTriangle, CheckCircle2, FileText, RefreshCw, ReceiptText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la información');
  return payload;
};

const money = (value: unknown) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(value || 0));

type PipelineRow = {
  order_id?: string | null;
  order_number?: string | null;
  order_status?: string | null;
  order_total?: number | null;
  supplier_name?: string | null;
  work_order_number?: string | null;
  work_order_title?: string | null;
  quantity_ordered?: number | null;
  quantity_received?: number | null;
};

type OrderLine = {
  id: string;
  order_id: string;
  product_code?: string | null;
  description?: string | null;
  unit?: string | null;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
};

type MatchSummary = {
  invoice_id: string;
  invoice_number: string;
  invoice_date: string;
  order_id: string;
  order_number: string;
  net_amount: number;
  tax_amount: number;
  total_amount: number;
  line_count: number;
  matched_line_count: number;
  pending_receipt_line_count: number;
  exception_line_count: number;
  match_status: string;
};

type MatchLine = {
  invoice_id: string;
  invoice_line_id: string;
  product_code?: string | null;
  description?: string | null;
  quantity_ordered: number;
  quantity_accepted: number;
  quantity_invoiced: number;
  ordered_unit_cost: number;
  invoiced_unit_cost: number;
  line_match_status: string;
};

type DraftLine = { orderLineId: string; quantity: string; unitCost: string };

function statusMeta(status: string) {
  if (status === 'matched') return { label: 'Coincide', icon: CheckCircle2, className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' };
  if (status === 'pending_receipt') return { label: 'Espera recepción', icon: ReceiptText, className: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300' };
  return { label: 'Revisar', icon: AlertTriangle, className: 'border-destructive/30 bg-destructive/10 text-destructive' };
}

function lineStatusLabel(status: string) {
  const labels: Record<string, string> = {
    matched: 'Coincide',
    pending_receipt: 'Sin recepción aceptada',
    quantity_over_receipt: 'Factura supera recepción',
    quantity_over_order: 'Factura supera OC',
    price_mismatch: 'Precio distinto',
    product_mismatch: 'Producto distinto',
  };
  return labels[status] || status;
}

export default function SupplierInvoicesPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/procurement/operational-pipeline', fetcher);
  const [selectedOrder, setSelectedOrder] = useState<PipelineRow | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [taxAmount, setTaxAmount] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [draftLines, setDraftLines] = useState<DraftLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);

  const pipeline: PipelineRow[] = data?.pipeline || [];
  const orderLines: OrderLine[] = data?.orderLines || [];
  const summaries: MatchSummary[] = data?.invoiceMatchSummary || [];
  const matchLines: MatchLine[] = data?.invoiceMatchLines || [];
  const canEdit = data?.canEdit !== false;

  const orders = useMemo(() => {
    const map = new Map<string, PipelineRow>();
    for (const row of pipeline) if (row.order_id && !map.has(row.order_id)) map.set(row.order_id, row);
    return [...map.values()];
  }, [pipeline]);

  const counts = useMemo(() => ({
    total: summaries.length,
    matched: summaries.filter((row) => row.match_status === 'matched').length,
    pending: summaries.filter((row) => row.match_status === 'pending_receipt').length,
    exceptions: summaries.filter((row) => !['matched', 'pending_receipt'].includes(row.match_status)).length,
  }), [summaries]);

  const selectedLines = selectedOrder?.order_id ? orderLines.filter((line) => line.order_id === selectedOrder.order_id) : [];
  const netAmount = draftLines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unitCost || 0), 0);
  const totalAmount = netAmount + Number(taxAmount || 0);

  const openInvoice = (order: PipelineRow) => {
    setSelectedOrder(order);
    setInvoiceNumber('');
    setInvoiceDate(new Date().toISOString().slice(0, 10));
    setTaxAmount('');
    setDocumentUrl('');
    setActionError(null);
    setDraftLines(orderLines.filter((line) => line.order_id === order.order_id).map((line) => ({
      orderLineId: line.id,
      quantity: String(Math.max(0, Number(line.quantity_received || 0))),
      unitCost: String(Number(line.unit_cost || 0)),
    })));
  };

  const updateDraftLine = (orderLineId: string, field: 'quantity' | 'unitCost', value: string) => {
    setDraftLines((current) => current.map((line) => line.orderLineId === orderLineId ? { ...line, [field]: value } : line));
  };

  const submitInvoice = async () => {
    if (!selectedOrder?.order_id) return;
    if (!invoiceNumber.trim()) return setActionError('Ingresa el número de factura.');
    if (!invoiceDate) return setActionError('Ingresa la fecha de factura.');
    const lines = draftLines
      .map((line) => ({ order_line_id: line.orderLineId, quantity: Number(line.quantity), unit_cost: Number(line.unitCost) }))
      .filter((line) => line.quantity > 0 && line.unit_cost >= 0);
    if (!lines.length) return setActionError('La factura debe contener al menos una línea con cantidad positiva.');

    setBusy(true);
    setActionError(null);
    try {
      const response = await fetch('/api/procurement/operational-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'create_supplier_invoice',
          orderId: selectedOrder.order_id,
          invoiceNumber: invoiceNumber.trim(),
          invoiceDate,
          netAmount,
          taxAmount: Number(taxAmount || 0),
          totalAmount,
          documentUrl: documentUrl.trim() || null,
          lines,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No se pudo registrar la factura');
      setSelectedOrder(null);
      await mutate();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo registrar la factura');
    } finally {
      setBusy(false);
    }
  };

  const refreshMatch = async (invoiceId: string) => {
    setBusy(true);
    setActionError(null);
    try {
      const response = await fetch('/api/procurement/operational-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'refresh_supplier_invoice_match', invoiceId }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No se pudo recalcular el match');
      await mutate();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo recalcular el match');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="border-b border-border/70 pb-6">
        <p className="text-sm font-medium text-muted-foreground">Abastecimiento · Control de factura</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">OC · recepción · factura</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">La factura se valida contra la OC y la recepción aceptada. El costo operacional se reconoce en recepción; esta etapa controla pago y diferencias sin duplicar gasto.</p>
      </section>

      {actionError ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{actionError}</div> : null}
      {error ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error.message}</div> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="shadow-none"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Facturas</p><p className="mt-1 text-2xl font-semibold">{counts.total}</p></CardContent></Card>
        <Card className="shadow-none"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Coinciden</p><p className="mt-1 text-2xl font-semibold">{counts.matched}</p></CardContent></Card>
        <Card className="shadow-none"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Esperan recepción</p><p className="mt-1 text-2xl font-semibold">{counts.pending}</p></CardContent></Card>
        <Card className="shadow-none"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Excepciones</p><p className="mt-1 text-2xl font-semibold">{counts.exceptions}</p></CardContent></Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="shadow-none">
          <CardHeader><CardTitle>Órdenes operativas</CardTitle><CardDescription>Registra la factura desde la OC que le dio origen.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? <p className="text-sm text-muted-foreground">Cargando órdenes...</p> : null}
            {!isLoading && !orders.length ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Aún no existen OC operativas. Las facturas aparecerán cuando Compras adjudique y emita una orden.</p> : null}
            {orders.map((order) => (
              <div key={order.order_id} className="rounded-lg border p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2"><p className="font-medium">{order.order_number}</p><Badge variant="outline">{order.order_status || 'issued'}</Badge></div>
                    <p className="mt-1 text-sm text-muted-foreground">{order.supplier_name || 'Proveedor'} · {money(order.order_total)}</p>
                    {order.work_order_number ? <p className="mt-2 text-sm">OT {order.work_order_number} · {order.work_order_title}</p> : null}
                    <p className="mt-1 text-xs text-muted-foreground">Recibido {Number(order.quantity_received || 0)} de {Number(order.quantity_ordered || 0)}</p>
                  </div>
                  <Button size="sm" onClick={() => openInvoice(order)} disabled={!canEdit || busy}><FileText className="mr-2 h-4 w-4" />Registrar factura</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader><CardTitle>Three-way match</CardTitle><CardDescription>Una excepción requiere decisión; una recepción pendiente requiere esperar evidencia física.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {!summaries.length ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No hay facturas registradas para contrastar.</p> : null}
            {summaries.map((summary) => {
              const meta = statusMeta(summary.match_status);
              const Icon = meta.icon;
              const lines = matchLines.filter((line) => line.invoice_id === summary.invoice_id);
              const open = expandedInvoice === summary.invoice_id;
              return <div key={summary.invoice_id} className="rounded-lg border p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><p className="font-medium">Factura {summary.invoice_number}</p><Badge variant="outline" className={meta.className}><Icon className="mr-1 h-3.5 w-3.5" />{meta.label}</Badge></div>
                    <p className="mt-1 text-sm text-muted-foreground">{summary.order_number} · {money(summary.total_amount)}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{summary.matched_line_count}/{summary.line_count} líneas coinciden · {summary.exception_line_count} excepción(es)</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setExpandedInvoice(open ? null : summary.invoice_id)}>{open ? 'Ocultar' : 'Ver detalle'}</Button>
                    <Button size="icon" variant="outline" aria-label="Recalcular match" onClick={() => refreshMatch(summary.invoice_id)} disabled={!canEdit || busy}><RefreshCw className="h-4 w-4" /></Button>
                  </div>
                </div>
                {open ? <div className="mt-4 space-y-2 border-t pt-3">{lines.map((line) => <div key={line.invoice_line_id} className="grid gap-2 rounded-md bg-muted/40 p-3 text-sm sm:grid-cols-[1fr_auto]"><div><p className="font-medium">{line.product_code || line.description || 'Línea'}</p><p className="text-xs text-muted-foreground">OC {Number(line.quantity_ordered)} · recibido {Number(line.quantity_accepted)} · facturado {Number(line.quantity_invoiced)}</p></div><div className="text-left sm:text-right"><Badge variant="outline">{lineStatusLabel(line.line_match_status)}</Badge><p className="mt-1 text-xs text-muted-foreground">{money(line.ordered_unit_cost)} → {money(line.invoiced_unit_cost)}</p></div></div>)}</div> : null}
              </div>;
            })}
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(selectedOrder)} onOpenChange={(open) => { if (!open) setSelectedOrder(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader><DialogTitle>Registrar factura proveedor</DialogTitle><DialogDescription>{selectedOrder?.order_number} · compara automáticamente contra OC y recepción aceptada.</DialogDescription></DialogHeader>
          {actionError ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{actionError}</div> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="invoice-number">Número de factura</Label><Input id="invoice-number" value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="invoice-date">Fecha</Label><Input id="invoice-date" type="date" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="invoice-tax">Impuesto</Label><Input id="invoice-tax" type="number" min="0" value={taxAmount} onChange={(event) => setTaxAmount(event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="invoice-document">URL documento</Label><Input id="invoice-document" value={documentUrl} onChange={(event) => setDocumentUrl(event.target.value)} placeholder="Opcional" /></div>
          </div>

          <div className="space-y-3">
            <div className="flex items-end justify-between gap-3"><div><p className="text-sm font-medium">Líneas de factura</p><p className="text-xs text-muted-foreground">Se precargan con la recepción existente; puedes registrar diferencias reales para que el sistema las detecte.</p></div><p className="text-sm font-medium">Neto {money(netAmount)}</p></div>
            {selectedLines.map((line) => {
              const draft = draftLines.find((item) => item.orderLineId === line.id);
              return <div key={line.id} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_120px_140px] sm:items-end">
                <div><p className="text-sm font-medium">{line.product_code || line.description || 'Producto'}</p><p className="text-xs text-muted-foreground">OC {Number(line.quantity_ordered)} · recibido {Number(line.quantity_received)} {line.unit || ''}</p></div>
                <div className="space-y-1"><Label className="text-xs">Cantidad</Label><Input type="number" min="0" step="any" value={draft?.quantity || ''} onChange={(event) => updateDraftLine(line.id, 'quantity', event.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Precio unitario</Label><Input type="number" min="0" step="any" value={draft?.unitCost || ''} onChange={(event) => updateDraftLine(line.id, 'unitCost', event.target.value)} /></div>
              </div>;
            })}
          </div>

          <div className="rounded-lg bg-muted/50 p-3 text-sm"><div className="flex justify-between"><span>Neto</span><span>{money(netAmount)}</span></div><div className="mt-1 flex justify-between"><span>Impuesto</span><span>{money(taxAmount)}</span></div><div className="mt-2 flex justify-between border-t pt-2 font-medium"><span>Total</span><span>{money(totalAmount)}</span></div></div>
          <DialogFooter><Button variant="outline" onClick={() => setSelectedOrder(null)}>Cancelar</Button><Button onClick={submitInvoice} disabled={busy || !canEdit}>{busy ? 'Guardando...' : 'Guardar y validar'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
