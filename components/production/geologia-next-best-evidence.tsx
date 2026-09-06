'use client';

import useSWR from 'swr';
import { ArrowUpRight, CircleDot, Info } from 'lucide-react';
import { StatePanel } from '@/components/ui/state-panel';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'No fue posible priorizar evidencia');
  return data;
};

type RecoveryPriority = 'foundation' | 'validation' | 'support';
type Row = {
  evidence: string;
  category: string;
  recovery_priority: RecoveryPriority;
  affected_patterns: number;
  affected_holes: number;
  reasons: string[];
  pattern_types: string[];
  rank_basis: string;
};
type Response = {
  generated_from: string;
  semantics: string;
  ranking_policy: string;
  rows: Row[];
  top: Row[];
  source_pattern_count: number;
  regional_context_records: number;
};

const priorityLabel: Record<RecoveryPriority, string> = {
  foundation: 'Fundacional',
  validation: 'Validación',
  support: 'Soporte',
};

export function GeologiaNextBestEvidence() {
  const { data, error, isLoading } = useSWR<Response>('/api/produccion/geologia/next-best-evidence', fetcher);

  if (error) return <StatePanel tone="error" title="No fue posible priorizar evidencia" description="La matriz de interpretación permanece disponible; falló sólo esta capa derivada." className="min-h-0 py-5" />;
  if (isLoading || !data) return <StatePanel title="Priorizando evidencia" description="Ordenando faltantes por dependencia operacional y cobertura real." className="min-h-0 py-5" />;
  if (!data.rows.length) return <StatePanel title="Sin faltantes priorizables" description="No hay patrones con evidencia pendiente en la matriz actual." className="min-h-0 py-5" />;

  return <div className="space-y-5">
    <section className="border-b pb-5">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Recuperación de evidencia</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight">Qué dato conviene recuperar primero</h2>
      <p className="mt-2 max-w-4xl text-sm text-muted-foreground">Ordena evidencia faltante por dependencia operacional y cobertura. Primero geometría, orientación y logging; luego evidencia necesaria para validar interpretaciones. No es probabilidad geológica, ley, valor económico ni recomendación de perforación.</p>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm"><span><strong>{data.source_pattern_count}</strong> patrones considerados</span><span><strong>{data.rows.length}</strong> tipos de evidencia faltante</span><span><strong>{data.regional_context_records}</strong> registros regionales de contexto</span></div>
    </section>

    <section className="grid gap-4 lg:grid-cols-3">
      {data.top.slice(0, 3).map((row, index) => <article key={row.evidence} className="rounded-lg border bg-card p-5">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Prioridad {index + 1} · {priorityLabel[row.recovery_priority]}</p><h3 className="mt-1 font-semibold">{row.evidence}</h3></div><ArrowUpRight className="h-4 w-4 text-muted-foreground" /></div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-muted-foreground">Sondajes</p><p className="mt-1 text-lg font-semibold tabular-nums">{row.affected_holes}</p></div><div><p className="text-xs text-muted-foreground">Patrones</p><p className="mt-1 text-lg font-semibold tabular-nums">{row.affected_patterns}</p></div></div>
        <p className="mt-4 text-xs text-muted-foreground">{row.rank_basis}</p>
      </article>)}
    </section>

    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="border-b px-5 py-4"><div className="flex items-center gap-2"><CircleDot className="h-4 w-4" /><p className="font-medium">Cola priorizada</p></div></div>
      <div className="divide-y">{data.top.map((row, index) => <div key={row.evidence} className="grid gap-3 px-5 py-4 lg:grid-cols-[50px_minmax(220px,1.3fr)_120px_100px_100px_minmax(260px,2fr)]">
        <p className="text-sm font-semibold tabular-nums">#{index + 1}</p>
        <div><p className="font-medium">{row.evidence}</p><p className="mt-1 text-xs text-muted-foreground">{row.pattern_types.join(' · ')}</p></div>
        <div><p className="text-xs text-muted-foreground">Nivel</p><p className="mt-1 text-sm font-medium">{priorityLabel[row.recovery_priority]}</p></div>
        <div><p className="text-xs text-muted-foreground">Sondajes</p><p className="mt-1 font-medium tabular-nums">{row.affected_holes}</p></div>
        <div><p className="text-xs text-muted-foreground">Patrones</p><p className="mt-1 font-medium tabular-nums">{row.affected_patterns}</p></div>
        <div><p className="text-xs text-muted-foreground">Por qué importa</p><p className="mt-1 text-sm">{row.reasons[0] || 'Destraba evidencia pendiente en la matriz de interpretación.'}</p></div>
      </div>)}</div>
    </section>

    <section className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground"><div className="flex items-start gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0" /><div><p>{data.semantics}</p><p className="mt-1">{data.ranking_policy}</p><p className="mt-1">El geólogo decide si la prioridad operacional propuesta es pertinente.</p></div></div></section>
  </div>;
}
