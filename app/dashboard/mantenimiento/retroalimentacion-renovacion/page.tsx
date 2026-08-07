'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import useSWR from 'swr';
import { CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type Validation = { id: string; result: string; reason: string; evidence_reference: string | null; approved_at: string | null };
type Asset = { id: string; asset_code: string; name: string; asset_type: string | null; is_active: boolean };
type Feedback = { id: string; feedback_type: string; status: string; reason: string; evidence_reference: string | null; proposed_at: string; decided_at: string | null; decision_note: string | null };
type Strategy = { criticality_level: string; maintenance_strategy: string; reason: string } | null;
type Lifecycle = { decision_type: string; status: string; reason: string; target_date: string | null } | null;
type Preventive = { id: string; task_name: string; frequency_days: number | null };
type Item = { validation: Validation; asset: Asset | null; sourceAsset: Asset | null; currentContext: { strategy: Strategy; lifecycle: Lifecycle; preventives: Preventive[] }; feedback: Feedback[]; evidence: { comparableSources: string[]; gaps: string[] } };
type Data = { counts: { approvedValidations: number; proposed: number; accepted: number; discarded: number; withoutFeedback: number }; items: Item[]; generatedAt: string; integrityRule: string };

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la retroalimentación.');
  return payload as Data;
};
const resultLabels: Record<string, string> = { satisfactory: 'Satisfactorio', requires_follow_up: 'Requiere seguimiento', insufficient_evidence: 'Evidencia insuficiente' };
const feedbackLabels: Record<string, string> = { strategy_review: 'Revisar estrategia', preventive_frequency_review: 'Revisar frecuencia preventiva', lifecycle_review: 'Revisar ciclo de vida' };
const statusLabels: Record<string, string> = { proposed: 'Propuesta', accepted: 'Aceptada', discarded: 'Descartada', inactive: 'Inactiva' };

export default function RenewalFeedbackPage() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<Data>('/api/maintenance/renewal-feedback', fetcher, { revalidateOnFocus: false });
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ validationId: '', feedbackType: 'strategy_review', reason: '', evidenceReference: '' });

  const filtered = useMemo(() => (data?.items || []).filter((row) => {
    const haystack = `${row.asset?.asset_code || ''} ${row.asset?.name || ''} ${row.validation.result} ${row.feedback.map((item) => item.feedback_type).join(' ')}`.toLowerCase();
    return !query.trim() || haystack.includes(query.trim().toLowerCase());
  }), [data?.items, query]);

  async function propose(event: FormEvent) {
    event.preventDefault();
    setSaving(true); setMessage(null);
    const response = await fetch('/api/maintenance/renewal-feedback', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) });
    const payload = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok) { setMessage(payload?.error || 'No se pudo registrar la propuesta.'); return; }
    setForm({ validationId: '', feedbackType: 'strategy_review', reason: '', evidenceReference: '' });
    setMessage('Propuesta registrada para revisión humana. No se modificó ninguna fuente operacional.');
    await mutate();
  }

  async function decide(id: string, status: 'accepted' | 'discarded' | 'inactive') {
    setMessage(null);
    const decisionNote = decisionNotes[id] || '';
    const response = await fetch('/api/maintenance/renewal-feedback', { method: 'PATCH', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, status, decisionNote }) });
    const payload = await response.json().catch(() => null);
    if (!response.ok) { setMessage(payload?.error || 'No se pudo registrar la decisión.'); return; }
    setDecisionNotes((current) => ({ ...current, [id]: '' }));
    setMessage(status === 'accepted' ? 'Retroalimentación aceptada como insumo de revisión. No se aplicó ningún cambio automático.' : status === 'discarded' ? 'Retroalimentación descartada con decisión trazable.' : 'Retroalimentación aceptada inactivada.');
    await mutate();
  }

  const counts = data?.counts;
  return <div className="space-y-6">
    <section className="flex flex-col gap-4 border-b border-border/70 pb-6 md:flex-row md:items-end md:justify-between">
      <div><p className="text-sm font-medium text-muted-foreground">Mantenimiento · Renovación</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Retroalimentación verificada</h1><p className="mt-2 max-w-4xl text-sm text-muted-foreground">Convierte validaciones aprobadas en propuestas explícitas de revisión de estrategia, frecuencia preventiva o ciclo de vida. La decisión humana queda registrada antes de cualquier cambio operacional.</p></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" asChild><Link href="/dashboard/mantenimiento/cartera-renovacion">Cartera</Link></Button><Button variant="outline" onClick={() => void mutate()} disabled={isValidating}><RefreshCw className={`mr-2 h-4 w-4 ${isValidating ? 'animate-spin' : ''}`}/>Actualizar</Button></div>
    </section>

    {message && <Card className="shadow-none"><CardContent className="p-4 text-sm">{message}</CardContent></Card>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{[['Validaciones aprobadas', counts?.approvedValidations || 0], ['Sin retroalimentación', counts?.withoutFeedback || 0], ['Propuestas', counts?.proposed || 0], ['Aceptadas', counts?.accepted || 0], ['Descartadas', counts?.discarded || 0]].map(([label, value]) => <Card key={String(label)} className="shadow-none"><CardContent className="p-4"><p className="text-2xl font-semibold">{Number(value).toLocaleString('es-CL')}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></CardContent></Card>)}</div>

    <Card className="shadow-none"><CardHeader><CardTitle className="text-lg">Proponer revisión</CardTitle><CardDescription>La propuesta debe partir de una validación aprobada. El tipo de revisión lo selecciona una persona; Motil no lo infiere automáticamente.</CardDescription></CardHeader><CardContent><form onSubmit={propose} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2 md:col-span-2"><Label>Validación aprobada</Label><Select value={form.validationId} onValueChange={(value) => setForm({ ...form, validationId: value })}><SelectTrigger><SelectValue placeholder="Seleccionar validación"/></SelectTrigger><SelectContent>{(data?.items || []).map((row) => <SelectItem key={row.validation.id} value={row.validation.id}>{row.asset ? `${row.asset.asset_code} · ${row.asset.name}` : 'Activo no disponible'} · {resultLabels[row.validation.result] || row.validation.result}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label>Tipo de revisión</Label><Select value={form.feedbackType} onValueChange={(value) => setForm({ ...form, feedbackType: value })}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="strategy_review">Estrategia de mantenimiento</SelectItem><SelectItem value="preventive_frequency_review">Frecuencia preventiva</SelectItem><SelectItem value="lifecycle_review">Ciclo de vida</SelectItem></SelectContent></Select></div>
      <div className="space-y-2"><Label>Referencia de evidencia opcional</Label><Input value={form.evidenceReference} onChange={(event) => setForm({ ...form, evidenceReference: event.target.value })}/></div>
      <div className="space-y-2 md:col-span-2"><Label>Fundamento de revisión</Label><Textarea rows={3} value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })}/></div>
      <div className="md:col-span-2"><Button disabled={saving || !form.validationId || !form.reason}>Guardar propuesta</Button></div>
    </form></CardContent></Card>

    <Input placeholder="Buscar activo, resultado o tipo de revisión" value={query} onChange={(event) => setQuery(event.target.value)}/>
    <Card className="shadow-none"><CardHeader><CardTitle className="text-lg">Resultados aprobados · {filtered.length}</CardTitle><CardDescription>{data?.integrityRule || 'Aceptar una revisión no modifica automáticamente las fuentes operacionales.'}</CardDescription></CardHeader><CardContent className="p-0">{error ? <div className="p-6 text-sm text-destructive">{error.message}</div> : isLoading ? <div className="p-6 text-sm text-muted-foreground">Cargando…</div> : filtered.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No existen validaciones aprobadas. La retroalimentación permanece vacía sin datos simulados.</div> : <div className="divide-y border-t">{filtered.map((row) => <div key={row.validation.id} className="p-5"><div className="flex flex-col gap-4 xl:flex-row xl:justify-between"><div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2"><Badge variant={row.validation.result === 'requires_follow_up' ? 'destructive' : 'outline'}>{resultLabels[row.validation.result] || row.validation.result}</Badge><Badge variant="outline">Fuentes comparables: {row.evidence.comparableSources.length}</Badge>{row.evidence.gaps.length > 0 && <Badge variant="secondary">Brechas: {row.evidence.gaps.length}</Badge>}</div><p className="mt-3 font-medium">{row.asset ? `${row.asset.asset_code} · ${row.asset.name}` : 'Activo evaluado no disponible'}</p><p className="mt-2 text-sm">{row.validation.reason}</p><div className="mt-4 grid gap-3 md:grid-cols-3"><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Estrategia vigente</p><p className="mt-1 text-sm font-medium">{row.currentContext.strategy ? `${row.currentContext.strategy.criticality_level} · ${row.currentContext.strategy.maintenance_strategy}` : 'Sin estrategia aprobada'}</p></div><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Preventivos activos</p><p className="mt-1 text-sm font-medium">{row.currentContext.preventives.length}</p></div><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Ciclo de vida</p><p className="mt-1 text-sm font-medium">{row.currentContext.lifecycle ? `${row.currentContext.lifecycle.decision_type} · ${row.currentContext.lifecycle.status}` : 'Sin decisión activa'}</p></div></div>
        {row.feedback.length > 0 && <div className="mt-4 space-y-3">{row.feedback.map((feedback) => <div key={feedback.id} className="rounded-lg border p-4"><div className="flex flex-wrap gap-2"><Badge variant="outline">{feedbackLabels[feedback.feedback_type] || feedback.feedback_type}</Badge><Badge variant={feedback.status === 'accepted' ? 'default' : feedback.status === 'discarded' ? 'secondary' : 'outline'}>{statusLabels[feedback.status] || feedback.status}</Badge></div><p className="mt-2 text-sm">{feedback.reason}</p>{feedback.decision_note && <p className="mt-2 text-xs text-muted-foreground">Decisión: {feedback.decision_note}</p>}{feedback.status === 'proposed' && <div className="mt-3 space-y-2"><Input placeholder="Nota obligatoria para aceptar o descartar" value={decisionNotes[feedback.id] || ''} onChange={(event) => setDecisionNotes((current) => ({ ...current, [feedback.id]: event.target.value }))}/><div className="flex flex-wrap gap-2"><Button size="sm" disabled={!decisionNotes[feedback.id]?.trim()} onClick={() => void decide(feedback.id, 'accepted')}><CheckCircle2 className="mr-2 h-4 w-4"/>Aceptar revisión</Button><Button size="sm" variant="outline" disabled={!decisionNotes[feedback.id]?.trim()} onClick={() => void decide(feedback.id, 'discarded')}><XCircle className="mr-2 h-4 w-4"/>Descartar</Button></div></div>}{feedback.status === 'accepted' && <Button className="mt-3" size="sm" variant="outline" onClick={() => void decide(feedback.id, 'inactive')}>Inactivar</Button>}</div>)}</div>}</div></div></div>)}</div>}</CardContent></Card>
    <p className="text-xs text-muted-foreground">Una retroalimentación aceptada es autorización para revisar la fuente correspondiente, no una orden de modificación automática. Estrategias, frecuencias preventivas y decisiones de ciclo de vida conservan sus propios flujos y trazabilidad.</p>
  </div>;
}
