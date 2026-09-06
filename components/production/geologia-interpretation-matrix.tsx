'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertTriangle, ArrowRight, BookOpen, Search, ShieldCheck } from 'lucide-react';
import { StatePanel } from '@/components/ui/state-panel';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'No fue posible cargar la matriz de interpretación');
  return data;
};

type MatrixRow = {
  drill_hole_id: string;
  hole_code: string;
  pattern_type: string;
  local_observation: string;
  interval: { from_m: number | null; to_m: number | null } | null;
  source_rows: unknown[];
  evidence_strength: string;
  regional_context: Array<{ provider: string; dataset: string; type: string; title: string; facts: Record<string, unknown>; source_url?: string | null; semantics: string }>;
  compatibility_statement: string;
  evidence_for: string[];
  evidence_against: string[];
  missing_evidence: string[];
  question_to_resolve: string;
  next_validation_action: string;
  human_checkpoint: string;
  guardrail: string;
};

type MatrixResponse = { rows: MatrixRow[]; regional_context_records: number; semantics: string };

const patternLabel: Record<string, string> = {
  mineral_structure_overlap: 'Estructura + mineralización visual',
  transition_near_mineralization: 'Transición + mineralización visual',
  mineral_presence_absence: 'Variabilidad visual',
};

export function GeologiaInterpretationMatrix() {
  const { data, error, isLoading } = useSWR<MatrixResponse>('/api/produccion/geologia/interpretation-matrix', fetcher);
  const [query, setQuery] = useState('');
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.rows || []).filter((row) => !q || [row.hole_code, row.pattern_type, row.local_observation].some((value) => String(value || '').toLowerCase().includes(q)));
  }, [data?.rows, query]);

  if (error) return <StatePanel tone="error" title="No fue posible cargar la matriz" description="La evidencia local permanece intacta; falló sólo la capa de cruce interpretativo." className="min-h-0 py-5" />;
  if (isLoading || !data) return <StatePanel title="Construyendo matriz" description="Cruzando patrones locales, faltantes y contexto regional validado." className="min-h-0 py-5" />;

  return <div className="space-y-5">
    <section className="border-b pb-5">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Interpretation Matrix</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight">Qué observamos, qué podría significar y qué falta probar</h2>
      <p className="mt-2 max-w-4xl text-sm text-muted-foreground">Cruza evidencia propia de La Patagua con contexto distrital verificado. SERNAGEOMIN orienta preguntas; nunca rellena datos locales ni confirma control, continuidad, ley o dominio.</p>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm"><span><strong>{data.rows.length}</strong> patrones evaluables</span><span><strong>{data.regional_context_records}</strong> referencias regionales verificadas</span></div>
    </section>

    <div className="relative max-w-md"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar sondaje o patrón" className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none"/></div>

    {rows.length === 0 ? <StatePanel title="Sin cruces para mostrar" description={query ? 'No hay resultados para la búsqueda.' : 'Todavía no existen patrones observados suficientes para construir la matriz.'} className="min-h-0 py-5" /> : null}

    <div className="space-y-4">{rows.map((row, index) => <article key={`${row.drill_hole_id}-${row.pattern_type}-${index}`} className="rounded-lg border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{patternLabel[row.pattern_type] || row.pattern_type}</p><h3 className="mt-1 text-lg font-semibold">{row.hole_code}{row.interval ? ` · ${row.interval.from_m ?? '—'}–${row.interval.to_m ?? '—'} m` : ''}</h3></div>
        <span className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">{row.evidence_strength}</span>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-4">
        <section><p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">1 · Dato local</p><p className="mt-2 text-sm">{row.local_observation}</p>{row.source_rows?.length ? <p className="mt-2 text-xs text-muted-foreground">{row.source_rows.length} filas fuente trazables</p> : null}</section>
        <section><p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">2 · Contexto regional</p>{row.regional_context.length ? <div className="mt-2 space-y-2">{row.regional_context.map((context, contextIndex) => <div key={`${context.type}-${contextIndex}`} className="text-sm"><div className="flex gap-2"><BookOpen className="mt-0.5 h-4 w-4 shrink-0"/><span>{context.title}</span></div><p className="ml-6 mt-1 text-xs text-muted-foreground">{context.provider} · sólo contexto distrital</p></div>)}</div> : <p className="mt-2 text-sm text-muted-foreground">Sin referencia regional aplicable.</p>}</section>
        <section><p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">3 · Contradicción / faltantes</p>{row.evidence_against.length ? <div className="mt-2 space-y-1 text-sm">{row.evidence_against.map((item) => <p key={item}>• {item}</p>)}</div> : <p className="mt-2 text-sm text-muted-foreground">Sin evidencia local en contra registrada todavía; esto no significa ausencia de contradicción.</p>}<div className="mt-3 space-y-1 text-xs text-muted-foreground">{row.missing_evidence.slice(0, 6).map((item) => <p key={item}>Falta · {item}</p>)}</div></section>
        <section><p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">4 · Cómo resolver</p><div className="mt-2 flex gap-2 text-sm"><ArrowRight className="mt-0.5 h-4 w-4 shrink-0"/><p>{row.next_validation_action}</p></div><p className="mt-3 text-xs text-muted-foreground">{row.human_checkpoint}</p></section>
      </div>

      <div className="mt-4 grid gap-3 border-t pt-4 lg:grid-cols-2"><div className="flex gap-2 text-sm"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0"/><p>{row.compatibility_statement}</p></div><div className="flex gap-2 text-sm text-muted-foreground"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/><p>{row.guardrail}</p></div></div>
    </article>)}</div>
  </div>;
}
