'use client';

import useSWR from 'swr';
import { CircleDot, Info } from 'lucide-react';
import { StatePanel } from '@/components/ui/state-panel';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'No fue posible evaluar excepciones de evidencia');
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
type ScopeBoundary = {
  category: string;
  label: string;
  available_holes: number;
  total_holes: number;
  coverage_pct: number;
  meaning: string;
};
type Response = {
  generated_from: string;
  semantics: string;
  ranking_policy: string;
  rows: Row[];
  top: Row[];
  suppressed_recovery_rows: number;
  scope_boundaries: ScopeBoundary[];
  source_boundary_threshold_pct: number;
  total_holes: number;
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

  if (error) return <StatePanel tone="error" title="No fue posible leer las excepciones" description="La evidencia canónica y la matriz permanecen disponibles; falló sólo esta capa derivada." className="min-h-0 py-5" />;
  if (isLoading || !data) return <StatePanel title="Leyendo evidencia canónica" description="Separando excepciones útiles de límites estructurales de la fuente." className="min-h-0 py-5" />;

  return <div className="space-y-5">
    <section className="border-b pb-5">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Excepciones de evidencia</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight">Sólo faltantes que vale la pena revisar</h2>
      <p className="mt-2 max-w-4xl text-sm text-muted-foreground">Esta vista no es una cola de trabajo. MOTIL no transforma ausencia masiva de datos en tareas. Si una dimensión aparece en menos de {data.source_boundary_threshold_pct}% de los {data.total_holes} sondajes, se considera un límite conocido de la fuente canónica actual. Sólo se muestran excepciones cuando existe cobertura suficiente para que una revisión puntual tenga sentido.</p>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <span><strong>{data.source_pattern_count}</strong> patrones canónicos considerados</span>
        <span><strong>{data.rows.length}</strong> excepciones revisables</span>
        <span><strong>{data.suppressed_recovery_rows}</strong> solicitudes masivas evitadas</span>
      </div>
    </section>

    {data.rows.length ? <>
      <section className="grid gap-4 lg:grid-cols-3">
        {data.top.slice(0, 3).map((row, index) => <article key={row.evidence} className="rounded-lg border bg-card p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Excepción {index + 1} · {priorityLabel[row.recovery_priority]}</p>
          <h3 className="mt-1 font-semibold">{row.evidence}</h3>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-muted-foreground">Sondajes</p><p className="mt-1 text-lg font-semibold tabular-nums">{row.affected_holes}</p></div><div><p className="text-xs text-muted-foreground">Patrones</p><p className="mt-1 text-lg font-semibold tabular-nums">{row.affected_patterns}</p></div></div>
          <p className="mt-4 text-xs text-muted-foreground">{row.rank_basis}</p>
        </article>)}
      </section>

      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="border-b px-5 py-4"><div className="flex items-center gap-2"><CircleDot className="h-4 w-4" /><p className="font-medium">Excepciones revisables</p></div></div>
        <div className="divide-y">{data.top.map((row, index) => <div key={row.evidence} className="grid gap-3 px-5 py-4 lg:grid-cols-[50px_minmax(220px,1.3fr)_120px_100px_100px_minmax(260px,2fr)]">
          <p className="text-sm font-semibold tabular-nums">#{index + 1}</p>
          <div><p className="font-medium">{row.evidence}</p><p className="mt-1 text-xs text-muted-foreground">{row.pattern_types.join(' · ')}</p></div>
          <div><p className="text-xs text-muted-foreground">Nivel</p><p className="mt-1 text-sm font-medium">{priorityLabel[row.recovery_priority]}</p></div>
          <div><p className="text-xs text-muted-foreground">Sondajes</p><p className="mt-1 font-medium tabular-nums">{row.affected_holes}</p></div>
          <div><p className="text-xs text-muted-foreground">Patrones</p><p className="mt-1 font-medium tabular-nums">{row.affected_patterns}</p></div>
          <div><p className="text-xs text-muted-foreground">Por qué importa</p><p className="mt-1 text-sm">{row.reasons[0] || 'Excepción respaldada por cobertura canónica suficiente.'}</p></div>
        </div>)}</div>
      </section>
    </> : <StatePanel title="Sin excepciones de evidencia" description="Con la cobertura canónica actual no corresponde pedir datos masivamente. Geología debe operar con la evidencia disponible y mantener sus límites explícitos." className="min-h-0 py-5" />}

    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="border-b px-5 py-4"><p className="font-medium">Límites conocidos de la fuente</p><p className="mt-1 text-sm text-muted-foreground">Se informan para interpretar correctamente la evidencia, no como lista de datos que haya que conseguir.</p></div>
      <div className="divide-y">{data.scope_boundaries.map((item) => <div key={item.category} className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(220px,1fr)_130px_minmax(320px,2fr)]">
        <div><p className="font-medium">{item.label}</p><p className="mt-1 text-xs text-muted-foreground">Cobertura canónica actual</p></div>
        <p className="font-medium tabular-nums">{item.available_holes}/{item.total_holes} · {item.coverage_pct}%</p>
        <p className="text-sm text-muted-foreground">{item.meaning}</p>
      </div>)}</div>
    </section>

    <section className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground"><div className="flex items-start gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0" /><div><p>{data.semantics}</p><p className="mt-1">{data.ranking_policy}</p><p className="mt-1">La ausencia de una dimensión no reduce la validez de los hechos canónicos que sí están presentes; sólo limita qué conclusiones pueden sostenerse.</p></div></div></section>
  </div>;
}
