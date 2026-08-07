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
type Decision = { id: string; previous_asset_id: string; replacement_asset_id: string | null; decision_type: string; commissioning_date: string | null; reason: string; approved_at: string | null };
type PeriodMetrics = { days: number; workOrders: number; preventiveWorkOrders: number; predictiveWorkOrders: number; correctiveWorkOrders: number; workOrderRate30d: number; costRecords: number; totalCost: number; costRate30d: number; downtimeRecords: number; downtimeHours: number; downtimeRate30d: number; sensorReadings: number; telemetryEvents: number; criticalTelemetryEvents: number };
type Evidence = { generatedAt: string; baseline: PeriodMetrics; post: PeriodMetrics; currentPreventiveSchedules: number; comparableSources: string[]; gaps: string[] };
type Validation = { id: string; baseline_start_date: string; baseline_end_date: string; post_start_date: string; post_end_date: string; result: string; status: string; reason: string; evidence_reference: string | null; evidence_snapshot: Evidence | null; proposed_at: string; approved_at: string | null };
type Item = { decision: Decision; previousAsset: Asset | null; evaluatedAsset: Asset | null; validation: Validation | null; evidence: Evidence | null; approvedEvidence: Evidence | null; eligibilityGaps: string[]; canPropose: boolean };
type Data = { counts: { approvedClosures: number; eligible: number; proposed: number; approved: number; withoutCommissioningDate: number; withEvidenceGaps: number }; items: Item[]; generatedAt: string };

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar');
  return payload as Data;
};
const amount = (value: number) => new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 }).format(value || 0);
const resultLabel: Record<string, string> = { satisfactory: 'Satisfactorio', requires_follow_up: 'Requiere seguimiento', insufficient_evidence: 'Evidencia insuficiente' };
const sourceLabel: Record<string, string> = { work_orders: 'OT', costs: 'Costos', downtime: 'Downtime', preventive: 'Preventivos', telemetry: 'Telemetría' };

function MetricPair({ label, baseline, post, suffix = '' }: { label: string; baseline: string | number; post: string | number; suffix?: string }) {
  return <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{label}</p><div className="mt-2 grid grid-cols-2 gap-3"><div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Antes</p><p className="text-lg font-semibold">{baseline}{suffix}</p></div><div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Después</p><p className="text-lg font-semibold">{post}{suffix}</p></div></div></div>;
}

export default function RenewalPostValidationPage() {
  const { data, error, isLoading, isValidating, mutate } = useSWR('/api/maintenance/renewal-post-validation', fetcher, { revalidateOnFocus: false });
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({ commissioningDecisionId: '', baselineStart: '', baselineEnd: '', postStart: '', postEnd: '', result: 'insufficient_evidence', reason: '', evidenceReference: '' });
  const candidates = useMemo(() => data?.items.filter((row) => row.canPropose) || [], [data?.items]);
  const filtered = useMemo(() => (data?.items || []).filter((row) => !query.trim() || `${row.previousAsset?.asset_code || ''} ${row.previousAsset?.name || ''} ${row.evaluatedAsset?.asset_code || ''} ${row.validation?.result || ''} ${row.validation?.status || ''}`.toLowerCase().includes(query.toLowerCase())), [data?.items, query]);

  async function propose(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage(null);
    const response = await fetch('/api/maintenance/renewal-post-validation', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) });
    const payload = await response.json().catch(() => null); setSaving(false);
    if (!response.ok) { setMessage(payload?.error || 'No se pudo crear la validación.'); return; }
    setForm({ commissioningDecisionId: '', baselineStart: '', baselineEnd: '', postStart: '', postEnd: '', result: 'insufficient_evidence', reason: '', evidenceReference: '' });
    setMessage('Validación propuesta. Motil calculará únicamente evidencia registrada en los períodos seleccionados.');
    await mutate();
  }

  async function changeStatus(id: string, status: string) {
    setMessage(null);
    const response = await fetch('/api/maintenance/renewal-post-validation', { method: 'PATCH', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, status }) });
    const payload = await response.json().catch(() => null);
    if (!response.ok) { setMessage(payload?.error || 'No se pudo actualizar la validación.'); return; }
    setMessage(status === 'approved' ? 'Validación aprobada y evidencia comparativa congelada como snapshot de auditoría.' : 'Validación actualizada.');
    await mutate();
  }

  const counts = data?.counts;
  return <div className="space-y-6">
    <section className="flex flex-col gap-4 border-b border-border/70 pb-6 md:flex-row md:items-end md:justify-between"><div><p className="text-sm font-medium text-muted-foreground">Mantenimiento · Renovación</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Validación post-puesta en servicio</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Compara períodos explícitos antes y después usando solo OT, costos, downtime, preventivos y telemetría realmente registrados. Motil presenta evidencia y tasas normalizadas; la conclusión final es humana.</p></div><div className="flex gap-2"><Button variant="outline" asChild><Link href="/dashboard/mantenimiento/puesta-servicio">Puesta en servicio</Link></Button><Button variant="outline" onClick={() => void mutate()} disabled={isValidating}><RefreshCw className={`mr-2 h-4 w-4 ${isValidating ? 'animate-spin' : ''}`}/>Actualizar</Button></div></section>

    {message && <Card className="shadow-none"><CardContent className="p-4 text-sm">{message}</CardContent></Card>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">{[['Cierres aprobados', counts?.approvedClosures || 0], ['Elegibles', counts?.eligible || 0], ['Propuestas', counts?.proposed || 0], ['Validadas', counts?.approved || 0], ['Sin fecha puesta servicio', counts?.withoutCommissioningDate || 0], ['Con brechas', counts?.withEvidenceGaps || 0]].map(([label, value]) => <Card key={String(label)} className="shadow-none"><CardContent className="p-4"><p className="text-2xl font-semibold">{Number(value).toLocaleString('es-CL')}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></CardContent></Card>)}</div>

    <Card className="shadow-none"><CardHeader><CardTitle className="text-lg">Proponer validación</CardTitle></CardHeader><CardContent><form onSubmit={propose} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2 md:col-span-2"><Label>Cierre aprobado con fecha de puesta en servicio</Label><Select value={form.commissioningDecisionId} onValueChange={(value) => setForm({ ...form, commissioningDecisionId: value })}><SelectTrigger><SelectValue placeholder="Seleccionar cierre"/></SelectTrigger><SelectContent>{candidates.map((row) => <SelectItem key={row.decision.id} value={row.decision.id}>{row.previousAsset?.asset_code} · {row.previousAsset?.name}{row.evaluatedAsset?.id !== row.previousAsset?.id ? ` → ${row.evaluatedAsset?.asset_code}` : ''} · puesta en servicio {row.decision.commissioning_date}</SelectItem>)}</SelectContent></Select></div>
      <div className="rounded-lg border p-4 md:col-span-2"><p className="text-sm font-medium">Período base</p><p className="mt-1 text-xs text-muted-foreground">Debe terminar antes de la fecha explícita de puesta en servicio.</p><div className="mt-3 grid gap-3 md:grid-cols-2"><div className="space-y-2"><Label>Desde</Label><Input type="date" value={form.baselineStart} onChange={(event) => setForm({ ...form, baselineStart: event.target.value })}/></div><div className="space-y-2"><Label>Hasta</Label><Input type="date" value={form.baselineEnd} onChange={(event) => setForm({ ...form, baselineEnd: event.target.value })}/></div></div></div>
      <div className="rounded-lg border p-4 md:col-span-2"><p className="text-sm font-medium">Período posterior</p><p className="mt-1 text-xs text-muted-foreground">No puede comenzar antes de la puesta en servicio ni incluir fechas futuras.</p><div className="mt-3 grid gap-3 md:grid-cols-2"><div className="space-y-2"><Label>Desde</Label><Input type="date" value={form.postStart} onChange={(event) => setForm({ ...form, postStart: event.target.value })}/></div><div className="space-y-2"><Label>Hasta</Label><Input type="date" value={form.postEnd} onChange={(event) => setForm({ ...form, postEnd: event.target.value })}/></div></div></div>
      <div className="space-y-2"><Label>Resultado humano</Label><Select value={form.result} onValueChange={(value) => setForm({ ...form, result: value })}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="satisfactory">Satisfactorio</SelectItem><SelectItem value="requires_follow_up">Requiere seguimiento</SelectItem><SelectItem value="insufficient_evidence">Evidencia insuficiente</SelectItem></SelectContent></Select></div>
      <div className="space-y-2"><Label>Referencia de evidencia opcional</Label><Input value={form.evidenceReference} onChange={(event) => setForm({ ...form, evidenceReference: event.target.value })}/></div>
      <div className="space-y-2 md:col-span-2"><Label>Fundamento</Label><Textarea rows={3} value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })}/></div>
      <div className="md:col-span-2"><Button disabled={saving || !form.commissioningDecisionId || !form.baselineStart || !form.baselineEnd || !form.postStart || !form.postEnd || !form.reason}>Guardar propuesta</Button></div>
    </form></CardContent></Card>

    <Input placeholder="Buscar activo o resultado" value={query} onChange={(event) => setQuery(event.target.value)}/>
    <Card className="shadow-none"><CardHeader><CardTitle className="text-lg">Resultados de renovación · {filtered.length}</CardTitle></CardHeader><CardContent className="p-0">{error ? <div className="p-6 text-sm text-muted-foreground">No se pudo cargar la validación post-puesta en servicio.</div> : isLoading ? <div className="p-6 text-sm text-muted-foreground">Cargando…</div> : filtered.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No existen cierres aprobados. Esta etapa permanecerá vacía hasta que Bloque 35 tenga una aprobación real.</div> : <div className="divide-y border-t">{filtered.map((row) => {
      const evidence = row.validation?.status === 'approved' && row.approvedEvidence ? row.approvedEvidence : row.evidence;
      return <div key={row.decision.id} className="p-4"><div className="flex flex-col gap-4 xl:flex-row xl:justify-between"><div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2"><Badge variant="outline">Cierre aprobado</Badge>{row.validation ? <Badge variant={row.validation.status === 'approved' ? 'default' : 'secondary'}>{resultLabel[row.validation.result] || row.validation.result} · {row.validation.status}</Badge> : <Badge variant="secondary">Sin validación</Badge>}{row.eligibilityGaps.length > 0 && <Badge variant="destructive"><AlertTriangle className="mr-1 h-3 w-3"/>{row.eligibilityGaps.length} brecha(s)</Badge>}{evidence && evidence.comparableSources.length > 0 && <Badge variant="outline"><CheckCircle2 className="mr-1 h-3 w-3"/>{evidence.comparableSources.length} fuente(s) comparables</Badge>}</div>
        <p className="mt-3 font-medium">{row.previousAsset ? `${row.previousAsset.asset_code} · ${row.previousAsset.name}` : 'Activo anterior no disponible'}{row.evaluatedAsset?.id !== row.previousAsset?.id ? ` → ${row.evaluatedAsset?.asset_code} · ${row.evaluatedAsset?.name}` : ''}</p>
        <p className="mt-1 text-xs text-muted-foreground">Puesta en servicio: {row.decision.commissioning_date || 'sin fecha explícita'}</p>
        {row.validation && <><p className="mt-2 text-sm">{row.validation.reason}</p><p className="mt-1 text-xs text-muted-foreground">Base: {row.validation.baseline_start_date} a {row.validation.baseline_end_date} · Posterior: {row.validation.post_start_date} a {row.validation.post_end_date}</p></>}
        {row.eligibilityGaps.length > 0 && <div className="mt-3 space-y-1 text-sm text-destructive">{row.eligibilityGaps.map((gap) => <p key={gap}>• {gap}</p>)}</div>}
        {evidence && <><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3"><MetricPair label="OT registradas" baseline={evidence.baseline.workOrders} post={evidence.post.workOrders}/><MetricPair label="OT / 30 días" baseline={evidence.baseline.workOrderRate30d} post={evidence.post.workOrderRate30d}/><MetricPair label="Costo OT registrado" baseline={amount(evidence.baseline.totalCost)} post={amount(evidence.post.totalCost)}/><MetricPair label="Costo / 30 días" baseline={amount(evidence.baseline.costRate30d)} post={amount(evidence.post.costRate30d)}/><MetricPair label="Downtime registrado" baseline={amount(evidence.baseline.downtimeHours)} post={amount(evidence.post.downtimeHours)} suffix=" h"/><MetricPair label="OT preventivas" baseline={evidence.baseline.preventiveWorkOrders} post={evidence.post.preventiveWorkOrders}/><MetricPair label="Lecturas telemetría" baseline={evidence.baseline.sensorReadings} post={evidence.post.sensorReadings}/><MetricPair label="Eventos telemetría" baseline={evidence.baseline.telemetryEvents} post={evidence.post.telemetryEvents}/><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Preventivos activos actuales</p><p className="mt-2 text-lg font-semibold">{evidence.currentPreventiveSchedules}</p><p className="text-xs text-muted-foreground">No se usa como comparación histórica.</p></div></div><div className="mt-3 flex flex-wrap gap-2">{evidence.comparableSources.map((source) => <Badge key={source} variant="outline">Comparable: {sourceLabel[source] || source}</Badge>)}</div>{evidence.gaps.length > 0 && <div className="mt-3 space-y-1 text-sm text-muted-foreground">{evidence.gaps.map((gap) => <p key={gap}>• {gap}</p>)}</div>}</>}
      </div><div className="shrink-0 flex flex-wrap gap-2">{row.validation?.status === 'proposed' && <Button size="sm" onClick={() => void changeStatus(row.validation!.id, 'approved')}><CheckCircle2 className="mr-2 h-4 w-4"/>Aprobar validación</Button>}{row.validation?.status === 'proposed' && <Button size="sm" variant="outline" onClick={() => void changeStatus(row.validation!.id, 'rejected')}>Rechazar</Button>}{row.validation?.status === 'approved' && <Button size="sm" variant="outline" onClick={() => void changeStatus(row.validation!.id, 'inactive')}>Inactivar</Button>}</div></div></div>;
    })}</div>}</CardContent></Card>
    <p className="text-xs text-muted-foreground">Las tasas por 30 días normalizan ventanas de distinta duración, pero no constituyen una conclusión automática. Un resultado satisfactorio requiere al menos una fuente con registros comparables en ambos períodos. Al aprobar, Motil guarda un snapshot de la evidencia observada sin modificar OT, activos, telemetría ni datos canónicos.</p>
  </div>;
}
