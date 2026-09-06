'use client';

type IntervalRow = {
  from_m?: number | null;
  to_m?: number | null;
  lithology?: string | null;
  alteration?: string | null;
  mineralization?: string | null;
  operational_result?: string | null;
};

type UnitRow = {
  from_m?: number | null;
  to_m?: number | null;
  evidence_class?: string | null;
  lithology_observed?: string | null;
  mineralization_state?: string | null;
  rock_conditions?: string[] | null;
  structural_features?: string[] | null;
  confidence?: string | null;
  evidence_text?: string | null;
};

type PointRow = {
  at_depth_m?: number | null;
  observation_type?: string | null;
  observation?: string | null;
  confidence?: string | null;
};

type TransitionRow = {
  at_depth_m?: number | null;
  observed_transition?: string | null;
  confidence?: string | null;
};

function num(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function intervalTitle(row: IntervalRow) {
  return [row.lithology, row.mineralization, row.operational_result].filter(Boolean).join(' · ') || 'Intervalo estructurado';
}

function unitTitle(row: UnitRow) {
  return [row.lithology_observed, row.mineralization_state, ...(row.structural_features || []), ...(row.rock_conditions || [])].filter(Boolean).join(' · ') || row.evidence_class || 'Unidad operacional';
}

export function GeologiaInterpretationColumn({
  depth,
  intervals,
  units,
  points,
  transitions,
}: {
  depth: number | null;
  intervals: IntervalRow[];
  units: UnitRow[];
  points: PointRow[];
  transitions: TransitionRow[];
}) {
  const observedMax = Math.max(
    0,
    ...intervals.flatMap((row) => [num(row.from_m) || 0, num(row.to_m) || 0]),
    ...units.flatMap((row) => [num(row.from_m) || 0, num(row.to_m) || 0]),
    ...points.map((row) => num(row.at_depth_m) || 0),
    ...transitions.map((row) => num(row.at_depth_m) || 0),
  );
  const maxDepth = Math.max(depth || 0, observedMax);
  if (maxDepth <= 0) return null;

  const chartHeight = clamp(Math.round(maxDepth * 3.2), 420, 900);
  const ticks = Array.from({ length: 6 }, (_, index) => (maxDepth * index) / 5);
  const top = (value: number) => `${clamp((value / maxDepth) * 100, 0, 100)}%`;
  const height = (from: number, to: number) => `${Math.max(0.8, ((to - from) / maxDepth) * 100)}%`;

  return (
    <section className="rounded-lg border bg-card p-5">
      <div className="flex flex-col gap-2 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-medium">Columna interpretada</p>
          <p className="mt-1 text-sm text-muted-foreground">Evidencia ordenada por profundidad. Los carriles no implican correlación ni continuidad fuera de los tramos observados.</p>
        </div>
        <p className="text-xs tabular-nums text-muted-foreground">0–{maxDepth.toLocaleString('es-CL', { maximumFractionDigits: 1 })} m</p>
      </div>

      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[680px]">
          <div className="grid grid-cols-[74px_repeat(4,minmax(120px,1fr))] gap-2 pb-2 text-xs text-muted-foreground">
            <span>Prof.</span><span>Litología / intervalos</span><span>Mineralización</span><span>Estructuras / roca</span><span>Puntos / transiciones</span>
          </div>
          <div className="relative grid grid-cols-[74px_repeat(4,minmax(120px,1fr))] gap-2" style={{ height: chartHeight }}>
            <div className="relative border-r">
              {ticks.map((tick) => <div key={tick} className="absolute right-2 -translate-y-1/2 text-[11px] tabular-nums text-muted-foreground" style={{ top: top(tick) }}>{tick.toLocaleString('es-CL', { maximumFractionDigits: 0 })} m</div>)}
            </div>

            <div className="relative border bg-muted/10">
              {intervals.map((row, index) => {
                const from = num(row.from_m); const to = num(row.to_m); if (from == null || to == null || to <= from) return null;
                return <div key={`interval-${index}`} className="absolute left-1 right-1 overflow-hidden border bg-background px-1.5 py-1 text-[10px] leading-tight" style={{ top: top(from), height: height(from, to) }} title={`${from}–${to} m · ${intervalTitle(row)}`}><span className="line-clamp-3">{row.lithology || intervalTitle(row)}</span></div>;
              })}
              {units.filter((row) => row.lithology_observed).map((row, index) => {
                const from = num(row.from_m); const to = num(row.to_m); if (from == null || to == null || to <= from) return null;
                return <div key={`lith-unit-${index}`} className="absolute left-3 right-3 border-l-2 px-1 text-[10px] text-muted-foreground" style={{ top: top(from), height: height(from, to) }} title={`${from}–${to} m · ${unitTitle(row)}`}>{row.lithology_observed}</div>;
              })}
            </div>

            <div className="relative border bg-muted/10">
              {units.filter((row) => row.mineralization_state).map((row, index) => {
                const from = num(row.from_m); const to = num(row.to_m); if (from == null || to == null || to <= from) return null;
                return <div key={`min-${index}`} className="absolute left-2 right-2 border-x border-y bg-foreground/10 px-1 text-[10px]" style={{ top: top(from), height: height(from, to) }} title={`${from}–${to} m · ${row.mineralization_state}`}>{row.mineralization_state}</div>;
              })}
              {intervals.filter((row) => row.mineralization).map((row, index) => {
                const from = num(row.from_m); const to = num(row.to_m); if (from == null || to == null || to <= from) return null;
                return <div key={`min-interval-${index}`} className="absolute left-5 right-5 border bg-background px-1 text-[10px]" style={{ top: top(from), height: height(from, to) }} title={`${from}–${to} m · ${row.mineralization}`}>{row.mineralization}</div>;
              })}
            </div>

            <div className="relative border bg-muted/10">
              {units.filter((row) => (row.structural_features || []).length > 0 || (row.rock_conditions || []).length > 0).map((row, index) => {
                const from = num(row.from_m); const to = num(row.to_m); if (from == null || to == null || to <= from) return null;
                const label = [...(row.structural_features || []), ...(row.rock_conditions || [])].join(' · ');
                return <div key={`structure-${index}`} className="absolute left-2 right-2 border-l-2 px-1 text-[10px] text-muted-foreground" style={{ top: top(from), height: height(from, to) }} title={`${from}–${to} m · ${label}`}>{label}</div>;
              })}
            </div>

            <div className="relative border bg-muted/10">
              {points.map((row, index) => {
                const at = num(row.at_depth_m); if (at == null) return null;
                return <div key={`point-${index}`} className="absolute left-2 right-2 -translate-y-1/2 border-t" style={{ top: top(at) }} title={`${at} m · ${row.observation || row.observation_type || 'observación'}`}><span className="relative -top-2 inline-block bg-card pr-1 text-[10px]">{row.observation || row.observation_type || 'Punto'}</span></div>;
              })}
              {transitions.map((row, index) => {
                const at = num(row.at_depth_m); if (at == null) return null;
                return <div key={`transition-${index}`} className="absolute left-2 right-2 -translate-y-1/2 border-t border-dashed" style={{ top: top(at) }} title={`${at} m · ${row.observed_transition || 'transición'}`}><span className="relative -top-2 inline-block bg-card pr-1 text-[10px] text-muted-foreground">↳ {row.observed_transition || 'Transición'}</span></div>;
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 border-t pt-4 text-xs text-muted-foreground sm:grid-cols-3">
        <p><strong className="text-foreground">Intervalo:</strong> tramo estructurado o unidad operacional observada.</p>
        <p><strong className="text-foreground">Punto:</strong> observación explícita a una profundidad.</p>
        <p><strong className="text-foreground">Transición:</strong> cambio reportado; requiere validación para usarlo como contacto.</p>
      </div>
    </section>
  );
}
