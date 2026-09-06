'use client';

import useSWR from 'swr';
import { ArrowUpRight, Compass, MapPinned } from 'lucide-react';
import { StatePanel } from '@/components/ui/state-panel';

type CampaignRow = {
  rank: number;
  drill_hole_id: string;
  hole_code: string;
  mine_name: string | null;
  sector_name: string | null;
  last_evidence_date: string | null;
  has_topography: boolean;
  has_survey: boolean;
  topography_evidence_rows: number;
  survey_evidence_rows: number;
  topography_source_refs: string | null;
  survey_source_refs: string | null;
  drilled_depth_m: number | null;
  positive_visual_span_count: number;
  structure_span_count: number;
  lithology_span_count: number;
  evidence_load: number;
  recovery_scope: 'collar_and_survey' | 'collar_geometry' | 'drill_orientation';
  rank_basis: string;
};

type CampaignResponse = {
  year: number;
  semantics: string;
  source_policy: string;
  summary: {
    current_candidate_holes: number;
    both_sources: number;
    topography_only: number;
    survey_only: number;
    missing_azimuth: number;
    missing_dip: number;
    dip_only: number;
    complete_orientation: number;
  };
  rows: CampaignRow[];
};

const fetcher = async (url: string): Promise<CampaignResponse> => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'No fue posible cargar la campaña de recuperación');
  return data;
};

const n = (value: number | null | undefined, digits = 0) => value == null
  ? '—'
  : value.toLocaleString('es-CL', { maximumFractionDigits: digits });

export function GeologiaEvidenceRecoveryCampaign() {
  const { data, error, isLoading } = useSWR<CampaignResponse>('/api/produccion/geologia/evidence-recovery-campaign', fetcher);

  if (error) return <StatePanel tone="error" title="No fue posible cargar la campaña" description="La cola de recuperación por fuente permanece disponible; falló sólo esta priorización derivada." className="min-h-0 py-5" />;
  if (isLoading || !data) return <StatePanel title="Priorizando campaña vigente" description="Ordenando recuperación documental por recencia, fuentes y evidencia afectada." className="min-h-0 py-5" />;
  if (!data.rows.length) return <StatePanel title="Sin campaña vigente" description={`No hay pistas de Topografía o survey con evidencia fechada en ${data.year}.`} className="min-h-0 py-5" />;

  return <section className="space-y-5">
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Campaña de recuperación · {data.year}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight">Qué fuentes conviene pedir primero</h2>
      <p className="mt-2 max-w-4xl text-sm text-muted-foreground">{data.semantics}</p>
    </div>

    <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-4">
      <div className="bg-card px-5 py-4"><p className="text-xs text-muted-foreground">Sondajes vigentes con pista</p><p className="mt-2 text-2xl font-semibold tabular-nums">{data.summary.current_candidate_holes}</p><p className="mt-1 text-xs text-muted-foreground">Topografía o survey en {data.year}</p></div>
      <div className="bg-card px-5 py-4"><p className="text-xs text-muted-foreground">Dos brechas en un sondaje</p><p className="mt-2 text-2xl font-semibold tabular-nums">{data.summary.both_sources}</p><p className="mt-1 text-xs text-muted-foreground">Pista de collar + survey</p></div>
      <div className="bg-card px-5 py-4"><p className="text-xs text-muted-foreground">Dip disponible, falta azimut</p><p className="mt-2 text-2xl font-semibold tabular-nums">{data.summary.dip_only}</p><p className="mt-1 text-xs text-muted-foreground">Universo canónico actual</p></div>
      <div className="bg-card px-5 py-4"><p className="text-xs text-muted-foreground">Orientación completa</p><p className="mt-2 text-2xl font-semibold tabular-nums">{data.summary.complete_orientation}</p><p className="mt-1 text-xs text-muted-foreground">Azimut + inclinación</p></div>
    </div>

    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="border-b px-5 py-4">
        <p className="font-medium">Orden de recuperación documental</p>
        <p className="mt-1 text-sm text-muted-foreground">Primero se muestran sondajes con ambas pistas, luego collar y survey por separado. Dentro de cada grupo se prioriza evidencia operacional afectada y profundidad documentada.</p>
      </div>
      <div className="divide-y">
        {data.rows.map((row) => <article key={row.drill_hole_id} className="p-5">
          <div className="grid gap-4 xl:grid-cols-[52px_minmax(170px,0.8fr)_minmax(190px,0.9fr)_150px_minmax(260px,1.4fr)_minmax(240px,1.2fr)]">
            <div><p className="text-sm font-semibold tabular-nums">#{row.rank}</p></div>
            <div>
              <p className="font-medium">{row.hole_code}</p>
              <p className="mt-1 text-xs text-muted-foreground">{[row.mine_name, row.sector_name].filter(Boolean).join(' · ') || 'Ubicación aún incompleta'}</p>
              {row.last_evidence_date ? <p className="mt-1 text-xs text-muted-foreground">Última pista {row.last_evidence_date}</p> : null}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fuente a recuperar</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {row.has_topography ? <span className="inline-flex items-center gap-1 rounded-md border px-2 py-1"><MapPinned className="h-3 w-3" /> Topografía</span> : null}
                {row.has_survey ? <span className="inline-flex items-center gap-1 rounded-md border px-2 py-1"><Compass className="h-3 w-3" /> Survey</span> : null}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{row.topography_evidence_rows + row.survey_evidence_rows} referencia(s) fuente</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Profundidad</p>
              <p className="mt-1 font-medium tabular-nums">{row.drilled_depth_m == null ? '—' : `${n(row.drilled_depth_m, 1)} m`}</p>
              <p className="mt-2 text-xs text-muted-foreground">Evidencia afectada</p>
              <p className="mt-1 font-medium tabular-nums">{row.evidence_load}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Por qué va primero</p>
              <p className="mt-1 text-sm">{row.rank_basis}</p>
              <p className="mt-2 text-xs text-muted-foreground">Litología {row.lithology_span_count} · Estructura {row.structure_span_count} · Mineral visual {row.positive_visual_span_count}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Abrir revisión exacta</p>
              <div className="mt-2 flex flex-col gap-2">
                {row.has_topography ? <a href={`/dashboard/produccion/geologia?tab=priorities&recovery=collar_geometry&hole=${encodeURIComponent(row.hole_code)}`} className="inline-flex items-center gap-1 text-sm font-medium underline underline-offset-4">Revisar Topografía <ArrowUpRight className="h-3 w-3" /></a> : null}
                {row.has_survey ? <a href={`/dashboard/produccion/geologia?tab=priorities&recovery=drill_orientation&hole=${encodeURIComponent(row.hole_code)}`} className="inline-flex items-center gap-1 text-sm font-medium underline underline-offset-4">Revisar survey <ArrowUpRight className="h-3 w-3" /></a> : null}
              </div>
            </div>
          </div>
        </article>)}
      </div>
    </div>

    <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">{data.source_policy}</div>
  </section>;
}
