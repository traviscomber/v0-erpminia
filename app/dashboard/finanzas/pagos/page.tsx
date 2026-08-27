'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { CheckCircle2, Clock3, Landmark, ReceiptText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar cuentas por pagar');
  return payload;
};
const money = (value: unknown) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(value || 0));

type Payable = { id:string; invoice_number:string; supplier_name:string; approved_amount:number; paid_amount:number; outstanding_amount:number; due_date?:string|null; days_to_due?:number|null; status:string; currency:string };
type Payment = { id:string; payable_id:string; amount:number; payment_date:string; payment_reference?:string|null; reconciled_at?:string|null; reconciliation_reference?:string|null };

export default function PayablesPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/finance/payables', fetcher);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const payables: Payable[] = data?.payables || [];
  const payments: Payment[] = data?.payments || [];
  const canEdit = data?.canEdit === true;
  const totals = useMemo(() => ({
    outstanding: payables.reduce((sum,row)=>sum+Number(row.outstanding_amount||0),0),
    dueMissing: payables.filter((row)=>!row.due_date).length,
    overdue: payables.filter((row)=>row.days_to_due != null && row.days_to_due < 0 && Number(row.outstanding_amount)>0).length,
    unreconciled: payments.filter((row)=>!row.reconciled_at).length,
  }), [payables,payments]);

  const post = async (body: unknown, key: string) => {
    setBusy(key); setMessage(null);
    try {
      const response = await fetch('/api/finance/payables', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body:JSON.stringify(body) });
      const payload = await response.json().catch(()=>null);
      if (!response.ok) throw new Error(payload?.error || 'No se pudo completar la operación');
      await mutate();
    } catch (e) { setMessage(e instanceof Error ? e.message : 'No se pudo completar la operación'); }
    finally { setBusy(null); }
  };

  return <div className="space-y-6">
    <section className="border-b border-border/70 pb-6"><p className="text-sm font-medium text-muted-foreground">Finanzas · Tesorería</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Cuentas por pagar</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Separa costo reconocido de salida de caja: la factura aprobada crea la obligación, el pago reduce saldo y la conciliación confirma el movimiento bancario.</p></section>
    {message ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{message}</div> : null}
    {error ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error.message}</div> : null}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="shadow-none"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Saldo pendiente</p><p className="mt-1 text-2xl font-semibold">{money(totals.outstanding)}</p></CardContent></Card>
      <Card className="shadow-none"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Sin vencimiento</p><p className="mt-1 text-2xl font-semibold">{totals.dueMissing}</p></CardContent></Card>
      <Card className="shadow-none"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Vencidas</p><p className="mt-1 text-2xl font-semibold">{totals.overdue}</p></CardContent></Card>
      <Card className="shadow-none"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Pagos por conciliar</p><p className="mt-1 text-2xl font-semibold">{totals.unreconciled}</p></CardContent></Card>
    </div>
    <Card className="shadow-none"><CardHeader><CardTitle>Obligaciones</CardTitle><CardDescription>Primero define vencimiento; luego registra pagos reales.</CardDescription></CardHeader><CardContent className="space-y-3">
      {isLoading ? <p className="text-sm text-muted-foreground">Cargando...</p> : null}
      {!isLoading && !payables.length ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No hay facturas aprobadas para pago.</p> : null}
      {payables.map((row)=><div key={row.id} className="rounded-lg border p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex items-center gap-2"><p className="font-medium">Factura {row.invoice_number}</p><Badge variant="outline">{row.status}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{row.supplier_name} · aprobado {money(row.approved_amount)} · pagado {money(row.paid_amount)}</p><p className="mt-1 text-sm">Saldo {money(row.outstanding_amount)}{row.due_date ? ` · vence ${row.due_date}` : ' · vencimiento pendiente'}</p></div><div className="flex flex-wrap gap-2">
        {!row.due_date && canEdit ? <Input type="date" className="w-40" onChange={(e)=>{ if(e.target.value) void post({action:'set_due_date',payableId:row.id,dueDate:e.target.value},`due-${row.id}`); }} disabled={busy===`due-${row.id}`} /> : null}
        {row.due_date && Number(row.outstanding_amount)>0 && canEdit ? <Button size="sm" variant="outline" onClick={()=>{ const amount=window.prompt('Monto a pagar',String(row.outstanding_amount)); if(!amount) return; const ref=window.prompt('Referencia de pago')||''; void post({action:'record_payment',payableId:row.id,amount:Number(amount),paymentDate:new Date().toISOString().slice(0,10),reference:ref},`pay-${row.id}`); }}><ReceiptText className="mr-2 h-4 w-4"/>Registrar pago</Button>:null}
      </div></div></div>)}
    </CardContent></Card>
    <Card className="shadow-none"><CardHeader><CardTitle>Pagos y conciliación</CardTitle><CardDescription>La conciliación no reconoce gasto; confirma la salida de caja.</CardDescription></CardHeader><CardContent className="space-y-3">
      {!payments.length ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No hay pagos registrados.</p> : null}
      {payments.map((row)=><div key={row.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{money(row.amount)} · {row.payment_date}</p><p className="text-sm text-muted-foreground">{row.payment_reference || 'Sin referencia de pago'}</p></div>{row.reconciled_at ? <Badge><CheckCircle2 className="mr-1 h-3.5 w-3.5"/>Conciliado</Badge> : canEdit ? <Button size="sm" variant="outline" onClick={()=>{ const ref=window.prompt('Referencia de conciliación'); if(!ref) return; void post({action:'reconcile_payment',paymentId:row.id,reference:ref},`rec-${row.id}`); }}><Landmark className="mr-2 h-4 w-4"/>Conciliar</Button> : <Badge variant="outline"><Clock3 className="mr-1 h-3.5 w-3.5"/>Pendiente</Badge>}</div>)}
    </CardContent></Card>
  </div>;
}
