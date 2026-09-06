'use client';

import useSWR from 'swr';
import { AlertTriangle, CheckCircle2, Database, FileSearch, MapPinned } from 'lucide-react';
import { StatePanel } from '@/components/ui/state-panel';

type CompletenessData = {
  summary: {
    totalCanonicalRows: number;
    estimatedDistinctHoleCodes: number;
    duplicateGroups: number;
    duplicateExcessRows: number;
    withMine: number;
    withSector: number;
    withCollarXY: number;
    withCrs: number;
    withDip: number;
    withAzimuth: number;
    completeOrientation: number;
    withDrilledDepth: number;
    withPlannedDepth: number;
    withGeologicalPurpose: number;
    withGeologyEvidence: number;
    withStructuredIntervals: number;
    withTopographyEvidence: number;
    topographyRecoverable: number;
    withSurveyEvidence: number;
    surveyRecoverable: number;
    textEvidenceOnly: number;
    noGeologyEvidence: number;
    negativeMeterRows: number;
    intervalsOutsideDepth: number;
  };
  duplicateGroups: Array<{ normalizedCode:string; canonicalRows:number; variants:string[] }>;
};

const fetcher = async (url:string):Promise<CompletenessData> => {
  const response = await fetch(url, { credentials: 'include' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'No fue posible cargar la cobertura de datos');
  return data;
};

function pct(value:number,total:number){return total > 0 ? Math.round((value / total) * 100) : 0;}

function CoverageRow({label,validated,total,recoverable,detail}:{label:string;validated:number;total:number;recoverable?:number;detail:string}){
  const missing = Math.max(0, total - validated - Number(recoverable || 0));
  return <div className="grid gap-3 border-b px-4 py-4 last:border-b-0 md:grid-cols-[210px_1fr_120px] md:items-center">
    <div><p className="font-medium">{label}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>
    <div>
      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
        <div className="bg-foreground" style={{width:`${pct(validated,total)}%`}} />
        {recoverable ? <div className="bg-muted-foreground/45" style={{width:`${pct(recoverable,total)}%`}} /> : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span><span className="font-medium text-foreground">{validated}</span> validados</span>
        {recoverable ? <span><span className="font-medium text-foreground">{recoverable}</span> recuperables</span> : null}
        <span><span className="font-medium text-foreground">{missing}</span> sin evidencia suficiente</span>
      </div>
    </div>
    <div className="text-right text-sm tabular-nums"><span className="font-semibold">{pct(validated,total)}%</span><span className="ml-1 text-muted-foreground">canónico</span></div>
  </div>;
}

export function GeologiaDataCompleteness(){
  const { data, error, isLoading } = useSWR('/api/produccion/geologia/completeness', fetcher);
  if (error) return <StatePanel tone="error" title="No fue posible cargar la cobertura" description="La vista de Geología sigue disponible, pero esta auditoría no pudo consultar la capa canónica." className="min-h-0 py-5" />;
  if (isLoading || !data) return <StatePanel title="Auditando cobertura" description="Separando dato validado, evidencia recuperable y ausencia real." className="min-h-0 py-5" />;

  const s = data.summary;
  const total = s.totalCanonicalRows;

  return <div className="space-y-5">
    <section className="rounded-lg border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Calidad y completitud</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">Qué falta realmente en Geología</h2>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">El dashboard ya no interpreta todo vacío como ausencia. Distingue dato canónico validado, evidencia recuperable y fuente no localizada.</p>
        </div>
        <Database className="h-5 w-5 text-muted-foreground" />
      </div>
    </section>

    <section className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-4">
      <div className="bg-card p-4"><p className="text-xs text-muted-foreground">Filas canónicas</p><p className="mt-2 text-2xl font-semibold tabular-nums">{total}</p><p className="mt-1 text-xs text-muted-foreground">universo actual, aún sujeto a reconciliación</p></div>
      <div className="bg-card p-4"><p className="text-xs text-muted-foreground">Códigos físicos estimados</p><p className="mt-2 text-2xl font-semibold tabular-nums">{s.estimatedDistinctHoleCodes}</p><p className="mt-1 text-xs text-muted-foreground">descontando duplicados tipográficos evidentes</p></div>
      <div className="bg-card p-4"><p className="text-xs text-muted-foreground">Con evidencia geológica</p><p className="mt-2 text-2xl font-semibold tabular-nums">{s.withGeologyEvidence}</p><p className="mt-1 text-xs text-muted-foreground">aunque aún no esté estructurada en intervalos</p></div>
      <div className="bg-card p-4"><p className="text-xs text-muted-foreground">Intervalos estructurados</p><p className="mt-2 text-2xl font-semibold tabular-nums">{s.withStructuredIntervals}</p><p className="mt-1 text-xs text-muted-foreground">sondajes con logging canónico estructurado</p></div>
    </section>

    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="border-b px-4 py-4"><p className="font-medium">Cobertura por dimensión</p><p className="mt-1 text-sm text-muted-foreground">Negro = validado. Gris = evidencia fuente recuperable. El resto sí es gap real con las fuentes cargadas.</p></div>
      <CoverageRow label="Mina" validated={s.withMine} total={total} detail="Asignación canónica de mina" />
      <CoverageRow label="Sector" validated={s.withSector} total={total} detail="Asignación canónica de sector" />
      <CoverageRow label="Collar XY" validated={s.withCollarXY} recoverable={s.topographyRecoverable} total={total} detail="Coordenadas materializadas + evidencia topográfica por recuperar" />
      <CoverageRow label="Sistema de coordenadas" validated={s.withCrs} total={total} detail="CRS explícito del collar" />
      <CoverageRow label="Dip / inclinación" validated={s.withDip} total={total} detail="Ángulo vertical materializado" />
      <CoverageRow label="Azimut" validated={s.withAzimuth} recoverable={s.surveyRecoverable} total={total} detail="Azimut canónico + evidencia survey pendiente de estructurar" />
      <CoverageRow label="Orientación completa" validated={s.completeOrientation} recoverable={s.surveyRecoverable} total={total} detail="Sólo cuenta cuando existen azimut y dip" />
      <CoverageRow label="Profundidad ejecutada" validated={s.withDrilledDepth} total={total} detail="Metraje final disponible" />
      <CoverageRow label="Profundidad planificada" validated={s.withPlannedDepth} total={total} detail="Dato de planificación fuente" />
      <CoverageRow label="Propósito geológico formal" validated={s.withGeologicalPurpose} total={total} detail="No se infiere desde observaciones operacionales" />
    </section>

    <section className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-lg border bg-card p-4"><MapPinned className="h-4 w-4 text-muted-foreground"/><p className="mt-3 text-2xl font-semibold tabular-nums">{s.withTopographyEvidence}</p><p className="text-sm text-muted-foreground">sondajes con evidencia topográfica</p><p className="mt-2 text-xs text-muted-foreground">{s.topographyRecoverable} todavía no tienen collar XY materializado.</p></div>
      <div className="rounded-lg border bg-card p-4"><FileSearch className="h-4 w-4 text-muted-foreground"/><p className="mt-3 text-2xl font-semibold tabular-nums">{s.withSurveyEvidence}</p><p className="text-sm text-muted-foreground">sondajes con evidencia de survey</p><p className="mt-2 text-xs text-muted-foreground">{s.surveyRecoverable} siguen sin orientación completa canónica.</p></div>
      <div className="rounded-lg border bg-card p-4"><CheckCircle2 className="h-4 w-4 text-muted-foreground"/><p className="mt-3 text-2xl font-semibold tabular-nums">{s.textEvidenceOnly}</p><p className="text-sm text-muted-foreground">con geología textual aún no estructurada</p><p className="mt-2 text-xs text-muted-foreground">{s.noGeologyEvidence} no tienen evidencia geológica operacional localizada.</p></div>
    </section>

    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="flex items-start justify-between gap-4 border-b px-4 py-4"><div><p className="font-medium">Identidades a reconciliar</p><p className="mt-1 text-sm text-muted-foreground">Variantes que normalizan al mismo código. No se fusionan automáticamente porque una reutilización de código entre campañas también es posible.</p></div><AlertTriangle className="mt-1 h-4 w-4 text-muted-foreground"/></div>
      <div className="grid gap-px border-b bg-border sm:grid-cols-3"><div className="bg-card p-4"><p className="text-xs text-muted-foreground">Grupos duplicados</p><p className="mt-2 text-2xl font-semibold tabular-nums">{s.duplicateGroups}</p></div><div className="bg-card p-4"><p className="text-xs text-muted-foreground">Filas excedentes</p><p className="mt-2 text-2xl font-semibold tabular-nums">{s.duplicateExcessRows}</p></div><div className="bg-card p-4"><p className="text-xs text-muted-foreground">Regla</p><p className="mt-2 text-sm font-medium">Revisión humana antes de merge</p></div></div>
      <div className="divide-y">{data.duplicateGroups.map((group)=><div key={group.normalizedCode} className="grid gap-2 px-4 py-3 md:grid-cols-[180px_1fr]"><div><p className="font-medium">{group.normalizedCode}</p><p className="text-xs text-muted-foreground">{group.canonicalRows} filas canónicas</p></div><p className="text-sm text-muted-foreground">{group.variants.join(' · ')}</p></div>)}</div>
    </section>

    <section className="rounded-lg border bg-card p-4"><p className="font-medium">Controles de integridad</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><div><p className="text-2xl font-semibold tabular-nums">{s.negativeMeterRows}</p><p className="text-sm text-muted-foreground">filas con metraje negativo</p></div><div><p className="text-2xl font-semibold tabular-nums">{s.intervalsOutsideDepth}</p><p className="text-sm text-muted-foreground">intervalos fuera de profundidad final</p></div></div></section>
  </div>;
}
