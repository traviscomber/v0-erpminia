'use client';

import { FormEvent, useState } from 'react';
import useSWR from 'swr';
import { BellRing, CheckCircle2, Play, Plus, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Rule = { id: string; name: string; category: string; severity: string | null; enabled: boolean; created_by: string };
type Run = { id: string; rule_id: string; source_key: string; category: string; created_at: string };

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar');
  return payload || {};
};

const categoryLabel: Record<string, string> = {
  maintenance: 'Mantenimiento',
  preventive: 'Preventivos',
  inventory: 'Inventario',
  documents: 'Documentos',
  finance: 'Finanzas',
};

export default function AutomatizacionesPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/automations/rules', fetcher, { revalidateOnFocus: false });
  const [name, setName] = useState('');
  const [category, setCategory] = useState('maintenance');
  const [severity, setSeverity] = useState('any');
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const rules: Rule[] = data?.rules || [];
  const runs: Run[] = data?.runs || [];

  async function createRule(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const response = await fetch('/api/automations/rules', {
      method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), category, severity: severity === 'any' ? null : severity }),
    });
    setSaving(false);
    if (response.ok) { setName(''); await mutate(); }
  }

  async function toggleRule(rule: Rule) {
    await fetch('/api/automations/rules', {
      method: 'PATCH', credentials: 'include', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: rule.id, enabled: !rule.enabled }),
    });
    await mutate();
  }

  async function evaluate() {
    setChecking(true); setResult(null);
    const response = await fetch('/api/automations/evaluate', { method: 'POST', credentials: 'include' });
    const payload = await response.json().catch(() => null);
    setChecking(false);
    if (response.ok) {
      setResult(`${Number(payload?.matches || 0)} coincidencias registradas sobre ${Number(payload?.checked || 0)} acciones actuales.`);
      await mutate();
    } else setResult(payload?.error || 'No se pudieron comprobar las reglas.');
  }

  return <div className="space-y-6">
    <section className="flex flex-col gap-4 border-b border-border/70 pb-6 md:flex-row md:items-end md:justify-between">
      <div><p className="text-sm font-medium text-muted-foreground">Avisos automáticos</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Reglas automáticas</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Crea avisos cuando una excepción real cumpla una condición. Estas reglas no compran, pagan, cierran órdenes ni cambian registros operacionales.</p></div>
      <Button variant="outline" onClick={() => void evaluate()} disabled={checking}><Play className="mr-2 h-4 w-4" />{checking ? 'Comprobando…' : 'Comprobar ahora'}</Button>
    </section>

    {result && <Card className="shadow-none"><CardContent className="flex items-center gap-3 p-4"><CheckCircle2 className="h-5 w-5" /><p className="text-sm">{result}</p></CardContent></Card>}

    <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      <Card className="h-fit shadow-none"><CardHeader><CardTitle className="text-lg">Nueva regla</CardTitle></CardHeader><CardContent><form className="space-y-4" onSubmit={createRule}>
        <div className="space-y-2"><Label htmlFor="rule-name">Nombre</Label><Input id="rule-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Avisar por stock crítico" /></div>
        <div className="space-y-2"><Label>Área</Label><Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(categoryLabel).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Prioridad</Label><Select value={severity} onValueChange={setSeverity}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="any">Cualquiera</SelectItem><SelectItem value="critical">Crítica</SelectItem><SelectItem value="warning">Atención</SelectItem><SelectItem value="info">Seguimiento</SelectItem></SelectContent></Select></div>
        <Button className="w-full" disabled={saving || !name.trim()}><Plus className="mr-2 h-4 w-4" />{saving ? 'Guardando…' : 'Crear regla'}</Button>
      </form></CardContent></Card>

      <div className="space-y-6">
        <Card className="shadow-none"><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="flex items-center gap-2 text-lg"><BellRing className="h-5 w-5" /> Reglas</CardTitle><Button size="icon" variant="ghost" onClick={() => void mutate()}><RefreshCw className="h-4 w-4" /></Button></CardHeader><CardContent className="p-0">
          {error ? <div className="p-6 text-sm text-muted-foreground">No se pudieron cargar las reglas.</div> : isLoading ? <div className="p-6 text-sm text-muted-foreground">Cargando…</div> : rules.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">Todavía no hay reglas registradas.</div> : <div className="divide-y border-t">{rules.map(rule => <div key={rule.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap gap-2"><Badge variant={rule.enabled ? 'secondary' : 'outline'}>{rule.enabled ? 'Activa' : 'Pausada'}</Badge><Badge variant="outline">{categoryLabel[rule.category] || rule.category}</Badge>{rule.severity && <Badge variant="outline">{rule.severity === 'critical' ? 'Crítica' : rule.severity === 'warning' ? 'Atención' : 'Seguimiento'}</Badge>}</div><p className="mt-2 font-medium">{rule.name}</p><p className="mt-1 text-xs text-muted-foreground">Acción permitida: generar aviso.</p></div><Button size="sm" variant="outline" onClick={() => void toggleRule(rule)}>{rule.enabled ? 'Pausar' : 'Activar'}</Button></div>)}</div>}
        </CardContent></Card>

        <Card className="shadow-none"><CardHeader><CardTitle className="text-lg">Historial reciente</CardTitle></CardHeader><CardContent className="p-0">{runs.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">Aún no hay coincidencias registradas.</div> : <div className="divide-y border-t">{runs.slice(0, 20).map(run => <div key={run.id} className="flex items-center justify-between gap-3 p-4"><div><p className="text-sm font-medium">{categoryLabel[run.category] || run.category}</p><p className="mt-1 text-xs text-muted-foreground">Referencia: {run.source_key}</p></div><p className="text-xs text-muted-foreground">{new Date(run.created_at).toLocaleString('es-CL')}</p></div>)}</div>}</CardContent></Card>
      </div>
    </div>
  </div>;
}
