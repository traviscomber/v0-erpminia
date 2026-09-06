'use client';

import useSWR from 'swr';
import { Database, FileSearch, Route, TriangleAlert } from 'lucide-react';
import { StatePanel } from '@/components/ui/state-panel';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'No fue posible localizar fuentes de recuperación');
  return data;
};

type SourceStatus = 'exact_source_clues' | 'historical_source_clues' | 'lineage_gap';

type RecoverySource = {
  category: string;
  label: string;
  status: SourceStatus;
  candidate_holes: number;
  evidence_rows: number;
  gap_holes?: number;
  source_files: string[];
  source_authority: string;
  recovery_action: string;
  examples: Array<{ hole_code: string | null; source_reference: string; evidence_text?: string | null }>;
};

type Response = {
  semantics: string;
  sources: RecoverySource[];
  summary: {
    topography_candidate_holes: number;
    survey_candidate_holes: number;
    formal_logging_holes: number;
    operational_interval_holes: number;
    logging_clue_holes: number;
    structural_clue_holes: number;
    chemistry_rows: number;
    chemistry_linked_holes: number;
  };
};

const statusLabel: Record<SourceStatus, string> = {
  exact_source_clues: 'Fuente localizada',
  historical_source_clues: 'Pista histórica',
  lineage_gap: 'Brecha de linaje',
};

export function GeologiaEvidenceRecoverySources() {
  const { data, error, isLoading } = useSWR<Response>('/api/produccion/geologia/evidence-recovery-locator', fetcher);

  if (error) return <StatePanel tone="error" title="No fue posible localizar fuentes" description="La cola de prioridades sigue disponible; falló sólo el mapa de recuperación." className="min-h-0 py-5" />;
  if (isLoading || !data) return <StatePanel title="Localizando fuentes" description="Cruzando topografía, survey, observaciones geológicas y química con su trazabilidad existente." className="min-h-0 py-5" />;

  const loggingMissing = data.summary.formal_logging_holes === 0;

  return <div className="space-y-5 border-t pt-6">
    <section>
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Dónde buscar</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight">Ruta de recuperación por fuente</h2>
      <p className="mt-2 max-w-4xl text-sm text-muted-foreground">Convierte cada faltante prioritario en una búsqueda concreta dentro de las fuentes ya conocidas. Una referencia histórica es una pista para recuperar evidencia; no completa automáticamente ningún dato geológico.</p>
    </section>

    <section className="grid gap-4 md:grid-cols-3">
      <article className="rounded-lg border bg-card p-5">
        <div className="flex items-center gap-2 text-sm font-medium"><Route className="h-4 w-4" />Topografía y survey</div>
        <p className="mt-3 text-2xl font-semibold tabular-nums">{data.summary.topography_candidate_holes}</p>
        <p className="mt-1 text-xs text-muted-foreground">sondajes con pista topográfica exacta</p>
        <p className="mt-3 text-sm"><strong>{data.summary.survey_candidate_holes}</strong> con evidencia histórica de medición/survey.</p>
      </article>
      <article className="rounded-lg border bg-card p-5">
        <div className="flex items-center gap-2 text-sm font-medium"><FileSearch className="h-4 w-4" />Logging formal</div>
        <p className="mt-3 text-2xl font-semibold tabular-nums">{data.summary.formal_logging_holes}</p>
        <p className="mt-1 text-xs text-muted-foreground">sondajes con logging formal explícitamente localizado</p>
        <p className="mt-3 text-sm"><strong>{data.summary.operational_interval_holes}</strong> sondajes sí tienen intervalos operacionales; permanecen separados del logging.</p>
      </article>
      <article className="rounded-lg border bg-card p-5">
        <div className="flex items-center gap-2 text-sm font-medium"><Database className="h-4 w-4" />Química</div>
        <p className="mt-3 text-2xl font-semibold tabular-nums">{data.summary.chemistry_rows}</p>
        <p className="mt-1 text-xs text-muted-foreground">filas químicas con linaje de archivo</p>
        <p className="mt-3 text-sm"><strong>{data.summary.chemistry_linked_holes}</strong> sondajes vinculados explícitamente hoy.</p>
      </article>
    </section>

    {loggingMissing ? <section className="rounded-lg border bg-card p-5">
      <div className="flex items-start gap-3">
        <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
        <div>
          <p className="font-medium">Brecha documental · logging geológico formal no localizado</p>
          <p className="mt-2 max-w-4xl text-sm text-muted-foreground">Los intervalos operacionales existentes ayudan a ubicar profundidades y observaciones fuente, pero no sustituyen el log geológico original. Para cerrar esta brecha, Geología debe aportar la fuente por sondaje e intervalo con <strong className="text-foreground">hole_code + from/to</strong> y sólo los atributos realmente registrados: litología, alteración, mineralización, estructuras, recuperación/RQD y código de muestra cuando existan. MOTIL debe conservar archivo/hoja/fila o identificador fuente y mantener nulo cualquier campo ausente.</p>
        </div>
      </div>
    </section> : null}

    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="border-b px-5 py-4"><p className="font-medium">Mapa de fuentes candidatas</p></div>
      <div className="divide-y">{data.sources.map((source) => <article key={source.category} className="p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(220px,0.9fr)_120px_120px_minmax(280px,1.4fr)_minmax(320px,1.7fr)]">
          <div>
            <p className="font-medium">{source.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{statusLabel[source.status]}</p>
            {source.source_files.length ? <p className="mt-2 text-xs text-muted-foreground">{source.source_files.join(' · ')}</p> : null}
          </div>
          <div><p className="text-xs text-muted-foreground">Sondajes pista</p><p className="mt-1 font-semibold tabular-nums">{source.candidate_holes}</p>{source.gap_holes != null ? <p className="mt-1 text-xs text-muted-foreground">{source.gap_holes} en gap</p> : null}</div>
          <div><p className="text-xs text-muted-foreground">Filas evidencia</p><p className="mt-1 font-semibold tabular-nums">{source.evidence_rows}</p></div>
          <div><p className="text-xs text-muted-foreground">Qué prueba</p><p className="mt-1 text-sm">{source.source_authority}</p></div>
          <div><p className="text-xs text-muted-foreground">Siguiente acción</p><p className="mt-1 text-sm">{source.recovery_action}</p></div>
        </div>

        {source.examples.length ? <div className="mt-4 grid gap-2 border-t pt-4 lg:grid-cols-2">
          {source.examples.slice(0, 4).map((example, index) => <div key={`${source.category}-${example.hole_code || 'source'}-${index}`} className="text-xs text-muted-foreground">
            <p><span className="font-medium text-foreground">{example.hole_code || 'Fuente sin sondaje enlazado'}</span> · {example.source_reference}</p>
            {example.evidence_text ? <p className="mt-1 line-clamp-2">{example.evidence_text}</p> : null}
          </div>)}
        </div> : null}
      </article>)}</div>
    </section>

    <section className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
      <div className="flex items-start gap-2"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /><p>{data.semantics} En particular, química sin vínculo explícito muestra → sondaje → intervalo permanece fuera de cualquier interpretación local por sondaje.</p></div>
    </section>
  </div>;
}
