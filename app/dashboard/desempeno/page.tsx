'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowRight, Gauge, ShieldAlert, Target, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Kpi = { cargo_name: string; domain?: string; kpi_key: string; label: string; unit: string; measured_value: number | null; target_value?: number | null; direction: string; evaluation_state: string };
type Gap = { domain: string; status: string; detail: string };
type Payload = { cargos: string[]; rows: Kpi[]; executive: Kpi[]; evidenceGaps?: Gap[]; meta: { note: string; personalEvaluation: boolean; targetsDefined: boolean } };

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
  const [cargo, setCargo] = useState('TODOS');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController(); setLoading(true);
    const query = cargo === 'TODOS' ? '' : `?cargo=${encodeURIComponent(cargo)}`;
    fetch(`/api/desempeno/scorecards${query}`, { signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error((await response.json()).error || 'No fue posible cargar desempeño'); return response.json(); })
      .then((data) => { setPayload(data); setError(''); })
      .catch((err) => { if (err.name !== 'AbortError') setError(err.message); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [cargo]);

  const rows = useMemo(() => !payload ? [] : mergeScorecards(payload.rows, payload.executive), [payload]);
  const domains = new Set(rows.map((row) => row.domain).filter(Boolean)).size;
  const withData = rows.filter((row) => row.measured_value !== null).length;
  const withoutTargets = rows.filter((row) => row.target_value === null || row.target_value === undefined).length;

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Gestión transversal</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Desempeño operacional</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Baseline por cargo construido desde evidencia operacional. No corresponde a una evaluación personal mientras no existan metas aprobadas y atribución individual suficiente.</p></div>
      <Select value={cargo} onValueChange={setCargo}><SelectTrigger className="w-full md:w-[300px]"><SelectValue placeholder="Seleccionar cargo" /></SelectTrigger><SelectContent><SelectItem value="TODOS">Todos los cargos medidos</SelectItem><SelectItem value="GERENTE">GERENTE · ejecutivo</SelectItem><SelectItem value="SUBGERENTE OP.">SUBGERENTE OP. · ejecutivo</SelectItem><SelectItem value="PRESIDENTE">PRESIDENTE · ejecutivo</SelectItem>{(payload?.cargos || []).filter((item) => !['GERENTE','SUBGERENTE OP.','PRESIDENTE'].includes(item)).map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
    </div>
    <Card className="border-primary/20 bg-primary/[0.025]"><CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"><div className="flex min-w-0 items-start gap-3"><div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary"><UserRound className="size-4" /></div><div><p className="font-medium">Pedro Zegers · Proyectos y mejora continua</p><p className="mt-1 text-sm leading-5 text-muted-foreground">Vista ejecutiva dedicada con mejoras, comprobación, fechas y evidencia contractual atribuible.</p></div></div><Button variant="outline" asChild><Link href="/dashboard/desempeno/pedro-zegers">Abrir scorecard<ArrowRight /></Link></Button></CardContent></Card>
    {error ? <Card><CardContent className="pt-5 text-sm text-destructive">{error}</CardContent></Card> : null}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card><CardHeader><CardDescription>Indicadores visibles</CardDescription><CardTitle className="flex items-center gap-2 text-2xl"><Gauge className="h-5 w-5 text-muted-foreground" />{loading ? '—' : rows.length}</CardTitle></CardHeader></Card>
      <Card><CardHeader><CardDescription>Con evidencia</CardDescription><CardTitle className="flex items-center gap-2 text-2xl"><Activity className="h-5 w-5 text-muted-foreground" />{loading ? '—' : withData}</CardTitle></CardHeader></Card>
      <Card><CardHeader><CardDescription>Dominios</CardDescription><CardTitle className="flex items-center gap-2 text-2xl"><ShieldAlert className="h-5 w-5 text-muted-foreground" />{loading ? '—' : domains || '—'}</CardTitle></CardHeader></Card>
      <Card><CardHeader><CardDescription>Sin meta aprobada</CardDescription><CardTitle className="flex items-center gap-2 text-2xl"><Target className="h-5 w-5 text-muted-foreground" />{loading ? '—' : withoutTargets}</CardTitle></CardHeader></Card>
    </div>
    <Card><CardHeader><div className="flex flex-wrap items-center gap-2"><CardTitle>Scorecard</CardTitle><Badge variant="outline">Baseline</Badge><Badge variant="neutral">No evaluación personal</Badge></div><CardDescription>{payload?.meta.note || 'Cargando evidencia operacional…'}</CardDescription></CardHeader><CardContent className="px-0 pb-0"><Table><TableHeader><TableRow><TableHead>Cargo / dominio</TableHead><TableHead>Indicador</TableHead><TableHead className="text-right">Valor</TableHead><TableHead>Dirección</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader><TableBody>{loading ? <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Cargando scorecard…</TableCell></TableRow> : rows.length === 0 ? <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No existen indicadores medidos para este cargo.</TableCell></TableRow> : rows.map((row,index) => <TableRow key={`${row.cargo_name}-${row.domain || 'general'}-${row.kpi_key}-${index}`}><TableCell><div className="font-medium">{row.cargo_name}</div>{row.domain ? <div className="text-xs text-muted-foreground">{domainLabel[row.domain] || row.domain}</div> : null}</TableCell><TableCell>{row.label}</TableCell><TableCell className="text-right font-medium tabular-nums">{formatValue(row.measured_value,row.unit)}</TableCell><TableCell className="text-xs text-muted-foreground">{row.direction === 'higher_is_better' ? 'Mayor es mejor' : row.direction === 'lower_is_better' ? 'Menor es mejor' : 'Informativo'}</TableCell><TableCell><Badge variant="outline">{row.evaluation_state === 'baseline' ? 'Baseline' : row.evaluation_state}</Badge></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
    {(payload?.evidenceGaps?.length || 0) > 0 ? <Card><CardHeader><CardTitle>Brechas de evidencia</CardTitle><CardDescription>Áreas que todavía no deben convertirse en evaluación de desempeño.</CardDescription></CardHeader><CardContent className="space-y-3">{payload?.evidenceGaps?.map((gap) => <div key={gap.domain} className="flex gap-3 text-sm"><Badge variant="outline">{gap.domain}</Badge><span className="text-muted-foreground">{gap.detail}</span></div>)}</CardContent></Card> : null}
  </div>;
}
