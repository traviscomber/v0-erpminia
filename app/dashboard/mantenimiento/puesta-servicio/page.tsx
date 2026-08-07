'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type Asset = { id: string; asset_code: string; name: string; asset_type: string | null; is_active: boolean };
type Initiative = { id: string; canonical_asset_id: string; investment_need_id: string; status: string; completed_at: string | null; execution_note: string | null };
type Decision = { id: string; decision_type: string; status: string; commissioning_date: string | null; reason: string; evidence_reference: string | null; proposed_at: string; approved_at: string | null; replacement_asset_id: string | null };
type Evidence = { executionLinks: number; purchaseOrders: number; receivedPurchaseOrders: number; contracts: number; documentedContracts: number; workOrders: number; completedWorkOrders: number; documents: number };
type Item = { initiative: Initiative; previousAsset: Asset | null; replacementAsset: Asset | null; decision: Decision | null; evidence: Evidence; gaps: string[]; readyToApprove: boolean };
type Data = { counts: { initiatives: number; completed: number; ready: number; proposed: number; approved: number; withGaps: number }; items: Item[]; generatedAt: string };

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar');
  return payload as Data;
};

const decisionLabels: Record<string, string> = {
  commissioned: 'Puesta en servicio',
  closed: 'Cierre de renovación',
  replacement_effective: 'Reemplazo efectivo',
};

export default function RenewalCommissioningPage() {
  const { data, error, isLoading, isValidating, mutate } = useSWR('/api/maintenance/renewal-commissioning', fetcher, { revalidateOnFocus: false });
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({ initiativeId: '', decisionType: 'commissioned', replacementAssetCode: '', commissioningDate: '', reason: '', evidenceReference: '' });
  const candidates = useMemo(() => data?.items.filter((row) => row.initiative.status === 'completed' && !row.decision && row.previousAsset) || [], [data?.items]);
  const filtered = useMemo(() => (data?.items || []).filter((row) => !query.trim() || `${row.previousAsset?.asset_code || ''} ${row.previousAsset?.name || ''} ${row.decision?.decision_type || ''} ${row.decision?.status || ''}`.toLowerCase().includes(query.toLowerCase())), [data?.items, query]);

  async function propose(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const response = await fetch('/api/maintenance/renewal-commissioning', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) });
    const payload = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok) { setMessage(payload?.error || 'No se pudo proponer el cierre.'); return; }
    setForm({ initiativeId: '', decisionType: 'commissioned', replacementAssetCode: '', commissioningDate: '', reason: '', evidenceReference: '' });
    setMessage('Decisión de cierre propuesta. No se modificó ningún activo canónico.');
    await mutate();
  }

  async function changeStatus(id: string, status: string) {
    setMessage(null);
    const response = await fetch('/api/maintenance/renewal-commissioning', { method: 'PATCH', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, status }) });
    const payload = await response.json().catch(() => null);
    if (!response.ok) { setMessage(payload?.error || 'No se pudo actualizar el cierre.'); return; }
    setMessage(status === 'approved' ? 'Cierre aprobado con evidencia validada. El historial de activos se conserva sin sobrescrituras.' : 'Decisión de cierre actualizada.');
    await mutate();
  }

  const counts = data?.counts;
  return <div className="space-y-6">
    <section className="flex flex-col gap-4 border-b border-border/70 pb-6 md:flex-row md:items-end md:justify-between">
      <div><p className="text-sm font-medium text-muted-foreground">Mantenimiento · Renovación</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Puesta en servicio y cierre</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Cierra una renovación únicamente desde ejecución completada y evidencia realmente vinculada. Un reemplazo efectivo solo referencia un activo canónico ya existente; Motil no crea, desactiva ni sobrescribe activos.</p></div>
      <div className="flex gap-2"><Button variant="outline" asChild><Link href="/dashboard/mantenimiento/ejecucion-renovacion">Ejecución</Link></Button><Button variant="outline" onClick={() => void mutate()} disabled={isValidating}><RefreshCw className={`mr-2 h-4 w-4 ${isValidating ? 'animate-spin' : ''}`}/>Actualizar</Button></div>
    </section>

    {message && <Card className="shadow-none"><CardContent className="p-4 text-sm">{message}</CardContent></Card>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">{[['Iniciativas', counts?.initiatives || 0], ['Completadas', counts?.completed || 0], ['Listas', counts?.ready || 0], ['Propuestas', counts?.proposed || 0], ['Aprobadas', counts?.approved || 0], ['Con brechas', counts?.withGaps || 0]].map(([label, value]) => <Card key={String(label)} className="shadow-none"><CardContent className="p-4"><p className="text-2xl font-semibold">{Number(value).toLocaleString('es-CL')}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></CardContent></Card>)}</div>

    <Card className="shadow-none"><CardHeader><CardTitle className="text-lg">Proponer puesta en servicio o cierre</CardTitle></CardHeader><CardContent><form onSubmit={propose} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2 md:col-span-2"><Label>Iniciativa completada</Label><Select value={form.initiativeId} onValueChange={(value) => setForm({ ...form, initiativeId: value })}><SelectTrigger><SelectValue placeholder="Seleccionar iniciativa"/></SelectTrigger><SelectContent>{candidates.map((row) => <SelectItem key={row.initiative.id} value={row.initiative.id}>{row.previousAsset!.asset_code} · {row.previousAsset!.name}{row.gaps.length ? ` · ${row.gaps.length} brecha(s)` : ' · evidencia lista'}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label>Decisión</Label><Select value={form.decisionType} onValueChange={(value) => setForm({ ...form, decisionType: value, replacementAssetCode: value === 'replacement_effective' ? form.replacementAssetCode : '' })}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="commissioned">Puesta en servicio</SelectItem><SelectItem value="closed">Cierre de renovación</SelectItem><SelectItem value="replacement_effective">Reemplazo efectivo</SelectItem></SelectContent></Select></div>
      <div className="space-y-2"><Label>Fecha explícita opcional</Label><Input type="date" value={form.commissioningDate} onChange={(event) => setForm({ ...form, commissioningDate: event.target.value })}/></div>
      {form.decisionType === 'replacement_effective' && <div className="space-y-2 md:col-span-2"><Label>Código exacto del activo de reemplazo</Label><Input placeholder="Debe existir previamente en activos canónicos" value={form.replacementAssetCode} onChange={(event) => setForm({ ...form, replacementAssetCode: event.target.value })}/></div>}
      <div className="space-y-2 md:col-span-2"><Label>Fundamento</Label><Textarea rows={3} value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })}/></div>
      <div className="space-y-2 md:col-span-2"><Label>Evidencia o referencia</Label><Input value={form.evidenceReference} onChange={(event) => setForm({ ...form, evidenceReference: event.target.value })}/></div>
      <div className="md:col-span-2"><Button disabled={saving || !form.initiativeId || !form.reason || (form.decisionType === 'replacement_effective' && !form.replacementAssetCode)}>Guardar propuesta</Button></div>
    </form></CardContent></Card>

    <Input placeholder="Buscar activo o decisión" value={query} onChange={(event) => setQuery(event.target.value)}/>
    <Card className="shadow-none"><CardHeader><CardTitle className="text-lg">Cierre de renovación · {filtered.length}</CardTitle></CardHeader><CardContent className="p-0">{error ? <div className="p-6 text-sm text-muted-foreground">No se pudo cargar el cierre de renovación.</div> : isLoading ? <div className="p-6 text-sm text-muted-foreground">Cargando…</div> : filtered.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No existen iniciativas de renovación. El cierre permanece vacío hasta que exista una ejecución real completada.</div> : <div className="divide-y border-t">{filtered.map((row) => <div key={row.initiative.id} className="p-4"><div className="flex flex-col gap-4 xl:flex-row xl:justify-between"><div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2"><Badge variant={row.initiative.status === 'completed' ? 'default' : 'secondary'}>{row.initiative.status === 'completed' ? 'Ejecución completada' : row.initiative.status}</Badge>{row.decision ? <Badge variant={row.decision.status === 'approved' ? 'default' : 'secondary'}>{decisionLabels[row.decision.decision_type] || row.decision.decision_type} · {row.decision.status}</Badge> : <Badge variant="outline">Sin decisión de cierre</Badge>}{row.gaps.length > 0 ? <Badge variant="destructive"><AlertTriangle className="mr-1 h-3 w-3"/>{row.gaps.length} brecha(s)</Badge> : <Badge variant="outline"><CheckCircle2 className="mr-1 h-3 w-3"/>Evidencia lista</Badge>}</div>
        <p className="mt-3 font-medium">{row.previousAsset ? `${row.previousAsset.asset_code} · ${row.previousAsset.name}` : 'Activo anterior no disponible'}</p>
        {row.replacementAsset && <p className="mt-1 text-sm">Reemplazo: <strong>{row.replacementAsset.asset_code} · {row.replacementAsset.name}</strong></p>}
        {row.decision && <p className="mt-2 text-sm">{row.decision.reason}</p>}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Evidencia vinculada</p><p className="text-lg font-semibold">{row.evidence.executionLinks}</p></div><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">OT completadas</p><p className="text-lg font-semibold">{row.evidence.completedWorkOrders}/{row.evidence.workOrders}</p></div><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">OC recibidas</p><p className="text-lg font-semibold">{row.evidence.receivedPurchaseOrders}/{row.evidence.purchaseOrders}</p></div><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Contratos documentados</p><p className="text-lg font-semibold">{row.evidence.documentedContracts}/{row.evidence.contracts}</p></div></div>
        {row.gaps.length > 0 && <div className="mt-3 space-y-1 text-sm text-destructive">{row.gaps.map((gap) => <p key={gap}>• {gap}</p>)}</div>}</div>
        <div className="shrink-0 flex flex-wrap gap-2">{row.decision?.status === 'proposed' && <Button size="sm" disabled={!row.readyToApprove} onClick={() => void changeStatus(row.decision!.id, 'approved')}><CheckCircle2 className="mr-2 h-4 w-4"/>Aprobar cierre</Button>}{row.decision?.status === 'proposed' && <Button size="sm" variant="outline" onClick={() => void changeStatus(row.decision!.id, 'rejected')}>Rechazar</Button>}{row.decision?.status === 'approved' && <Button size="sm" variant="outline" onClick={() => void changeStatus(row.decision!.id, 'inactive')}>Inactivar</Button>}</div></div></div>)}</div>}</CardContent></Card>
    <p className="text-xs text-muted-foreground">Aprobar el cierre registra una decisión trazable. No cambia `is_active`, códigos, nombres, origen ni payload de ningún activo canónico; cualquier baja física o alta de activos debe existir previamente en el modelo de activos.</p>
  </div>;
}
