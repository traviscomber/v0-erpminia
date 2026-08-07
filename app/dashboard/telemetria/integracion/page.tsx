'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { ArrowLeft, CheckCircle2, RadioTower, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Data = { sensors: any[]; links: any[]; equipment: any[]; assets: any[] };
const fetcher = async (url: string) => { const response = await fetch(url, { credentials: 'include' }); const payload = await response.json().catch(() => null); if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar'); return payload as Data; };

export default function TelemetriaIntegracionPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/telemetry/maintenance', fetcher, { revalidateOnFocus: false });
  const [sensorId, setSensorId] = useState(''); const [value, setValue] = useState(''); const [token, setToken] = useState(''); const [running, setRunning] = useState<'validate' | 'send' | null>(null); const [result, setResult] = useState<any>(null);
  const linkedEquipment = useMemo(() => new Set((data?.links || []).map((row) => row.legacy_equipment_id)), [data?.links]);
  const linkedSensors = (data?.sensors || []).filter((row) => linkedEquipment.has(row.equipment_id));
  const selected = linkedSensors.find((row) => row.id === sensorId) || null;
  const payload = selected && value !== '' ? { sensor_code: selected.sensor_code, value: Number(value), unit: selected.unit || undefined } : null;

  async function run(mode: 'validate' | 'send') {
    if (!payload || !token.trim()) return;
    setRunning(mode); setResult(null);
    const body = mode === 'validate' ? { ...payload, validate_only: true } : payload;
    try {
      const response = await fetch('/api/telemetry/ingest', { method: 'POST', headers: { 'content-type': 'application/json', 'x-telemetry-token': token.trim() }, body: JSON.stringify(body) });
      const json = await response.json().catch(() => null); setResult({ ok: response.ok, ...json });
    } catch (cause) { setResult({ ok: false, error: cause instanceof Error ? cause.message : 'No se pudo procesar la lectura.' }); }
    setRunning(null);
  }

  return <div className="space-y-6">
    <section className="flex flex-col gap-4 border-b border-border/70 pb-6 md:flex-row md:items-end md:justify-between"><div><p className="text-sm font-medium text-muted-foreground">Integración de telemetría</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Recibir una lectura real</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Selecciona un sensor existente. Motil valida la lectura contra los umbrales configurados en ese sensor; no acepta estados o diagnósticos enviados por el origen.</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => void mutate()}><RefreshCw className="mr-2 h-4 w-4"/>Actualizar</Button><Button variant="outline" asChild><Link href="/dashboard/telemetria/mantenimiento"><ArrowLeft className="mr-2 h-4 w-4"/>Condiciones</Link></Button></div></section>
    {error && <Card className="shadow-none"><CardContent className="p-4 text-sm text-muted-foreground">No se pudieron cargar los sensores.</CardContent></Card>}
    <div className="grid gap-6 lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)]"><Card className="shadow-none"><CardHeader><CardTitle className="text-lg">Lectura</CardTitle></CardHeader><CardContent className="space-y-4"><div className="space-y-2"><Label>Sensor vinculado</Label><Select value={sensorId} onValueChange={setSensorId}><SelectTrigger><SelectValue placeholder={isLoading ? 'Cargando…' : 'Seleccionar sensor'}/></SelectTrigger><SelectContent>{linkedSensors.map((row) => <SelectItem key={row.id} value={row.id}>{row.sensor_code} · {row.name}</SelectItem>)}</SelectContent></Select>{!isLoading && linkedSensors.length === 0 && <p className="text-xs text-muted-foreground">Primero vincula el equipo de telemetría con su equipo canónico.</p>}</div><div className="space-y-2"><Label>Valor observado {selected?.unit ? `(${selected.unit})` : ''}</Label><Input type="number" step="any" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Valor medido"/></div><div className="space-y-2"><Label>Token de recepción</Label><Input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Token configurado en el servidor"/></div>{selected && <div className="rounded-lg border p-3 text-xs text-muted-foreground"><p>Umbrales registrados en el sensor:</p><p className="mt-1">Mínimo: {selected.min_threshold ?? 'sin definir'} · Máximo: {selected.max_threshold ?? 'sin definir'} · Alarma: {selected.alarm_threshold ?? 'sin definir'} · Crítico: {selected.critical_threshold ?? 'sin definir'}</p></div>}<div className="flex gap-2"><Button variant="outline" disabled={running !== null || !payload || !token.trim()} onClick={() => void run('validate')}>{running === 'validate' ? 'Validando…' : 'Validar sin guardar'}</Button><Button disabled={running !== null || !payload || !token.trim()} onClick={() => void run('send')}>{running === 'send' ? 'Enviando…' : 'Guardar lectura'}</Button></div></CardContent></Card>
      <Card className="shadow-none"><CardHeader><CardTitle className="text-lg">Resultado</CardTitle></CardHeader><CardContent>{!result ? <div className="py-12 text-center text-sm text-muted-foreground"><RadioTower className="mx-auto mb-3 h-5 w-5"/>Valida primero para comprobar sensor, vínculo y umbrales sin escribir datos.</div> : <div className="space-y-4"><div className="flex gap-2"><Badge variant={result.ok ? 'secondary' : 'destructive'}>{result.ok ? 'Correcto' : 'Error'}</Badge>{result.dry_run && <Badge variant="outline">Sin guardar</Badge>}</div>{result.error && <p className="text-sm">{result.error}</p>}{result.results?.map((row: any, index: number) => <div key={row.reading_id || index} className="rounded-lg border p-4"><p className="font-medium">{row.sensor_code} · {row.value} {row.unit || ''}</p><p className="mt-1 text-sm text-muted-foreground">Estado calculado: {row.status === 'normal' ? 'Dentro de rango' : row.status === 'critical' ? 'Condición crítica' : 'Requiere revisión'}</p>{row.condition && <p className="mt-2 text-sm">Umbral utilizado: {row.condition.threshold_value} {row.unit || ''}</p>}{row.reading_id && <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5"/>Lectura registrada.</p>}</div>)}</div>}</CardContent></Card></div>
    <Card className="shadow-none"><CardHeader><CardTitle className="text-lg">Contrato mínimo para gateway o PLC</CardTitle></CardHeader><CardContent><pre className="overflow-x-auto rounded-lg bg-muted/50 p-4 text-sm">{`POST /api/telemetry/ingest\nx-telemetry-token: <token>\n\n{\n  "sensor_code": "${selected?.sensor_code || '<sensor real>'}",\n  "value": <valor medido>,\n  "timestamp": "<ISO-8601 opcional>"\n}`}</pre><p className="mt-3 text-sm text-muted-foreground">También se acepta `readings[]` para lotes. Cada elemento debe identificar un sensor real. La severidad se calcula en Motil usando sus umbrales configurados.</p></CardContent></Card>
  </div>;
}
