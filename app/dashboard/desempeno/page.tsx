'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, Gauge, ShieldAlert, Target, UserRound, Workflow } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Kpi = { cargo_name: string; domain?: string; kpi_key: string; label: string; unit: string; measured_value: number | null; target_value?: number | null; direction: string; evaluation_state: string };
type Gap = { domain: string; status: string; detail: string };
type Profile = { id: string; full_name: string | null; role: string | null; cargo_id: string | null; cargo_name: string | null };
type Initiative = { id: string; kaizen_number: string | null; title: string; category: string | null; priority: string | null; pdca_stage: string | null; status: string | null; target_date: string | null; expected_result: string | null; actual_result: string | null; estimated_saving: number | null; actual_saving: number | null; verified_at: string | null; standardized_at: string | null };
type Person = { id: string; fullName: string | null; role: string | null; cargoName: string; baselineCargo: string; baselineInherited: boolean; initiatives: Initiative[]; comparablePeriods: string[]; comparableClosures: number; evaluationEligible: boolean };
type Payload = { cargos: string[]; profiles?: Profile[]; rows: Kpi[]; executive: Kpi[]; person?: Person | null; evidenceGaps?: Gap[]; meta: { note: string; personalEvaluation: boolean; targetsDefined: boolean } };

function formatValue(value: number | null, unit: string) {
  if (value === null || value === undefined) return 'Sin dato';
  const maximumFractionDigits = unit === '%' || unit === 'h' || unit === 'nivel' ? 2 : 0;
  return `${new Intl.NumberFormat('es-CL', { maximumFractionDigits }).format(value)} ${unit}`;
}

function mergeScorecards(rows: Kpi[], executive: Kpi[]) {
  const merged = new Map<string, Kpi>();
  for (const row of [...executive, ...rows]) {
    const key = `${row.cargo_name}|${row.domain || ''}|${row.kpi_key}`;
    if (!merged.has(key)) merged.set(key, row);
  }
  return Array.from(merged.values());
}

const domainLabel: Record<string, string> = {
  production: 'Producción', mine: 'Mina', maintenance: 'Mantención', hse: 'HSE', risk: 'Riesgo', data_quality: 'Calidad de datos',
  inventory: 'Bodega', geology: 'Geología', drilling: 'Sondajes', procurement: 'Compras', finance: 'Finanzas', contracts: 'Contratos', documents: 'Documentos',
};

export default function DesempenoPage() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [selection, setSelection] = useState('TODOS');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController(); setLoading(true);
    const query = selection === 'TODOS' ? '' : selection.startsWith('PROFILE:') ? `?profileId=${encodeURIComponent(selection.slice(8))}` : `?cargo=${encodeURIComponent(selection)}`;
    fetch(`/api/desempeno/scorecards${query}`, { signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error((await response.json()).error || 'No fue posible cargar desempeño'); return response.json(); })
      .then((data) => { setPayload(data); setError(''); })
      .catch((err) => { if (err.name !== 'AbortError') setError(err.message); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [selection]);

  const rows = useMemo(() => !payload ? [] : mergeScorecards(payload.rows, payload.executive), [payload]);
  const domains = new Set(rows.map((row) => row.domain).filter(Boolean)).size;
  const withData = rows.filter((row) => row.measured_value !== null).length;
  const withoutTargets = rows.filter((row) => row.target_value === null || row.target_value === undefined).length;
  const person = payload?.person || null;
  const initiatives = person?.initiatives || [];
  const completedInitiatives = initiatives.filter((item) => ['completed', 'closed', 'verified', 'standardized'].includes((item.status || '').toLowerCase())).length;

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Gestión transversal</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Desempeño operacional</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Baseline por cargo y persona construido desde evidencia operacional. No corresponde a una evaluación personal mientras no existan metas aprobadas y atribución individual suficiente.</p></div>
      <Select value={selection} onValueChange={setSelection}><SelectTrigger className="w-full md:w-[340px]"><SelectValue placeholder="Seleccionar cargo o persona" /></SelectTrigger><SelectContent><SelectItem value="TODOS">Todos los cargos medidos</SelectItem>{(payload?.profiles || []).map((profile) => <SelectItem key={profile.id} value={`PROFILE:${profile.id}`}>{profile.full_name || 'Sin nombre'} · {profile.cargo_name || profile.role || 'Sin cargo'}</SelectItem>)}<SelectItem value="GERENTE">GERENTE · ejecutivo</SelectItem><SelectItem value="SUBGERENTE OP.">SUBGERENTE OP. · ejecutivo</SelectItem><SelectItem value="PRESIDENTE">PRESIDENTE · ejecutivo</SelectItem>{(payload?.cargos || []).filter((item) => !['GERENTE','SUBGERENTE OP.','PRESIDENTE'].includes(item)).map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
    </div>

    {error ? <Card><CardContent className="pt-5 text-sm text-destructive">{error}</CardContent></Card> : null}

    {person ? <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><div className="flex items-center gap-2"><UserRound className="h-5 w-5 text-muted-foreground" /><CardTitle>{person.fullName}</CardTitle></div><CardDescription className="mt-2">{person.cargoName || person.role || 'Sin cargo definido'} · Proyectos y Mejora Continua</CardDescription></div>
          <div className="flex flex-wrap gap-2"><Badge variant="outline">Baseline individual</Badge><Badge variant={person.evaluationEligible ? 'default' : 'neutral'}>{person.evaluationEligible ? 'Elegible para metas' : `${person.comparableClosures} de 3 cierres comparables`}</Badge></div>
        </div>
        {person.baselineInherited ? <p className="text-sm text-muted-foreground">El cargo {person.cargoName} utiliza temporalmente el baseline ejecutivo de {person.baselineCargo}. Esto no implica atribución personal de los resultados.</p> : null}
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Cierres comparables</p><p className="mt-2 text-2xl font-semibold tabular-nums">{person.comparableClosures}</p></div>
        <div className="rounded-lg border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Iniciativas Kaizen</p><p className="mt-2 text-2xl font-semibold tabular-nums">{initiatives.length}</p></div>
        <div className="rounded-lg border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Cerradas / verificadas</p><p className="mt-2 text-2xl font-semibold tabular-nums">{completedInitiatives}</p></div>
        <div className="rounded-lg border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Evaluación personal</p><p className="mt-2 text-sm font-medium">No activa</p></div>
      </CardContent>
    </Card> : null}

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card><CardHeader><CardDescription>Indicadores visibles</CardDescription><CardTitle className="flex items-center gap-2 text-2xl"><Gauge className="h-5 w-5 text-muted-foreground" />{loading ? '—' : rows.length}</CardTitle></CardHeader></Card>
      <Card><CardHeader><CardDescription>Con evidencia</CardDescription><CardTitle className="flex items-center gap-2 text-2xl"><Activity className="h-5 w-5 text-muted-foreground" />{loading ? '—' : withData}</CardTitle></CardHeader></Card>
      <Card><CardHeader><CardDescription>Dominios</CardDescription><CardTitle className="flex items-center gap-2 text-2xl"><ShieldAlert className="h-5 w-5 text-muted-foreground" />{loading ? '—' : domains || '—'}</CardTitle></CardHeader></Card>
      <Card><CardHeader><CardDescription>Sin meta aprobada</CardDescription><CardTitle className="flex items-center gap-2 text-2xl"><Target className="h-5 w-5 text-muted-foreground" />{loading ? '—' : withoutTargets}</CardTitle></CardHeader></Card>
    </div>

    <Card><CardHeader><div className="flex flex-wrap items-center gap-2"><CardTitle>Scorecard</CardTitle><Badge variant="outline">Baseline</Badge><Badge variant="neutral">No evaluación personal</Badge></div><CardDescription>{payload?.meta.note || 'Cargando evidencia operacional…'}</CardDescription></CardHeader><CardContent className="px-0 pb-0"><Table><TableHeader><TableRow><TableHead>Cargo / dominio</TableHead><TableHead>Indicador</TableHead><TableHead className="text-right">Valor</TableHead><TableHead>Dirección</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader><TableBody>{loading ? <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Cargando scorecard…</TableCell></TableRow> : rows.length === 0 ? <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No existen indicadores medidos para esta selección.</TableCell></TableRow> : rows.map((row,index) => <TableRow key={`${row.cargo_name}-${row.domain || 'general'}-${row.kpi_key}-${index}`}><TableCell><div className="font-medium">{person ? person.cargoName : row.cargo_name}</div>{row.domain ? <div className="text-xs text-muted-foreground">{domainLabel[row.domain] || row.domain}</div> : null}</TableCell><TableCell>{row.label}</TableCell><TableCell className="text-right font-medium tabular-nums">{formatValue(row.measured_value,row.unit)}</TableCell><TableCell className="text-xs text-muted-foreground">{row.direction === 'higher_is_better' ? 'Mayor es mejor' : row.direction === 'lower_is_better' ? 'Menor es mejor' : 'Informativo'}</TableCell><TableCell><Badge variant="outline">{row.evaluation_state === 'baseline' ? 'Baseline' : row.evaluation_state}</Badge></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>

    {person ? <Card><CardHeader><div className="flex items-center gap-2"><Workflow className="h-5 w-5 text-muted-foreground" /><CardTitle>Proyectos y mejora continua</CardTitle></div><CardDescription>Iniciativas atribuidas directamente a la identidad de {person.fullName}. Sin inferencias por cargo.</CardDescription></CardHeader><CardContent className="px-0 pb-0"><Table><TableHeader><TableRow><TableHead>Iniciativa</TableHead><TableHead>PDCA</TableHead><TableHead>Estado</TableHead><TableHead>Fecha objetivo</TableHead><TableHead>Resultado</TableHead></TableRow></TableHeader><TableBody>{initiatives.length === 0 ? <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Aún no existen iniciativas Kaizen atribuidas directamente a esta persona.</TableCell></TableRow> : initiatives.map((item) => <TableRow key={item.id}><TableCell><div className="font-medium">{item.title}</div><div className="text-xs text-muted-foreground">{item.kaizen_number || item.category || 'Kaizen'}</div></TableCell><TableCell>{item.pdca_stage || '—'}</TableCell><TableCell><Badge variant="outline">{item.status || 'Sin estado'}</Badge></TableCell><TableCell>{item.target_date || '—'}</TableCell><TableCell className="max-w-[420px] text-sm text-muted-foreground">{item.actual_result || item.expected_result || 'Sin resultado registrado'}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card> : null}

    {(payload?.evidenceGaps?.length || 0) > 0 ? <Card><CardHeader><CardTitle>Brechas de evidencia</CardTitle><CardDescription>Áreas que todavía no deben convertirse en evaluación de desempeño.</CardDescription></CardHeader><CardContent className="space-y-3">{payload?.evidenceGaps?.map((gap) => <div key={gap.domain} className="flex gap-3 text-sm"><Badge variant="outline">{gap.domain}</Badge><span className="text-muted-foreground">{gap.detail}</span></div>)}</CardContent></Card> : null}
  </div>;
}
