'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type ResultState = 'validated' | 'requires_follow_up' | 'pending_evidence' | 'not_validated';
type Asset = { id: string; asset_code: string; name: string; asset_type: string | null; is_active: boolean };
type CostCenter = { id: string; code: string; name: string };
type Financial = { targetAmount: number; purchaseOrderCommitment: number; contractCommitment: number; contractPaid: number; workOrderActualCost: number };
type Item = {
  need: { id: string; target_amount: number | string; target_date: string | null; reason: string; approved_at: string | null };
  asset: Asset | null;
  replacementAsset: Asset | null;
  costCenter: CostCenter | null;
  initiative: { id: string; status: string; started_at: string | null; completed_at: string | null } | null;
  closure: { id: string; status: string; decision_type: string; commissioning_date: string | null; approved_at: string | null } | null;
  validation: { id: string; result: string; status: string; reason: string; approved_at: string | null } | null;
  resultState: ResultState;
  stage: string;
  financial: Financial;
  comparableSources: string[];
  gaps: string[];
};
type CenterSummary = { costCenter: CostCenter | null; counts: { renewals: number; validated: number; requiresFollowUp: number; pendingEvidence: number; notValidated: number }; financial: Financial };
type Data = {
  counts: { renewals: number; validated: number; requiresFollowUp: number; pendingEvidence: number; notValidated: number; withGaps: number };
  items: Item[];
  centers: CenterSummary[];
  generatedAt: string;
  financialRule: string;
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la cartera.');
  return payload as Data;
};
const money = (value: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value || 0);
const resultLabels: Record<ResultState, string> = {
  validated: 'Validada',
  requires_follow_up: 'Seguimiento requerido',
  pending_evidence: 'Evidencia pendiente',
  not_validated: 'Sin validación',
};
const stageLabels: Record<string, string> = {
  investment_approved: 'Inversión aprobada',
  execution_planned: 'Ejecución planificada',
  execution_in_progress: 'Ejecución en curso',
  execution_completed: 'Ejecución completada',
  awaiting_closure: 'Esperando cierre',
  closure_proposed: 'Cierre propuesto',
  awaiting_validation: 'Esperando validación',
  validation_proposed: 'Validación propuesta',
  validation_satisfactory: 'Resultado satisfactorio',
  validation_requires_follow_up: 'Seguimiento requerido',
  validation_insufficient_evidence: 'Evidencia insuficiente',
};

export default function RenewalPortfolioPage() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<Data>('/api/maintenance/renewal-portfolio', fetcher, { revalidateOnFocus: false });
  const [query, setQuery] = useState('');
  const [state, setState] = useState('all');
  const filtered = useMemo(() => (data?.items || []).filter((row) => {
    if (state !== 'all' && row.resultState !== state) return false;
    const haystack = `${row.asset?.asset_code || ''} ${row.asset?.name || ''} ${row.replacementAsset?.asset_code || ''} ${row.costCenter?.code || ''} ${row.costCenter?.name || ''} ${row.stage}`.toLowerCase();
    return !query.trim() || haystack.includes(query.trim().toLowerCase());
  }), [data?.items, query, state]);

  const counts = data?.counts;
  return <div className="space-y-6">
    <section className="flex flex-col gap-4 border-b border-border/70 pb-6 md:flex-row md:items-end md:justify-between">
      <div><p className="text-sm font-medium text-muted-foreground">Mantenimiento · Renovación</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Gobernanza de cartera de renovación</h1><p className="mt-2 max-w-4xl text-sm text-muted-foreground">Vista ejecutiva de necesidades aprobadas, ejecución, cierre y validación. Los compromisos de OC, contratos, pagos y costos reales de OT se mantienen separados para evitar doble conteo.</p></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" asChild><Link href="/dashboard/mantenimiento/validacion-renovacion">Validación</Link></Button><Button variant="outline" onClick={() => void mutate()} disabled={isValidating}><RefreshCw className={`mr-2 h-4 w-4 ${isValidating ? 'animate-spin' : ''}`}/>Actualizar</Button></div>
    </section>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">{[
      ['Renovaciones', counts?.renewals || 0], ['Validadas', counts?.validated || 0], ['Seguimiento', counts?.requiresFollowUp || 0], ['Evidencia pendiente', counts?.pendingEvidence || 0], ['Sin validación', counts?.notValidated || 0], ['Con brechas', counts?.withGaps || 0],
    ].map(([label, value]) => <Card key={String(label)} className="shadow-none"><CardContent className="p-4"><p className="text-2xl font-semibold">{Number(value).toLocaleString('es-CL')}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></CardContent></Card>)}</div>

    <Card className="shadow-none"><CardHeader><CardTitle className="text-base">Regla financiera</CardTitle><CardDescription>{data?.financialRule || 'Cada fuente financiera se presenta por separado; no se construye un total mezclando compromisos, pagos y costos reales.'}</CardDescription></CardHeader></Card>

    <Card className="shadow-none"><CardHeader><CardTitle className="text-lg">Resumen por centro de costo</CardTitle><CardDescription>Agregación dentro de cada fuente, deduplicando referencias vinculadas. Las columnas financieras no deben sumarse entre sí.</CardDescription></CardHeader><CardContent className="p-0">{isLoading ? <div className="p-6 text-sm text-muted-foreground">Cargando…</div> : (data?.centers.length || 0) === 0 ? <div className="p-6 text-sm text-muted-foreground">No existen necesidades de inversión aprobadas; la cartera permanece vacía sin datos simulados.</div> : <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Centro de costo</TableHead><TableHead className="text-right">Renovaciones</TableHead><TableHead className="text-right">Objetivo</TableHead><TableHead className="text-right">OC comprometidas</TableHead><TableHead className="text-right">Contratos</TableHead><TableHead className="text-right">Pagos contrato</TableHead><TableHead className="text-right">Costo real OT</TableHead></TableRow></TableHeader><TableBody>{data?.centers.map((row, index) => <TableRow key={row.costCenter?.id || `center-${index}`}><TableCell><p className="font-medium">{row.costCenter?.code || 'Sin centro'}</p><p className="text-xs text-muted-foreground">{row.costCenter?.name || 'Centro de costo no disponible'}</p></TableCell><TableCell className="text-right">{row.counts.renewals}</TableCell><TableCell className="text-right">{money(row.financial.targetAmount)}</TableCell><TableCell className="text-right">{money(row.financial.purchaseOrderCommitment)}</TableCell><TableCell className="text-right">{money(row.financial.contractCommitment)}</TableCell><TableCell className="text-right">{money(row.financial.contractPaid)}</TableCell><TableCell className="text-right">{money(row.financial.workOrderActualCost)}</TableCell></TableRow>)}</TableBody></Table></div>}</CardContent></Card>

    <div className="grid gap-3 md:grid-cols-[1fr_240px]"><Input placeholder="Buscar activo o centro de costo" value={query} onChange={(event) => setQuery(event.target.value)}/><Select value={state} onValueChange={setState}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Todos los resultados</SelectItem><SelectItem value="validated">Validadas</SelectItem><SelectItem value="requires_follow_up">Seguimiento requerido</SelectItem><SelectItem value="pending_evidence">Evidencia pendiente</SelectItem><SelectItem value="not_validated">Sin validación</SelectItem></SelectContent></Select></div>

    <Card className="shadow-none"><CardHeader><CardTitle className="text-lg">Cartera · {filtered.length}</CardTitle><CardDescription>Cada fila conserva la cadena operacional real desde la necesidad aprobada hasta el resultado post-puesta en servicio.</CardDescription></CardHeader><CardContent className="p-0">{error ? <div className="p-6 text-sm text-destructive">{error.message}</div> : isLoading ? <div className="p-6 text-sm text-muted-foreground">Cargando…</div> : filtered.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No hay renovaciones que cumplan el filtro actual.</div> : <div className="divide-y border-t">{filtered.map((row) => <div key={row.need.id} className="p-5"><div className="flex flex-col gap-4 xl:flex-row xl:justify-between"><div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2"><Badge variant={row.resultState === 'validated' ? 'default' : row.resultState === 'requires_follow_up' ? 'destructive' : 'secondary'}>{resultLabels[row.resultState]}</Badge><Badge variant="outline">{stageLabels[row.stage] || row.stage}</Badge>{row.gaps.length > 0 && <Badge variant="destructive"><AlertTriangle className="mr-1 h-3 w-3"/>{row.gaps.length} brecha(s)</Badge>}</div><p className="mt-3 font-medium">{row.asset ? `${row.asset.asset_code} · ${row.asset.name}` : 'Activo canónico no disponible'}{row.replacementAsset ? ` → ${row.replacementAsset.asset_code} · ${row.replacementAsset.name}` : ''}</p><p className="mt-1 text-xs text-muted-foreground">Centro de costo: {row.costCenter ? `${row.costCenter.code} · ${row.costCenter.name}` : 'no disponible'} · Objetivo: {money(row.financial.targetAmount)}</p>{row.validation && <p className="mt-2 text-sm">{row.validation.reason}</p>}{row.gaps.length > 0 && <div className="mt-3 space-y-1 text-sm text-destructive">{row.gaps.map((gap) => <p key={gap}>• {gap}</p>)}</div>}</div><div className="grid min-w-full gap-2 sm:grid-cols-2 xl:min-w-[560px] xl:grid-cols-2"><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">OC comprometidas</p><p className="mt-1 font-semibold">{money(row.financial.purchaseOrderCommitment)}</p></div><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Contratos comprometidos</p><p className="mt-1 font-semibold">{money(row.financial.contractCommitment)}</p></div><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Pagos contractuales</p><p className="mt-1 font-semibold">{money(row.financial.contractPaid)}</p></div><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Costo real OT</p><p className="mt-1 font-semibold">{money(row.financial.workOrderActualCost)}</p></div></div></div></div>)}</div>}</CardContent></Card>
  </div>;
}
