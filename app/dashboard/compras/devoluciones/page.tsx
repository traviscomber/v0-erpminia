'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { ArrowRightLeft, PackageX, RefreshCcw } from 'lucide-react';
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
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar devoluciones');
  return payload;
};

type Returnable = {
  receipt_line_id: string;
  receipt_id: string;
  receipt_number: string;
  order_id: string;
  order_number: string;
  product_code?: string | null;
  quantity_rejected: number;
  quantity_returned: number;
  quantity_returnable: number;
  unit_cost: number;
  received_at: string;
};

type SupplierReturn = {
  id: string;
  return_number: string;
  reason: string;
  resolution_type?: string | null;
  status: string;
  credit_note_number?: string | null;
  requested_at: string;
};

const resolutionLabel: Record<string, string> = {
  replacement: 'Reposición',
  credit_note: 'Nota de crédito',
  refund: 'Reembolso',
  repair: 'Reparación',
  pending: 'Por definir',
};

export default function SupplierReturnsPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/procurement/returns', fetcher);
  const [target, setTarget] = useState<Returnable | null>(null);
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [resolutionType, setResolutionType] = useState('replacement');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const returnable: Returnable[] = data?.returnable || [];
  const returns: SupplierReturn[] = data?.returns || [];
  const canEdit = data?.canEdit === true;
  const openReturns = useMemo(() => returns.filter((row) => !['resolved', 'cancelled'].includes(row.status)), [returns]);

  const openReturn = (row: Returnable) => {
    setTarget(row);
    setQuantity(String(Number(row.quantity_returnable || 0)));
    setReason('');
    setResolutionType('replacement');
    setEvidenceUrl('');
    setNotes('');
    setMessage(null);
  };

  const submit = async () => {
    if (!target) return;
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0 || qty > Number(target.quantity_returnable || 0)) {
      return setMessage('La cantidad debe ser mayor que cero y no superar lo rechazado pendiente.');
    }
    if (!reason.trim()) return setMessage('Ingresa el motivo de devolución.');
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch('/api/procurement/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'create_return',
          receiptId: target.receipt_id,
          receiptLineId: target.receipt_line_id,
          quantity: qty,
          reason: reason.trim(),
          resolutionType,
          evidenceUrl: evidenceUrl.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No se pudo registrar la devolución');
      setTarget(null);
      await mutate();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo registrar la devolución');
    } finally {
      setBusy(false);
    }
  };

  const next = returnable[0];

  return <div className="space-y-6">
    <section className="border-b border-border/70 pb-6">
      <p className="text-sm font-medium text-muted-foreground">Abastecimiento · Devoluciones</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Rechazo → devolución → reposición o abono</h1>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Sólo aparecen cantidades realmente rechazadas y aún no devueltas. Enviar una devolución reabre esa cantidad de la OC; la nota de crédito se resolverá como paso financiero separado.</p>
    </section>

    {message ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{message}</div> : null}
    {error ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error.message}</div> : null}

    <Card className="shadow-none">
      <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Siguiente acción</p>
          <h2 className="mt-1 text-xl font-semibold">{next ? 'Enviar devolución al proveedor' : openReturns.length ? 'Esperar resolución del proveedor' : 'Sin devoluciones pendientes'}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{next ? `${next.order_number} · ${next.product_code || 'Producto'} · ${Number(next.quantity_returnable)} unidad(es) rechazadas pendientes.` : openReturns.length ? `${openReturns.length} devolución(es) ya enviadas esperan reposición, nota de crédito u otra resolución.` : 'No existen rechazos de recepción que requieran devolución.'}</p>
        </div>
        {next && canEdit ? <Button onClick={() => openReturn(next)}><PackageX className="mr-2 h-4 w-4" />Registrar devolución</Button> : null}
      </CardContent>
    </Card>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <Card className="shadow-none"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Líneas por devolver</p><p className="mt-1 text-2xl font-semibold">{returnable.length}</p></CardContent></Card>
      <Card className="shadow-none"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Devoluciones abiertas</p><p className="mt-1 text-2xl font-semibold">{openReturns.length}</p></CardContent></Card>
      <Card className="shadow-none"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Histórico</p><p className="mt-1 text-2xl font-semibold">{returns.length}</p></CardContent></Card>
    </div>

    <Card className="shadow-none">
      <CardHeader><CardTitle>Rechazos pendientes</CardTitle><CardDescription>Cantidad rechazada menos devoluciones ya registradas.</CardDescription></CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? <p className="text-sm text-muted-foreground">Cargando...</p> : null}
        {!isLoading && !returnable.length ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No hay cantidades rechazadas pendientes de devolver.</p> : null}
        {returnable.map((row) => <div key={row.receipt_line_id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="font-medium">{row.order_number} · {row.product_code || 'Producto'}</p><p className="text-sm text-muted-foreground">Recepción {row.receipt_number} · rechazado {Number(row.quantity_rejected)} · ya devuelto {Number(row.quantity_returned)} · pendiente {Number(row.quantity_returnable)}</p></div>
          {canEdit ? <Button size="sm" variant="outline" onClick={() => openReturn(row)}><ArrowRightLeft className="mr-2 h-4 w-4" />Devolver</Button> : null}
        </div>)}
      </CardContent>
    </Card>

    <Card className="shadow-none">
      <CardHeader><CardTitle>Devoluciones registradas</CardTitle><CardDescription>La resolución final permanece separada de la salida física al proveedor.</CardDescription></CardHeader>
      <CardContent className="space-y-3">
        {!returns.length ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No hay devoluciones registradas.</p> : null}
        {returns.map((row) => <div key={row.id} className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{row.return_number}</p><p className="text-sm text-muted-foreground">{row.reason} · {resolutionLabel[row.resolution_type || 'pending'] || row.resolution_type}</p></div><Badge variant="outline">{row.status}</Badge></div>)}
      </CardContent>
    </Card>

    <Dialog open={Boolean(target)} onOpenChange={(open) => { if (!open && !busy) setTarget(null); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Registrar devolución</DialogTitle><DialogDescription>La cantidad enviada al proveedor dejará de contar como recibida en la OC y quedará pendiente de resolución.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Cantidad</Label><Input type="number" min="0" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>
          <div className="space-y-2"><Label>Motivo</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Daño, especificación incorrecta, defecto, lote rechazado..." /></div>
          <div className="space-y-2"><Label>Resolución esperada</Label><Select value={resolutionType} onValueChange={setResolutionType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="replacement">Reposición</SelectItem><SelectItem value="credit_note">Nota de crédito</SelectItem><SelectItem value="refund">Reembolso</SelectItem><SelectItem value="repair">Reparación</SelectItem><SelectItem value="pending">Por definir</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label>Evidencia URL</Label><Input value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} placeholder="Opcional" /></div>
          <div className="space-y-2"><Label>Notas</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setTarget(null)} disabled={busy}>Cancelar</Button><Button onClick={submit} disabled={busy}><RefreshCcw className="mr-2 h-4 w-4" />{busy ? 'Registrando...' : 'Enviar devolución'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
