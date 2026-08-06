'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Plus, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/page-header';
import { OperationalState } from '@/components/shared/operational-state';

type Stage = 'plan' | 'do' | 'check' | 'act' | 'closed';
type Item = {
  id: string; kaizen_number: string; title: string; problem_statement: string; priority: string;
  pdca_stage: Stage; status: string; owner_name: string | null; target_date: string | null;
  root_cause: string | null; proposed_countermeasure: string | null; implementation_notes: string | null;
  expected_result: string | null; actual_result: string | null; actual_saving: number; updated_at: string;
};

type ResponseData = { data: Item[]; summary: { total: number; active: number; verifying: number; standardized: number; savings: number } };

const columns: { key: Stage; label: string; hint: string }[] = [
  { key: 'plan', label: 'Plan', hint: 'Problema y causa' },
  { key: 'do', label: 'Do', hint: 'Contramedida' },
  { key: 'check', label: 'Check', hint: 'Verificar resultado' },
  { key: 'act', label: 'Act', hint: 'Estandarizar' },
  { key: 'closed', label: 'Cerrado', hint: 'Mejora consolidada' },
];

export default function KaizenPage() {
  const [payload, setPayload] = useState<ResponseData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [problem, setProblem] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/lean/kaizen', { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'No se pudo cargar Kaizen');
      setPayload(body);
    } catch (err) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const grouped = useMemo(() => Object.fromEntries(columns.map((column) => [column.key, payload?.data.filter((item) => item.pdca_stage === column.key) || []])) as Record<Stage, Item[]>, [payload]);

  const create = async () => {
    if (!title.trim() || !problem.trim()) return;
    setCreating(true); setError('');
    try {
      const response = await fetch('/api/lean/kaizen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, problem_statement: problem }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'No se pudo crear');
      setTitle(''); setProblem(''); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setCreating(false); }
  };

  const advance = async (item: Item) => {
    const index = columns.findIndex((column) => column.key === item.pdca_stage);
    const next = columns[Math.min(index + 1, columns.length - 1)].key;
    const additions: Record<string, unknown> = {};
    if (next === 'do') additions.proposed_countermeasure = item.proposed_countermeasure || 'Contramedida por completar';
    if (next === 'check') additions.implementation_notes = item.implementation_notes || 'Implementación registrada desde tablero PDCA';
    if (next === 'act') additions.actual_result = item.actual_result || 'Resultado pendiente de cuantificación final';
    const response = await fetch('/api/lean/kaizen', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id, pdca_stage: next, ...additions }) });
    const body = await response.json();
    if (!response.ok) { setError(body.error || 'No se pudo avanzar'); return; }
    await load();
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Lean" title="Kaizen + PDCA" description="Convierte problemas operacionales en mejoras verificadas y estandarizadas." actions={<Button variant="outline" onClick={() => void load()}><RefreshCw className="h-4 w-4" />Actualizar</Button>} />

      {error && <OperationalState variant="error" title="No se pudo completar la operación" description={error} />}
      {loading && <OperationalState variant="loading" title="Cargando mejoras" description="Leyendo el registro Kaizen de la organización." />}

      {payload && <>
        <div className="grid gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-5">
          {[
            ['Total', payload.summary.total], ['Activas', payload.summary.active], ['En verificación', payload.summary.verifying], ['Estandarizadas', payload.summary.standardized], ['Ahorro real', `$${Number(payload.summary.savings).toLocaleString('es-CL')}`],
          ].map(([label, value]) => <div key={String(label)} className="bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-medium">{value}</p></div>)}
        </div>

        <Card><CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_1.4fr_auto]">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Título de la mejora" />
          <Textarea value={problem} onChange={(event) => setProblem(event.target.value)} placeholder="Problema observable, sin asumir la causa" className="min-h-10" />
          <Button onClick={() => void create()} disabled={creating || !title.trim() || !problem.trim()}><Plus className="h-4 w-4" />Crear Kaizen</Button>
        </CardContent></Card>

        <div className="overflow-x-auto pb-3">
          <div className="grid min-w-[1320px] grid-cols-5 gap-3">
            {columns.map((column) => <section key={column.key} className="rounded-md border bg-muted/20">
              <header className="border-b p-3"><div className="flex items-center justify-between"><h2 className="text-sm font-medium">{column.label}</h2><Badge variant="outline">{grouped[column.key].length}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{column.hint}</p></header>
              <div className="space-y-2 p-2">
                {grouped[column.key].map((item) => <Card key={item.id} className="shadow-none"><CardContent className="space-y-3 p-3">
                  <div className="flex items-start justify-between gap-2"><div><p className="text-xs text-muted-foreground">{item.kaizen_number}</p><h3 className="mt-1 text-sm font-medium leading-snug">{item.title}</h3></div><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-current opacity-60" /></div>
                  <p className="line-clamp-3 text-xs text-muted-foreground">{item.problem_statement}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{item.owner_name || 'Sin responsable'}</span><span>{item.target_date || 'Sin fecha'}</span></div>
                  {column.key !== 'closed' && <Button size="sm" variant="outline" className="w-full" onClick={() => void advance(item)}>Avanzar PDCA<ArrowRight className="h-3.5 w-3.5" /></Button>}
                  {column.key === 'closed' && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Sparkles className="h-3.5 w-3.5" />Mejora consolidada</div>}
                </CardContent></Card>)}
                {!grouped[column.key].length && <div className="p-5 text-center text-xs text-muted-foreground">Sin elementos</div>}
              </div>
            </section>)}
          </div>
        </div>
      </>}
    </div>
  );
}
