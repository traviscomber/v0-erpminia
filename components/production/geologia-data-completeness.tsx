'use client';

import useSWR from 'swr';
import { AlertTriangle, CheckCircle2, Database, FileSearch, MapPinned } from 'lucide-react';
import { StatePanel } from '@/components/ui/state-panel';

type CompletenessData = {
  summary: {
    totalCanonicalRows: number;
    normalizedIdentityLowerBound: number;
    duplicateGroups: number;
    duplicateExcessRows: number;
    withMine: number;
    withSector: number;
    withCollarXY: number;
    withCrs: number;
    withDip: number;
    dipRecoverable: number;
    withAzimuth: number;
    azimuthRecoverable: number;
    completeOrientation: number;
    orientationRecoverable: number;
    withDrilledDepth: number;
    withPlannedDepth: number;
    withGeologicalPurpose: number;
    withGeologyEvidence: number;
    withStructuredIntervals: number;
    withTopographyEvidence: number;
    topographyRecoverable: number;
    withSurveyEvidence: number;
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
function isSourceBoundary(value:number,total:number){return total === 0 || value / total < 0.10;}

function CoverageRow({label,available,total,sourceClue,detail}:{label:string;available:number;total:number;sourceClue?:number;detail:string}){
  const clueCount = Number(sourceClue || 0);
  const outside = Math.max(0, total - available - clueCount);
  const boundary = isSourceBoundary(available,total);
  return <div className="grid gap-3 border-b px-4 py-4 last:border-b-0 md:grid-cols-[210px_1fr_140px] md:items-center">
    <div><p className="font-medium">{label}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>
    <div>
      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
        <div className="bg-foreground" style={{width:`${pct(available,total)}%`}} />
        {clueCount > 0 ? <div className="bg-muted-foreground/45" style={{width:`${pct(clueCount,total)}%`}} /> : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span><span className="font-medium text-foreground">{available}</span> canónicos</span>
        {clueCount > 0 ? <span><span className="font-medium text-foreground">{clueCount}</span> con pista fuente</span> : null}
        <span><span className="font-medium text-foreground">{outside}</span> fuera de cobertura actual</span>
      </div>
    </div>
    <div className="text-right text-sm tabular-nums"><span className="font-semibold">{pct(available,total)}%</span><span className="ml-1 text-muted-foreground">canónico</span>{boundary?<p className="mt-1 text-xs text-muted-foreground">límite de fuente</p>:null}</div>
  </div>;
}

export function GeologiaDataCompleteness(){
  const { data, error, isLoading } = useSWR('/api/produccion/geologia/completeness', fetcher);
  if (error) return <StatePanel tone="error" title="No fue posible cargar la cobertura" description="La vista de Geología sigue disponible, pero esta auditoría no pudo consultar la capa canónica." className="min-h-0 py-5" />;
  if (isLoading || !data) return <StatePanel title="Leyendo cobertura canónica" description="Separando evidencia disponible, pistas de fuente y límites actuales sin generar tareas artificiales." className="min-h-0 py-5" />;

  const s = data.summary;
  const total = s.totalCanonicalRows;

  return <div className="space-y-5">
    <section className="rounded-lg border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Cobertura canónica</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">Qué evidencia tenemos en Geología</h2>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Esta vista describe el alcance real de la data cargada. Una dimensión casi ausente se trata como límite de la fuente, no como una lista de datos que el equipo deba conseguir. Una pista histórica indica que existe una referencia; no obliga a completar ni autoriza materializar valores.</p>
        </div>
        <Database className="h-5 w-5 text-muted-foreground" />
      </div>
    </section>

    <section className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-4">
      <div className="bg-card p-4"><p className="text-xs text-muted-foreground">Filas canónicas</p><p className="mt-2 text-2xl font-semibold tabular-nums">{total}</p><p className="mt-1 text-xs text-muted-foreground">universo actual, aún sujeto a reconciliación de identidad</p></div>
      <div className="bg-card p-4"><p className="text-xs text-muted-foreground">Cota tras normalización</p><p className="mt-2 text-2xl font-semibold tabular-nums">{s.normalizedIdentityLowerBound}</p><p className="mt-1 text-xs text-muted-foreground">no equivale a sondajes físicos hasta revisar reutilización de códigos</p></div>
      <div className="bg-card p-4"><p className="text-xs text-muted-foreground">Con evidencia geológica</p><p className="mt-2 text-2xl font-semibold tabular-nums">{s.withGeologyEvidence}</p><p className="mt-1 text-xs text-muted-foreground">evidencia operacional o geológica disponible</p></div>
      <div className="bg-card p-4"><p className="text-xs text-muted-foreground">Con intervalos estructurados</p><p className="mt-2 text-2xl font-semibold tabular-nums">{s.withStructuredIntervals}</p><p className="mt-1 text-xs text-muted-foreground">sondajes con intervalos operacionales estructurados; no equivalen a logging geológico formal</p></div>
    </section>

    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="border-b px-4 py-4"><p className="font-medium">Disponibilidad por dimensión</p><p className="mt-1 text-sm text-muted-foreground">Negro = dato canónico disponible. Gris = referencia histórica o pista de fuente. El resto está fuera de la cobertura actual; no se interpreta automáticamente como trabajo pendiente.</p></div>
      <CoverageRow label="Mina" available={s.withMine} total={total} detail="Asignación canónica de mina" />
      <CoverageRow label="Sector" available={s.withSector} total={total} detail="Asignación canónica de sector" />
      <CoverageRow label="Collar XY" available={s.withCollarXY} sourceClue={s.topographyRecoverable} total={total} detail="Coordenadas materializadas; las referencias topográficas se muestran sólo como pistas de fuente" />
      <CoverageRow label="Sistema de coordenadas" available={s.withCrs} total={total} detail="CRS explícito del collar" />
      <CoverageRow label="Dip / inclinación" available={s.withDip} sourceClue={s.dipRecoverable} total={total} detail="Valor canónico + referencias de medición cuando existen" />
      <CoverageRow label="Azimut" available={s.withAzimuth} sourceClue={s.azimuthRecoverable} total={total} detail="Valor canónico + referencias de medición cuando existen" />
      <CoverageRow label="Orientación completa" available={s.completeOrientation} sourceClue={s.orientationRecoverable} total={total} detail="Sólo cuenta cuando existen azimut y dip canónicos" />
      <CoverageRow label="Profundidad ejecutada" available={s.withDrilledDepth} total={total} detail="Metraje final disponible" />
      <CoverageRow label="Profundidad planificada" available={s.withPlannedDepth} total={total} detail="Dato de planificación fuente" />
      <CoverageRow label="Propósito geológico formal" available={s.withGeologicalPurpose} total={total} detail="No se infiere desde observaciones operacionales" />
    </section>

    <section className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-lg border bg-card p-4"><MapPinned className="h-4 w-4 text-muted-foreground"/><p className="mt-3 text-2xl font-semibold tabular-nums">{s.withTopographyEvidence}</p><p className="text-sm text-muted-foreground">sondajes con referencia topográfica histórica</p><p className="mt-2 text-xs text-muted-foreground">{s.withCollarXY}/{total} tienen collar XY canónico. Las referencias restantes no generan una campaña automática.</p></div>
      <div className="rounded-lg border bg-card p-4"><FileSearch className="h-4 w-4 text-muted-foreground"/><p className="mt-3 text-2xl font-semibold tabular-nums">{s.withSurveyEvidence}</p><p className="text-sm text-muted-foreground">sondajes con referencia de survey o medición</p><p className="mt-2 text-xs text-muted-foreground">{s.completeOrientation}/{total} tienen orientación completa canónica. La baja cobertura limita la interpretación, no crea una obligación de completitud.</p></div>
      <div className="rounded-lg border bg-card p-4"><CheckCircle2 className="h-4 w-4 text-muted-foreground"/><p className="mt-3 text-2xl font-semibold tabular-nums">{s.textEvidenceOnly}</p><p className="text-sm text-muted-foreground">con evidencia textual no estructurada</p><p className="mt-2 text-xs text-muted-foreground">{s.noGeologyEvidence} no tienen evidencia geológica operacional localizada en las fuentes actuales.</p></div>
    </section>

    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="flex items-start justify-between gap-4 border-b px-4 py-4"><div><p className="font-medium">Identidades a reconciliar</p><p className="mt-1 text-sm text-muted-foreground">Estas sí son excepciones accionables sobre evidencia ya existente: variantes que normalizan al mismo código. No se fusionan automáticamente porque una reutilización entre campañas también es posible.</p></div><AlertTriangle className="mt-1 h-4 w-4 text-muted-foreground"/></div>
      <div className="grid gap-px border-b bg-border sm:grid-cols-3"><div className="bg-card p-4"><p className="text-xs text-muted-foreground">Grupos duplicados</p><p className="mt-2 text-2xl font-semibold tabular-nums">{s.duplicateGroups}</p></div><div className="bg-card p-4"><p className="text-xs text-muted-foreground">Filas excedentes</p><p className="mt-2 text-2xl font-semibold tabular-nums">{s.duplicateExcessRows}</p></div><div className="bg-card p-4"><p className="text-xs text-muted-foreground">Regla</p><p className="mt-2 text-sm font-medium">Revisión humana antes de merge</p></div></div>
      <div className="divide-y">{data.duplicateGroups.map((group)=><div key={group.normalizedCode} className="grid gap-2 px-4 py-3 md:grid-cols-[180px_1fr]"><div><p className="font-medium">{group.normalizedCode}</p><p className="text-xs text-muted-foreground">{group.canonicalRows} filas canónicas</p></div><p className="text-sm text-muted-foreground">{group.variants.join(' · ')}</p></div>)}</div>
    </section>

    <section className="rounded-lg border bg-card p-4"><p className="font-medium">Controles de integridad</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><div><p className="text-2xl font-semibold tabular-nums">{s.negativeMeterRows}</p><p className="text-sm text-muted-foreground">filas con metraje negativo</p></div><div><p className="text-2xl font-semibold tabular-nums">{s.intervalsOutsideDepth}</p><p className="text-sm text-muted-foreground">intervalos fuera de profundidad final</p></div></div></section>
  </div>;
}
