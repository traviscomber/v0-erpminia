'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { ExternalLink, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatePanel } from '@/components/ui/state-panel';

type Category = 'collar_geometry' | 'drill_orientation' | 'geological_logging' | 'structural_orientation' | 'assays';

type Row = {
  drill_hole_id: string | null;
  hole_code: string | null;
  mine_name: string | null;
  sector_name: string | null;
  evidence_date: string | null;
  evidence_rows: number;
  source_reference: string | null;
  source_file: string | null;
  evidence_text: string | null;
  state: string;
  next_action: string;
};

type Response = { category: Category; semantics: string; rows: Row[] };

const fetcher = async (url: string): Promise<Response> => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'No fue posible cargar la bandeja de recuperación');
  return data;
};

const categories: Array<[Category, string]> = [
  ['collar_geometry', 'Collar / CRS'],
  ['drill_orientation', 'Survey'],
  ['geological_logging', 'Logging fuente'],
  ['structural_orientation', 'Estructuras'],
  ['assays', 'Ensayes'],
];
const categoryKeys = new Set<Category>(categories.map(([key]) => key));

const stateLabels: Record<string, string> = {
  operational_lithology_clue_formal_logging_missing: 'Pista operacional · falta logging original',
  historical_structure_clue_not_oriented: 'Estructura observada · falta medición orientada',
  explicit_hole_link_requires_interval_validation: 'Sondaje vinculado · falta validar intervalo',
  sample_to_hole_lineage_gap: 'Falta vínculo muestra → sondaje → intervalo',
  complete: 'Completo',
  partial: 'Parcial',
  missing: 'Fuente pendiente',
};

function humanState(value: string) {
  return stateLabels[value] || 'Evidencia pendiente de recuperar';
}

export function GeologiaEvidenceRecoveryWorklist() {
  const [category, setCategory] = useState<Category>('collar_geometry');
  const [query, setQuery] = useState('');
  const { data, error, isLoading } = useSWR<Response>(`/api/produccion/geologia/evidence-recovery-worklist?category=${category}`, fetcher);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const recovery = params.get('recovery') as Category | null;
    const hole = params.get('hole');
    if (recovery && categoryKeys.has(recovery)) setCategory(recovery);
    if (hole) setQuery(hole);
  }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.rows || []).filter((row) => !q || [row.hole_code, row.mine_name, row.sector_name, row.source_reference, row.evidence_text]
      .some((value) => String(value || '').toLowerCase().includes(q)));
  }, [data?.rows, query]);

  const syncUrl = (nextCategory: Category, nextQuery: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'priorities');
    url.searchParams.set('recovery', nextCategory);
    if (nextQuery.trim()) url.searchParams.set('hole', nextQuery.trim());
    else url.searchParams.delete('hole');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  };

  const selectCategory = (value: Category) => {
    setCategory(value);
    setQuery('');
    syncUrl(value, '');
  };

  const changeQuery = (value: string) => {
    setQuery(value);
    syncUrl(category, value);
  };

  return <section className="space-y-4 border-t pt-6">
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Bandeja de recuperación</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight">Sondajes y fuentes a revisar</h2>
      <p className="mt-2 max-w-4xl text-sm text-muted-foreground">Abre la pista exacta que debe revisar el equipo. Esta bandeja nunca materializa coordenadas, survey, logging, estructuras o ensayes por inferencia; en Logging fuente las observaciones operacionales sólo indican dónde buscar el registro geológico original.</p>
    </div>

    <div className="flex flex-wrap gap-2">
      {categories.map(([key, label]) => <Button key={key} size="sm" variant={category === key ? 'default' : 'outline'} onClick={() => selectCategory(key)}>{label}</Button>)}
    </div>

    <div className="relative max-w-lg">
      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
      <input value={query} onChange={(event) => changeQuery(event.target.value)} placeholder="Buscar sondaje, mina, sector o fuente" className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none" />
    </div>

    {error ? <StatePanel tone="error" title="No fue posible cargar la bandeja" description="Las fuentes canónicas permanecen intactas; falló sólo esta lectura derivada." className="min-h-0 py-5" /> : null}
    {isLoading ? <StatePanel title="Cargando pistas" description="Localizando sondajes y referencias fuente para revisión." className="min-h-0 py-5" /> : null}

    {data ? <>
      <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">{data.semantics}</div>
      {rows.length === 0 ? <StatePanel title="Sin filas para mostrar" description={query ? 'No hay coincidencias para la búsqueda.' : 'No hay pistas disponibles en esta categoría.'} className="min-h-0 py-5" /> : null}
      {rows.length ? <div className="overflow-hidden rounded-lg border bg-card">
        <div className="border-b px-5 py-4 text-sm"><strong>{rows.length}</strong> filas visibles · máximo 100 por categoría</div>
        <div className="divide-y">{rows.map((row, index) => <article key={`${row.drill_hole_id || row.source_reference || 'source'}-${index}`} className="p-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(160px,0.7fr)_minmax(220px,1.1fr)_110px_minmax(280px,1.4fr)_minmax(300px,1.5fr)]">
            <div>
              <p className="font-medium">{row.hole_code || 'Sin sondaje enlazado'}</p>
              <p className="mt-1 text-xs text-muted-foreground">{[row.mine_name, row.sector_name].filter(Boolean).join(' · ') || humanState(row.state)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fuente</p>
              <p className="mt-1 text-sm break-words">{row.source_file || row.source_reference || 'Sin referencia física identificada'}</p>
              {row.source_reference && row.source_reference !== row.source_file ? <p className="mt-1 text-xs text-muted-foreground break-words">{row.source_reference}</p> : null}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Evidencia</p>
              <p className="mt-1 font-medium tabular-nums">{row.evidence_rows}</p>
              {row.evidence_date ? <p className="mt-1 text-xs text-muted-foreground">{row.evidence_date}</p> : null}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Registro fuente</p>
              <p className="mt-1 text-sm">{row.evidence_text || 'La referencia apunta a evidencia histórica; revisar la fila fuente antes de estructurar.'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Acción segura</p>
              <p className="mt-1 text-sm">{row.next_action}</p>
              {row.hole_code ? <a href={`/dashboard/produccion/geologia?tab=priorities&recovery=${category}&hole=${encodeURIComponent(row.hole_code)}`} className="mt-2 inline-flex items-center gap-1 text-xs font-medium underline underline-offset-4">Abrir revisión enlazada <ExternalLink className="h-3 w-3" /></a> : null}
            </div>
          </div>
        </article>)}</div>
      </div> : null}
    </> : null}
  </section>;
}
