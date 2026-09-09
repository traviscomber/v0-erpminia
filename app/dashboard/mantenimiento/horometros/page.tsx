'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { AlertTriangle, Gauge, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const fetcher = async (url: string) => { const response = await fetch(url, { credentials: 'include' }); const payload = await response.json().catch(() => null); if (!response.ok) throw new Error(payload?.error || 'No se pudieron cargar los horómetros'); return payload; };
const number = (value: unknown) => value == null ? '—' : new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 }).format(Number(value));
const money = (value: unknown) => value == null ? '—' : new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(value));

export default function RuntimeReadingsPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/maintenance/runtime-readings', fetcher, { revalidateOnFocus: false });
  const [assetId, setAssetId] = useState('');
  const [meterHours, setMeterHours] = useState('');
  const [recordedAt, setRecordedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const runtimeWithEvidence = useMemo(() => (data?.runtime || []).filter((row: any) => Number(row.reading_count || 0) > 0), [data]);
  const reconciliationQueue = data?.reconciliationQueue || [];

  function reviewAsset(item: any) {
    setAssetId(item.canonical_asset_id);
    setMeterHours('');
    setNotes(item.reason === 'meter_below_last_execution'
      ? `Reconciliación requerida: verificar reset/cambio de contador o corregir evidencia de fuente antes de usar esta lectura.`
      : `Validación requerida: registrar lectura física observada para reemplazar snapshot de fuente como base operacional.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveReading() {
    setActionMessage(null);
    if (!assetId || !meterHours || !recordedAt) return setActionMessage('Selecciona equipo, horómetro y fecha.');
    setSaving(true);
    try {
      const response = await fetch('/api/maintenance/runtime-readings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ canonicalAssetId: assetId, meterHours: Number(meterHours), recordedAt, sourceType: 'manual', notes }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No se pudo registrar la lectura');
      setMeterHours(''); setNotes('');
      setActionMessage(payload?.resetDetected ? 'Lectura guardada. Se detectó una baja de horómetro; ese tramo queda identificado como reinicio y no se usará para tasas.' : 'Lectura observada guardada.');
      await mutate();
    } catch (cause) {
      setActionMessage(cause instanceof Error ? cause.message : 'No se pudo registrar la lectura');
    } finally { setSaving(false); }
  }

  return <div className="space-y-6">
    <section className="flex flex-col gap-4 border-b border-border/70 pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div><p className="text-sm font-medium text-muted-foreground">Mantenimiento · Evidencia operacional</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Horómetros</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Registra horas acumuladas observadas por activo. MOTIL separa lecturas reales de snapshots históricos y excluye tramos con reinicio de medidor.</p></div>
      <div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link href="/dashboard/mantenimiento/planificacion">Planificación</Link></Button><Button asChild variant="outline"><Link href="/dashboard/mantenimiento/confiabilidad">Confiabilidad</Link></Button><Button variant="outline" onClick={() => void mutate()}><RefreshCw className="mr-2 h-4 w-4"/>Actualizar</Button></div>
    </section>

    {error ? <Card className="border-destructive/30 shadow-none"><CardContent className="p-5 text-sm text-destructive">{error.message}</CardContent></Card> : null}

    <Card className="shadow-none"><CardHeader><CardTitle className="text-lg">Registrar lectura observada</CardTitle></CardHeader><CardContent className="grid gap-3 lg:grid-cols-[1.4fr_180px_220px_1fr_auto]">
      <Select value={assetId} onValueChange={setAssetId}><SelectTrigger><SelectValue placeholder="Equipo"/></SelectTrigger><SelectContent>{(data?.assets || []).map((asset: any) => <SelectItem key={asset.id} value={asset.id}>{asset.asset_code ? `${asset.asset_code} · ` : ''}{asset.name || 'Sin nombre'}</SelectItem>)}</SelectContent></Select>
      <Input type="number" min="0" step="0.1" value={meterHours} onChange={(event) => setMeterHours(event.target.value)} placeholder="Horas acumuladas"/>
      <Input type="datetime-local" value={recordedAt} onChange={(event) => setRecordedAt(event.target.value)}/>
      <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Nota / evidencia de lectura"/>
      <Button onClick={() => void saveReading()} disabled={saving || !data?.canEdit}>{saving ? 'Guardando...' : 'Guardar lectura'}</Button>
      {actionMessage ? <p className="text-sm text-muted-foreground lg:col-span-5">{actionMessage}</p> : null}
    </CardContent></Card>

    {!isLoading && !error && reconciliationQueue.length > 0 ? <Card className="shadow-none"><CardHeader><CardTitle className="text-lg">Qué requiere reconciliación</CardTitle><p className="text-sm text-muted-foreground">Estos equipos no tienen una base de horómetro suficientemente confiable para planificación por horas. Resolver la evidencia aquí; no corregir automáticamente el contador.</p></CardHeader><CardContent className="space-y-3">{reconciliationQueue.map((item: any) => <div key={item.canonical_asset_id} className="flex flex-col gap-3 border-b pb-4 last:border-0 last:pb-0 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap gap-2"><Badge variant={item.reason === 'meter_below_last_execution' ? 'destructive' : 'secondary'}>{item.reason === 'meter_below_last_execution' ? 'Contador inconsistente' : 'Sin lectura observada'}</Badge><Badge variant="outline">{item.affected_tasks.length} pauta(s) afectada(s)</Badge></div><p className="mt-2 font-medium">{item.asset_code ? `${item.asset_code} · ` : ''}{item.asset_name}</p><p className="mt-1 text-sm text-muted-foreground">Snapshot: {number(item.source_meter_snapshot)} h · Última ejecución: {number(item.last_executed_meter)} h · Runtime observado: {number(item.latest_runtime_meter)} h</p><p className="mt-1 text-xs text-muted-foreground">Fuente: {item.source_reference || 'sin referencia explícita'}. Tareas: {item.affected_tasks.join(', ')}.</p></div><Button size="sm" variant="outline" onClick={() => reviewAsset(item)}>Registrar evidencia</Button></div>)}</CardContent></Card> : null}

    <div className="grid gap-3 md:grid-cols-4">
      <Card className="shadow-none"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Equipos con lecturas</p><p className="mt-1 text-2xl font-semibold">{runtimeWithEvidence.length}</p></CardContent></Card>
      <Card className="shadow-none"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Lecturas registradas</p><p className="mt-1 text-2xl font-semibold">{(data?.readings || []).length}</p></CardContent></Card>
      <Card className="shadow-none"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Con tasa utilizable</p><p className="mt-1 text-2xl font-semibold">{runtimeWithEvidence.filter((row: any) => row.usable_for_rate_metrics).length}</p></CardContent></Card>
      <Card className="shadow-none"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Por reconciliar</p><p className="mt-1 text-2xl font-semibold">{reconciliationQueue.length}</p></CardContent></Card>
    </div>

    <Card className="shadow-none"><CardHeader><CardTitle className="text-lg">Horas observadas por activo</CardTitle></CardHeader><CardContent className="p-0">{isLoading ? <div className="p-6 text-sm text-muted-foreground">Cargando...</div> : runtimeWithEvidence.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground"><Gauge className="mx-auto mb-3 h-6 w-6"/>Aún no existen lecturas reales de horómetro. No se calculan tasas de confiabilidad ni costo/hora sin esta evidencia.</div> : <div className="divide-y">{runtimeWithEvidence.map((row: any) => <div key={row.canonical_asset_id} className="grid gap-3 p-4 md:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))]"><div><p className="font-medium">{row.asset_code ? `${row.asset_code} · ` : ''}{row.asset_name}</p><p className="text-xs text-muted-foreground">{row.reading_count} lectura{Number(row.reading_count) === 1 ? '' : 's'}</p></div><div><p className="text-xs text-muted-foreground">Horómetro actual</p><p className="font-medium">{number(row.latest_meter_hours)} h</p></div><div><p className="text-xs text-muted-foreground">Horas observadas</p><p className="font-medium">{number(row.observed_operating_hours)} h</p></div><div><p className="text-xs text-muted-foreground">Costo auditado / h</p><p className="font-medium">{row.audited_cost_per_operating_hour == null ? 'Sin base suficiente' : money(row.audited_cost_per_operating_hour)}</p></div><div><p className="text-xs text-muted-foreground">Calidad</p><p className="font-medium">{row.usable_for_rate_metrics ? 'Utilizable' : 'Insuficiente'}</p>{Number(row.reset_count || 0) > 0 ? <p className="text-xs text-muted-foreground"><AlertTriangle className="mr-1 inline h-3 w-3"/>{row.reset_count} reinicio(s) excluido(s)</p> : null}</div></div>)}</div>}</CardContent></Card>
  </div>;
}
