'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { ArrowRight, CheckCircle2, ClipboardList, PackageCheck, Plus, ReceiptText, Search, type LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la información');
  return payload;
};

const money = (value: unknown) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(value || 0));

type Product = { id: string; product_code: string; name: string; unit?: string | null; standard_cost?: number | null };
type Supplier = { id: string; tax_id: string; legal_name: string; trade_name?: string | null; payment_terms?: string | null };
type RequestLine = { id: string; request_id: string; canonical_product_id?: string | null; product_code?: string | null; description?: string | null; quantity: number; unit?: string | null; estimated_unit_cost?: number | null };
type RequestRow = { id: string; request_number: string; status: string; priority: string; required_date?: string | null; justification?: string | null; created_at: string };
type QuoteRow = { id: string; request_id: string; quotation_number: string; supplier_id: string; total_amount: number; currency: string; lead_time_days?: number | null; status: string };
type PurchaseOrderLine = { id: number; purchase_order_id: string; product_code?: string | null; description?: string | null; quantity: number; quantity_received: number; unit?: string | null; unit_cost?: number | null };
type PurchaseOrder = { id: string; order_number: string; supplier_name?: string | null; total_amount?: number | null; operational_status?: string | null; status?: string | null; expected_delivery_date?: string | null; procurement_request_id?: string | null };

type MetricCard = { label: string; value: number; icon: LucideIcon };

export default function ProcurementWorkflowPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/procurement/workflow', fetcher);
  const [requestOpen, setRequestOpen] = useState(false);
  const [quoteRequest, setQuoteRequest] = useState<RequestRow | null>(null);
  const [receiveOrder, setReceiveOrder] = useState<PurchaseOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [productQuery, setProductQuery] = useState('');
  const [supplierQuery, setSupplierQuery] = useState('');
  const { data: productData } = useSWR(requestOpen && productQuery.length >= 2 ? `/api/procurement/workflow?resource=products&q=${encodeURIComponent(productQuery)}` : null, fetcher);
  const { data: supplierData } = useSWR(quoteRequest && supplierQuery.length >= 2 ? `/api/procurement/workflow?resource=suppliers&q=${encodeURIComponent(supplierQuery)}` : null, fetcher);

  const [priority, setPriority] = useState('medium');
  const [requiredDate, setRequiredDate] = useState('');
  const [justification, setJustification] = useState('');
  const [draftLines, setDraftLines] = useState<Array<{ product: Product; quantity: number }>>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [leadTimeDays, setLeadTimeDays] = useState('');
  const [quoteCosts, setQuoteCosts] = useState<Record<string, string>>({});
  const [receiptQuantities, setReceiptQuantities] = useState<Record<number, string>>({});

  const requests: RequestRow[] = data?.requests || [];
  const requestLines: RequestLine[] = data?.requestLines || [];
  const quotations: QuoteRow[] = data?.quotations || [];
  const orders: PurchaseOrder[] = data?.purchaseOrders || [];
  const orderLines: PurchaseOrderLine[] = data?.purchaseOrderLines || [];

  const counts = useMemo(() => ({
    requests: requests.filter((row) => ['draft', 'submitted', 'quoted'].includes(row.status)).length,
    quoted: quotations.filter((row) => row.status === 'received').length,
    ordered: orders.filter((row) => !['received', 'closed'].includes(row.operational_status || row.status || '')).length,
    received: orders.filter((row) => (row.operational_status || row.status) === 'received').length,
  }), [orders, quotations, requests]);

  const metrics: MetricCard[] = [
    { label: 'Solicitudes activas', value: counts.requests, icon: ClipboardList },
    { label: 'Cotizaciones recibidas', value: counts.quoted, icon: ReceiptText },
    { label: 'OC por recibir', value: counts.ordered, icon: ArrowRight },
    { label: 'OC recibidas', value: counts.received, icon: PackageCheck },
  ];

  const execute = async (body: unknown) => {
    setBusy(true);
    setActionError(null);
    try {
      const response = await fetch('/api/procurement/workflow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No se pudo completar la operación');
      await mutate();
      return true;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo completar la operación');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const createRequest = async () => {
    if (!draftLines.length) return setActionError('Agrega al menos un producto.');
    const ok = await execute({ action: 'create_request', payload: { priority, required_date: requiredDate || null, justification, lines: draftLines.map(({ product, quantity }) => ({ canonical_product_id: product.id, quantity, unit: product.unit, estimated_unit_cost: product.standard_cost })) } });
    if (ok) {
      setRequestOpen(false); setDraftLines([]); setProductQuery(''); setJustification(''); setRequiredDate(''); setPriority('medium');
    }
  };

  const createQuotation = async () => {
    if (!quoteRequest || !selectedSupplier) return setActionError('Selecciona un proveedor.');
    const lines = requestLines.filter((line) => line.request_id === quoteRequest.id);
    if (lines.some((line) => Number(quoteCosts[line.id] || 0) <= 0)) return setActionError('Ingresa costo unitario para todas las líneas.');
    const ok = await execute({ action: 'create_quotation', payload: { request_id: quoteRequest.id, supplier_id: selectedSupplier.id, lead_time_days: leadTimeDays || null, payment_terms: selectedSupplier.payment_terms, lines: lines.map((line) => ({ request_line_id: line.id, quantity: Number(line.quantity), unit_cost: Number(quoteCosts[line.id]) })) } });
    if (ok) { setQuoteRequest(null); setSelectedSupplier(null); setSupplierQuery(''); setQuoteCosts({}); setLeadTimeDays(''); }
  };

  const awardQuotation = async (quotationId: string) => {
    await execute({ action: 'award_quotation', quotationId });
  };

  const receive = async () => {
    if (!receiveOrder) return;
    const lines = orderLines.filter((line) => line.purchase_order_id === receiveOrder.id).map((line) => ({ purchase_order_line_id: line.id, quantity_received: Number(receiptQuantities[line.id] || 0), quantity_accepted: Number(receiptQuantities[line.id] || 0), quantity_rejected: 0 })).filter((line) => line.quantity_received > 0);
    if (!lines.length) return setActionError('Ingresa al menos una cantidad recibida.');
    const ok = await execute({ action: 'receive_purchase_order', purchaseOrderId: receiveOrder.id, lines });
    if (ok) { setReceiveOrder(null); setReceiptQuantities({}); }
  };

  const openQuote = (request: RequestRow) => {
    setQuoteRequest(request);
    const costs: Record<string, string> = {};
    requestLines.filter((line) => line.request_id === request.id).forEach((line) => { costs[line.id] = String(line.estimated_unit_cost || ''); });
    setQuoteCosts(costs);
  };

  const openReceive = (order: PurchaseOrder) => {
    setReceiveOrder(order);
    const quantities: Record<number, string> = {};
    orderLines.filter((line) => line.purchase_order_id === order.id).forEach((line) => { quantities[line.id] = String(Math.max(0, Number(line.quantity || 0) - Number(line.quantity_received || 0))); });
    setReceiptQuantities(quantities);
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b border-border/70 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Abastecimiento · Flujo operativo</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Solicitud a recepción</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Un expediente continuo conecta necesidad, cotizaciones, proveedor, orden de compra, recepción, inventario y trazabilidad.</p>
        </div>
        <Button onClick={() => setRequestOpen(true)}><Plus className="mr-2 h-4 w-4" />Nueva solicitud</Button>
      </section>

      {actionError ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{actionError}</div> : null}
      {error ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error.message}</div> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="shadow-none"><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div><Icon className="h-5 w-5 text-muted-foreground" /></CardContent></Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader><CardTitle>Solicitudes y cotizaciones</CardTitle><CardDescription>La cotización se registra dentro de la solicitud; no como módulo independiente.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? <p className="text-sm text-muted-foreground">Cargando flujo...</p> : null}
            {!isLoading && !requests.length ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No hay solicitudes operativas. Crea la primera desde esta pantalla.</p> : null}
            {requests.map((request) => {
              const lines = requestLines.filter((line) => line.request_id === request.id);
              const quotes = quotations.filter((quote) => quote.request_id === request.id);
              return <div key={request.id} className="rounded-lg border p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div><div className="flex items-center gap-2"><p className="font-medium">{request.request_number}</p><Badge variant="outline">{request.status}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{lines.length} producto(s) · prioridad {request.priority}</p><p className="mt-2 text-sm">{request.justification || 'Sin justificación adicional'}</p></div>
                  {['draft', 'submitted', 'quoted'].includes(request.status) ? <Button size="sm" variant="outline" onClick={() => openQuote(request)}>Registrar cotización</Button> : null}
                </div>
                {quotes.length ? <div className="mt-4 space-y-2 border-t pt-3">{quotes.map((quote) => <div key={quote.id} className="flex items-center justify-between gap-3 text-sm"><div><span className="font-medium">{quote.quotation_number}</span><span className="ml-2 text-muted-foreground">{money(quote.total_amount)} · {quote.lead_time_days || 0} días</span></div>{quote.status === 'received' ? <Button size="sm" onClick={() => awardQuotation(quote.id)} disabled={busy}><CheckCircle2 className="mr-2 h-4 w-4" />Adjudicar</Button> : <Badge variant="secondary">{quote.status}</Badge>}</div>)}</div> : null}
              </div>;
            })}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader><CardTitle>Órdenes y recepciones</CardTitle><CardDescription>La recepción actualiza inventario y costo promedio dentro de una sola transacción.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {!orders.length ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Las OC emitidas desde cotizaciones aparecerán aquí.</p> : null}
            {orders.map((order) => {
              const lines = orderLines.filter((line) => line.purchase_order_id === order.id);
              const pending = lines.reduce((sum, line) => sum + Math.max(0, Number(line.quantity || 0) - Number(line.quantity_received || 0)), 0);
              return <div key={order.id} className="rounded-lg border p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><p className="font-medium">{order.order_number}</p><Badge variant="outline">{order.operational_status || order.status || 'issued'}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{order.supplier_name || 'Proveedor'} · {money(order.total_amount)}</p><p className="mt-2 text-sm">{lines.length} línea(s) · {pending} unidad(es) pendientes</p></div>{pending > 0 ? <Button size="sm" onClick={() => openReceive(order)}>Registrar recepción</Button> : <Badge><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Completa</Badge>}</div></div>;
            })}
          </CardContent>
        </Card>
      </div>

      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Nueva solicitud de compra</DialogTitle><DialogDescription>Selecciona productos canónicos. La solicitud podrá vincularse después a cotizaciones y OC.</DialogDescription></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2"><div><Label>Prioridad</Label><Select value={priority} onValueChange={setPriority}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Baja</SelectItem><SelectItem value="medium">Media</SelectItem><SelectItem value="high">Alta</SelectItem><SelectItem value="critical">Crítica</SelectItem></SelectContent></Select></div><div><Label>Fecha requerida</Label><Input type="date" value={requiredDate} onChange={(e) => setRequiredDate(e.target.value)} /></div></div>
          <div><Label>Justificación</Label><Textarea value={justification} onChange={(e) => setJustification(e.target.value)} placeholder="Necesidad operacional, OT o reposición" /></div>
          <div><Label>Buscar producto</Label><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={productQuery} onChange={(e) => setProductQuery(e.target.value)} placeholder="Código o nombre" /></div>{productData?.products?.length ? <div className="mt-2 max-h-40 overflow-auto rounded-md border">{productData.products.map((product: Product) => <button key={product.id} type="button" className="flex w-full items-center justify-between border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-muted" onClick={() => { if (!draftLines.some((line) => line.product.id === product.id)) setDraftLines([...draftLines, { product, quantity: 1 }]); setProductQuery(''); }}><span><strong>{product.product_code}</strong> · {product.name}</span><Plus className="h-4 w-4" /></button>)}</div> : null}</div>
          <div className="space-y-2">{draftLines.map((line, index) => <div key={line.product.id} className="grid grid-cols-[1fr_100px_auto] items-center gap-2 rounded-md border p-3"><div><p className="text-sm font-medium">{line.product.product_code} · {line.product.name}</p><p className="text-xs text-muted-foreground">{line.product.unit || 'unidad'}</p></div><Input type="number" min="1" value={line.quantity} onChange={(e) => setDraftLines(draftLines.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: Number(e.target.value) } : item))} /><Button variant="ghost" size="sm" onClick={() => setDraftLines(draftLines.filter((_, itemIndex) => itemIndex !== index))}>Quitar</Button></div>)}</div>
          <DialogFooter><Button variant="outline" onClick={() => setRequestOpen(false)}>Cancelar</Button><Button onClick={createRequest} disabled={busy}>{busy ? 'Guardando...' : 'Crear solicitud'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(quoteRequest)} onOpenChange={(open) => !open && setQuoteRequest(null)}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Registrar cotización</DialogTitle><DialogDescription>{quoteRequest?.request_number}: proveedor, precio y plazo en el mismo expediente.</DialogDescription></DialogHeader>
          <div><Label>Buscar proveedor canónico</Label><Input value={supplierQuery} onChange={(e) => setSupplierQuery(e.target.value)} placeholder="RUT o razón social" />{selectedSupplier ? <div className="mt-2 rounded-md border p-3 text-sm"><strong>{selectedSupplier.trade_name || selectedSupplier.legal_name}</strong><span className="ml-2 text-muted-foreground">{selectedSupplier.tax_id}</span></div> : supplierData?.suppliers?.length ? <div className="mt-2 max-h-36 overflow-auto rounded-md border">{supplierData.suppliers.map((supplier: Supplier) => <button key={supplier.id} type="button" className="block w-full border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-muted" onClick={() => { setSelectedSupplier(supplier); setSupplierQuery(''); }}>{supplier.trade_name || supplier.legal_name} · {supplier.tax_id}</button>)}</div> : null}</div>
          <div><Label>Plazo de entrega (días)</Label><Input type="number" min="0" value={leadTimeDays} onChange={(e) => setLeadTimeDays(e.target.value)} /></div>
          <div className="space-y-2">{requestLines.filter((line) => line.request_id === quoteRequest?.id).map((line) => <div key={line.id} className="grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_160px]"><div><p className="text-sm font-medium">{line.product_code} · {line.description}</p><p className="text-xs text-muted-foreground">Cantidad {line.quantity} {line.unit || ''}</p></div><div><Label>Costo unitario</Label><Input type="number" min="0" value={quoteCosts[line.id] || ''} onChange={(e) => setQuoteCosts({ ...quoteCosts, [line.id]: e.target.value })} /></div></div>)}</div>
          <DialogFooter><Button variant="outline" onClick={() => setQuoteRequest(null)}>Cancelar</Button><Button onClick={createQuotation} disabled={busy}>{busy ? 'Guardando...' : 'Registrar cotización'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(receiveOrder)} onOpenChange={(open) => !open && setReceiveOrder(null)}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Registrar recepción</DialogTitle><DialogDescription>{receiveOrder?.order_number}: solo se incorporará a stock la cantidad aceptada.</DialogDescription></DialogHeader>
          <div className="space-y-2">{orderLines.filter((line) => line.purchase_order_id === receiveOrder?.id).map((line) => { const remaining = Math.max(0, Number(line.quantity || 0) - Number(line.quantity_received || 0)); return <div key={line.id} className="grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_160px]"><div><p className="text-sm font-medium">{line.product_code} · {line.description}</p><p className="text-xs text-muted-foreground">Ordenado {line.quantity} · recibido {line.quantity_received || 0} · pendiente {remaining}</p></div><div><Label>Recibir ahora</Label><Input type="number" min="0" max={remaining} value={receiptQuantities[line.id] || ''} onChange={(e) => setReceiptQuantities({ ...receiptQuantities, [line.id]: e.target.value })} /></div></div>; })}</div>
          <DialogFooter><Button variant="outline" onClick={() => setReceiveOrder(null)}>Cancelar</Button><Button onClick={receive} disabled={busy}>{busy ? 'Procesando...' : 'Confirmar recepción'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
