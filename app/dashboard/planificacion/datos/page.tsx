'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { ArrowLeft, Check, ChevronRight, CircleHelp, RefreshCw, Search, Wrench } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatePanel } from '@/components/ui/state-panel';
import { PageHeader, PageHeaderActions, PageHeaderContent, PageHeaderDescription, PageHeaderEyebrow, PageHeaderTitle } from '@/components/ui/page-header';

type SourceRow = {
  id: string;
  source_row: number;
  mine_raw: string | null;
  asset_name_raw: string;
  meter_unit: string | null;
  current_reading: number | null;
  criticality_raw: string | null;
  observations: string | null;
  reconciliation_status: string;
};

type Asset = {
  id: string;
  asset_code: string | null;
  name: string | null;
  asset_type: string | null;
  manufacturer: string | null;
  model: string | null;
  license_plate: string | null;
  location: string | null;
};

type Response = {
  rows: SourceRow[];
  assets: Asset[];
  counts: Record<string, number>;
  missingAssets: number;
  canReview: boolean;
  semantics: { authority: string; source: string };
};

const fetcher = async (url: string): Promise<Response> => {
  const response = await apiFetch(url);
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la revisión de datos');
  return payload;
};

const GENERIC = new Set(['equipo', 'modelo', 'mina', 'planta', 'camion', 'generador', 'bomba', 'compresor', 'caterpillar']);

function normalize(value: string | null | undefined) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokens(value: string | null | undefined) {
  return normalize(value).split(/\s+/).filter((token) => token.length >= 2);
}

function candidateScore(row: SourceRow, asset: Asset) {
  const sourceTokens = new Set(tokens(row.asset_name_raw));
  const target = [asset.asset_code, asset.name, asset.manufacturer, asset.model, asset.license_plate].filter(Boolean).join(' ');
  const targetTokens = new Set(tokens(target));
  let score = 0;

  for (const token of sourceTokens) {
    if (!targetTokens.has(token)) continue;
    if (/^\d+$/.test(token) || /\d/.test(token)) score += 3;
    else if (GENERIC.has(token)) score += 0.35;
    else score += 1.5;
  }

  const source = normalize(row.asset_name_raw);
  const name = normalize(asset.name);
  if (source && name && (source.includes(name) || name.includes(source))) score += 4;
  return score;
}

function assetLabel(asset: Asset) {
  const code = asset.asset_code && asset.asset_code !== asset.name ? `${asset.asset_code} · ` : '';
  return `${code}${asset.name || 'Activo sin nombre'}`;
}

export default function PlanningDataPage() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<Response>('/api/planificacion/reconciliacion', fetcher, { revalidateOnFocus: false });
  const [cursor, setCursor] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [assetQuery, setAssetQuery] = useState('');
  const [confirmMissing, setConfirmMissing] = useState(false);

  const rows = data?.rows || [];
  const safeCursor = rows.length ? cursor % rows.length : 0;
  const row = rows[safeCursor];
  const matched = data?.counts.matched || 0;
  const total = data ? Object.values(data.counts).reduce((sum, value) => sum + value, 0) : 0;
  const missingAssets = data?.missingAssets || 0;

  const suggestions = useMemo(() => {
    if (!row) return [];
    return (data?.assets || [])
      .map((asset) => ({ asset, score: candidateScore(row, asset) }))
      .filter(({ score }) => score >= 3)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ asset }) => asset);
  }, [data?.assets, row]);

  const searchResults = useMemo(() => {
    const q = normalize(assetQuery);
    if (!q) return [];
    return (data?.assets || [])
      .filter((asset) => normalize([asset.asset_code, asset.name, asset.manufacturer, asset.model, asset.license_plate].filter(Boolean).join(' ')).includes(q))
      .slice(0, 10);
  }, [assetQuery, data?.assets]);

  async function answer(action: 'match' | 'missing_asset', canonicalAssetId?: string) {
    if (!row) return;
    setSaving(true);
    setMessage('');
    try {
      const response = await apiFetch('/api/planificacion/reconciliacion', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowId: row.id, action, canonicalAssetId }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No se pudo guardar la respuesta');
      setMessage(action === 'match' ? `Listo: ${row.asset_name_raw} quedó identificado.` : `Listo: ${row.asset_name_raw} quedó marcado como activo faltante en MOTIL.`);
      setShowSearch(false);
      setAssetQuery('');
      setConfirmMissing(false);
      await mutate();
      setCursor((current) => Math.min(current, Math.max(0, rows.length - 2)));
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'No se pudo guardar la respuesta');
    } finally {
      setSaving(false);
    }
  }

  function next() {
    if (!rows.length) return;
    setCursor((current) => (current + 1) % rows.length);
    setShowSearch(false);
    setAssetQuery('');
    setConfirmMissing(false);
    setMessage('');
  }

  return <main className="space-y-6">
    <PageHeader>
      <PageHeaderContent>
        <PageHeaderEyebrow>Planning Intelligence · Gobierno de datos</PageHeaderEyebrow>
        <PageHeaderTitle>Aclaraciones de Ariel</PageHeaderTitle>
        <PageHeaderDescription>Una pregunta a la vez. Ariel identifica el equipo, indica que falta en MOTIL o sigue con el siguiente.</PageHeaderDescription>
      </PageHeaderContent>
      <PageHeaderActions>
        <Button variant="outline" asChild><Link href="/dashboard/planificacion"><ArrowLeft className="h-4 w-4"/>Planificación</Link></Button>
        <Button variant="outline" onClick={() => void mutate()} disabled={isValidating}><RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`}/>Actualizar</Button>
      </PageHeaderActions>
    </PageHeader>

    <section className="grid divide-y rounded-lg border border-border bg-card sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      <div className="px-5 py-4"><p className="text-xs text-muted-foreground">Identificados</p><p className="mt-1 text-2xl font-semibold">{isLoading ? '—' : matched}</p><p className="mt-1 text-xs text-muted-foreground">de {total || '—'} filas</p></div>
      <div className="px-5 py-4"><p className="text-xs text-muted-foreground">Por responder</p><p className="mt-1 text-2xl font-semibold">{isLoading ? '—' : rows.length}</p><p className="mt-1 text-xs text-muted-foreground">sólo decisiones pendientes</p></div>
      <div className="px-5 py-4"><p className="text-xs text-muted-foreground">Faltan en maestro</p><p className="mt-1 text-2xl font-semibold">{isLoading ? '—' : missingAssets}</p><p className="mt-1 text-xs text-muted-foreground">declarados por planificación</p></div>
    </section>

    {message ? <p className="rounded-lg border border-border bg-card px-4 py-3 text-sm">{message}</p> : null}
    {error ? <StatePanel tone="error" title="No se pudo cargar la data de Ariel" description={error.message} actions={<Button variant="outline" onClick={() => void mutate()}>Reintentar</Button>} className="min-h-0"/> : null}
    {isLoading ? <StatePanel tone="loading" title="Preparando la siguiente pregunta" description="Consultando evidencia de Ariel y maestro canónico de activos." className="min-h-0"/> : null}

    {!isLoading && !error && !row ? <StatePanel tone="neutral" title="No quedan respuestas pendientes" description="Todas las filas fueron identificadas o clasificadas. Los activos marcados como faltantes quedan separados para incorporarlos al maestro con evidencia." className="min-h-0"/> : null}

    {!isLoading && !error && row ? <section className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
        <span>Pregunta {safeCursor + 1} de {rows.length}</span>
        <span>{total ? Math.round(((matched + missingAssets) / total) * 100) : 0}% clasificado</span>
      </div>
      <div className="h-1 overflow-hidden bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${rows.length ? ((safeCursor + 1) / rows.length) * 100 : 100}%` }}/></div>

      <article className="border border-border bg-card">
        <div className="border-b border-border px-5 py-5 sm:px-7">
          <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">Fila {row.source_row}</Badge><Badge variant="secondary">{row.mine_raw || 'Sin mina'}</Badge><Badge variant="outline">{row.meter_unit || 'Sin unidad'}</Badge></div>
          <h2 className="mt-4 text-xl font-semibold sm:text-2xl">{row.asset_name_raw}</h2>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
            <span>Criticidad: {row.criticality_raw || 'sin validar'}</span>
            {row.current_reading != null ? <span>Lectura: {Number(row.current_reading).toLocaleString('es-CL')} {row.meter_unit || ''}</span> : null}
          </div>
          {row.observations ? <p className="mt-3 text-sm text-muted-foreground">{row.observations}</p> : null}
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-7 sm:py-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pregunta para Ariel</p>
            <h3 className="mt-1 text-lg font-semibold">¿Este equipo ya existe en MOTIL?</h3>
            <p className="mt-1 text-sm text-muted-foreground">Elige sólo si es el mismo equipo físico. Si no aparece, indícalo y seguimos.</p>
          </div>

          {suggestions.length ? <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Sugerencias por nombre y modelo</p>
            {suggestions.map((asset) => <div key={asset.id} className="flex flex-col gap-3 border border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0"><p className="text-sm font-medium">{assetLabel(asset)}</p>{asset.license_plate ? <p className="mt-0.5 text-xs text-muted-foreground">Patente {asset.license_plate}</p> : null}</div>
              <Button size="sm" onClick={() => void answer('match', asset.id)} disabled={!data?.canReview || saving}><Check className="h-4 w-4"/>Sí, es este</Button>
            </div>)}
          </div> : <StatePanel tone="neutral" title="No encontré una sugerencia clara" description="Puedes buscar el activo manualmente o indicar que todavía falta en MOTIL." className="min-h-0"/>}

          {showSearch ? <div className="space-y-3 border-t border-border pt-5">
            <div className="relative"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><Input autoFocus className="pl-9" value={assetQuery} onChange={(event) => setAssetQuery(event.target.value)} placeholder="Nombre, código, modelo o patente" aria-label="Buscar otro activo en MOTIL"/></div>
            {assetQuery && searchResults.length === 0 ? <p className="text-sm text-muted-foreground">No hay resultados con esa búsqueda.</p> : null}
            {searchResults.map((asset) => <div key={asset.id} className="flex flex-col gap-3 border border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm font-medium">{assetLabel(asset)}</p><Button size="sm" variant="outline" onClick={() => void answer('match', asset.id)} disabled={!data?.canReview || saving}>Es este</Button></div>)}
          </div> : null}

          {confirmMissing ? <div className="border border-border bg-muted/30 px-4 py-4">
            <p className="text-sm font-medium">¿Confirmas que este equipo todavía no está en el maestro de MOTIL?</p>
            <p className="mt-1 text-xs text-muted-foreground">No se creará ningún activo automáticamente. Quedará en la cola de activos faltantes.</p>
            <div className="mt-3 flex flex-wrap gap-2"><Button onClick={() => void answer('missing_asset')} disabled={!data?.canReview || saving}><Wrench className="h-4 w-4"/>{saving ? 'Guardando…' : 'Sí, falta en MOTIL'}</Button><Button variant="ghost" onClick={() => setConfirmMissing(false)} disabled={saving}>Cancelar</Button></div>
          </div> : null}

          <div className="flex flex-col gap-2 border-t border-border pt-5 sm:flex-row sm:flex-wrap">
            <Button variant="outline" onClick={() => setShowSearch((value) => !value)} disabled={saving}><Search className="h-4 w-4"/>{showSearch ? 'Cerrar búsqueda' : 'Buscar otro activo'}</Button>
            <Button variant="outline" onClick={() => setConfirmMissing(true)} disabled={!data?.canReview || saving}><Wrench className="h-4 w-4"/>Falta en MOTIL</Button>
            <Button variant="ghost" onClick={next} disabled={saving}><CircleHelp className="h-4 w-4"/>No sé todavía<ChevronRight className="h-4 w-4"/></Button>
          </div>
        </div>
      </article>

      {!data?.canReview ? <StatePanel tone="warning" title="Modo sólo lectura" description="Tu sesión puede revisar esta evidencia, pero sólo un planificador con permiso de edición en Mantenimiento puede responder aclaraciones." className="min-h-0"/> : null}
    </section> : null}
  </main>;
}
