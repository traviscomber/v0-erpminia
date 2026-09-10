'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { ArrowLeft, CheckCircle2, RefreshCw, Search } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

type Asset = { id: string; asset_code: string | null; name: string | null; asset_type: string | null; location: string | null };
type Response = { rows: SourceRow[]; assets: Asset[]; counts: Record<string, number>; canReview: boolean; semantics: { authority: string; source: string } };

const fetcher = async (url: string): Promise<Response> => {
  const response = await apiFetch(url);
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la revisión de datos');
  return payload;
};

export default function PlanningDataPage() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<Response>('/api/planificacion/reconciliacion', fetcher, { revalidateOnFocus: false });
  const [query, setQuery] = useState('');
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data?.rows || [];
    return (data?.rows || []).filter((row) => [row.asset_name_raw, row.mine_raw, row.meter_unit, row.criticality_raw].some((value) => String(value || '').toLowerCase().includes(q)));
  }, [data?.rows, query]);

  async function confirm(row: SourceRow) {
    const canonicalAssetId = selection[row.id];
    if (!canonicalAssetId) return;
    setSaving(row.id);
    setMessage('');
    try {
      const response = await apiFetch('/api/planificacion/reconciliacion', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowId: row.id, canonicalAssetId }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No se pudo confirmar la reconciliación');
      setMessage(`Identidad confirmada: ${row.asset_name_raw}`);
      setSelection((current) => { const next = { ...current }; delete next[row.id]; return next; });
      await mutate();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'No se pudo confirmar la reconciliación');
    } finally {
      setSaving(null);
    }
  }

  const pending = data ? (data.counts.unmatched || 0) + (data.counts.ambiguous || 0) + (data.counts.review_required || 0) : null;
  const matched = data?.counts.matched || 0;
  const total = data ? Object.values(data.counts).reduce((sum, value) => sum + value, 0) : 0;
  const byUnit = useMemo(() => (data?.rows || []).reduce((acc, row) => {
    const unit = String(row.meter_unit || '').trim().toLowerCase();
    if (unit === 'h') acc.hours += 1;
    else if (unit === 'km') acc.km += 1;
    else acc.annual += 1;
    return acc;
  }, { hours: 0, km: 0, annual: 0 }), [data?.rows]);

  return <main className="space-y-6">
    <PageHeader>
      <PageHeaderContent>
        <PageHeaderEyebrow>Planning Intelligence · Gobierno de datos</PageHeaderEyebrow>
        <PageHeaderTitle>Data de Ariel</PageHeaderTitle>
        <PageHeaderDescription>Esta no es una lista de errores. Son identidades que MOTIL dejó deliberadamente sin fusionar para que Ariel confirme sólo lo que reconoce con certeza.</PageHeaderDescription>
      </PageHeaderContent>
      <PageHeaderActions>
        <Button variant="outline" asChild><Link href="/dashboard/planificacion"><ArrowLeft className="h-4 w-4"/>Planificación</Link></Button>
        <Button variant="outline" onClick={() => void mutate()} disabled={isValidating}><RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`}/>Actualizar</Button>
      </PageHeaderActions>
    </PageHeader>

    <section className="grid divide-y rounded-lg border border-border bg-card sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      <div className="px-5 py-4"><p className="text-xs text-muted-foreground">Identidad confirmada</p><p className="mt-1 text-2xl font-semibold">{isLoading ? '—' : matched}</p><p className="mt-1 text-xs text-muted-foreground">de {total || '—'} filas</p></div>
      <div className="px-5 py-4"><p className="text-xs text-muted-foreground">Por aclarar con Ariel</p><p className="mt-1 text-2xl font-semibold">{isLoading ? '—' : pending}</p><p className="mt-1 text-xs text-muted-foreground">no implica error de fuente</p></div>
      <div className="px-5 py-4"><p className="text-xs text-muted-foreground">Cobertura confirmada</p><p className="mt-1 text-2xl font-semibold">{total ? `${Math.round((matched / total) * 100)}%` : '—'}</p><p className="mt-1 text-xs text-muted-foreground">sin fusiones forzadas</p></div>
    </section>

    {!isLoading && !error && pending ? <StatePanel tone="warning" title="Ariel mantiene la última palabra" description={`${byUnit.hours} equipos por horas · ${byUnit.km} por kilómetros · ${byUnit.annual} de control anual. Si Ariel no reconoce una coincidencia inequívoca, debe dejarla pendiente.`} className="min-h-0"/> : null}

    {message ? <p className="rounded-lg border border-border bg-card px-4 py-3 text-sm">{message}</p> : null}
    {error ? <StatePanel tone="error" title="No se pudo cargar la data de Ariel" description={error.message} actions={<Button variant="outline" onClick={() => void mutate()}>Reintentar</Button>} className="min-h-0"/> : null}
    {isLoading ? <StatePanel tone="loading" title="Cargando aclaraciones" description="Consultando evidencia de Ariel y maestro canónico de activos." className="min-h-0"/> : null}

    {!isLoading && !error ? <section className="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div><h2 className="text-lg font-semibold">Equipos por aclarar</h2><p className="mt-1 text-sm text-muted-foreground">Selecciona un activo canónico sólo cuando corresponda al mismo equipo físico. No hace falta resolver todo de una vez.</p></div>
        <div className="relative w-full md:max-w-sm"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar equipo, mina o unidad" aria-label="Buscar filas por aclarar"/></div>
      </div>

      {rows.length === 0 ? <StatePanel tone="neutral" title="Sin aclaraciones visibles" description="No hay filas que coincidan con el filtro actual o las identidades ya fueron confirmadas." className="min-h-0"/> : <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="divide-y divide-border">
          {rows.map((row) => <article key={row.id} className="grid gap-4 px-4 py-4 xl:grid-cols-[minmax(260px,1fr)_minmax(320px,1.4fr)_auto] xl:items-center xl:px-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">{row.asset_name_raw}</h3><Badge variant="outline">Fila {row.source_row}</Badge><Badge variant="secondary">Por aclarar</Badge></div>
              <p className="mt-1 text-xs text-muted-foreground">{row.mine_raw || 'Sin mina'} · {row.meter_unit || 'Sin unidad'} · criticidad {row.criticality_raw || 'sin validar'}</p>
              {row.current_reading != null ? <p className="mt-2 text-sm">Lectura de la fuente: {Number(row.current_reading).toLocaleString('es-CL')} {row.meter_unit || ''}</p> : null}
              {row.observations ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{row.observations}</p> : null}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor={`asset-${row.id}`}>Mismo equipo en MOTIL</label>
              <Select value={selection[row.id] || ''} onValueChange={(value) => setSelection((current) => ({ ...current, [row.id]: value }))} disabled={!data?.canReview}>
                <SelectTrigger id={`asset-${row.id}`} className="w-full"><SelectValue placeholder="Seleccionar sólo si es inequívoco"/></SelectTrigger>
                <SelectContent>{(data?.assets || []).map((asset) => <SelectItem key={asset.id} value={asset.id}>{asset.asset_code || 'Sin código'} · {asset.name || 'Sin nombre'}{asset.location ? ` · ${asset.location}` : ''}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={() => void confirm(row)} disabled={!data?.canReview || !selection[row.id] || saving === row.id}>{saving === row.id ? 'Guardando…' : <><CheckCircle2 className="h-4 w-4"/>Confirmar identidad</>}</Button>
          </article>)}
        </div>
      </div>}
      {!data?.canReview ? <StatePanel tone="warning" title="Modo sólo lectura" description="Tu sesión puede revisar esta evidencia, pero sólo un planificador con permiso de edición en Mantenimiento puede confirmar identidades." className="min-h-0"/> : null}
    </section> : null}
  </main>;
}
