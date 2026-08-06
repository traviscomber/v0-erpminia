'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Plus, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderTitle,
} from '@/components/ui/page-header';
import { StatePanel } from '@/components/ui/state-panel';

type Stage = 'plan' | 'do' | 'check' | 'act' | 'closed';
type Improvement = {
  id: string;
  kaizen_number: string;
  title: string;
  problem_statement: string;
  priority: string;
  pdca_stage: Stage;
  status: string;
  owner_name: string | null;
  target_date: string | null;
  root_cause: string | null;
  proposed_countermeasure: string | null;
  implementation_notes: string | null;
  expected_result: string | null;
  actual_result: string | null;
  verification_method: string | null;
  actual_saving: number;
  updated_at: string;
};

type ResponseData = {
  data: Improvement[];
  summary: { total: number; active: number; verifying: number; standardized: number; savings: number };
};

const columns: { key: Stage; label: string; hint: string }[] = [
  { key: 'plan', label: 'Definir', hint: 'Problema y causa' },
  { key: 'do', label: 'Aplicar', hint: 'Acción en ejecución' },
  { key: 'check', label: 'Comprobar', hint: 'Revisar el resultado' },
  { key: 'act', label: 'Estandarizar', hint: 'Incorporar la mejora' },
  { key: 'closed', label: 'Cerrado', hint: 'Mejora consolidada' },
];

const nextStage: Record<Stage, Stage | null> = {
  plan: 'do',
  do: 'check',
  check: 'act',
  act: 'closed',
  closed: null,
};

const actionLabels: Record<Stage, string> = {
  plan: 'Preparar acción',
  do: 'Registrar ejecución',
  check: 'Comprobar resultado',
  act: 'Cerrar mejora',
  closed: 'Cerrada',
};

function displayNumber(value: string) {
  const match = value.match(/(\d+)$/);
  return match ? `Mejora ${match[1]}` : 'Mejora';
}

function formatDate(value: string | null) {
  if (!value) return 'Sin fecha';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ImprovementsPage() {
  const [payload, setPayload] = useState<ResponseData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [problem, setProblem] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [selected, setSelected] = useState<Improvement | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [cause, setCause] = useState('');
  const [preventiveAction, setPreventiveAction] = useState('');
  const [implementation, setImplementation] = useState('');
  const [result, setResult] = useState('');
  const [verification, setVerification] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/lean/kaizen', { credentials: 'include', cache: 'no-store' });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || 'No fue posible cargar las mejoras');
      setPayload(body);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar las mejoras');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const grouped = useMemo(
    () => Object.fromEntries(
      columns.map((column) => [
        column.key,
        payload?.data.filter((item) => item.pdca_stage === column.key) || [],
      ]),
    ) as Record<Stage, Improvement[]>,
    [payload],
  );

  const create = async () => {
    if (!title.trim() || !problem.trim()) return;
    setCreating(true);
    setError('');
    try {
      const response = await fetch('/api/lean/kaizen', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          problem_statement: problem.trim(),
          target_date: targetDate || null,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || 'No fue posible crear la mejora');
      setTitle('');
      setProblem('');
      setTargetDate('');
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'No fue posible crear la mejora');
    } finally {
      setCreating(false);
    }
  };

  const openAdvanceDialog = (item: Improvement) => {
    setSelected(item);
    setCause(item.root_cause || '');
    setPreventiveAction(item.proposed_countermeasure || '');
    setImplementation(item.implementation_notes || '');
    setResult(item.actual_result || '');
    setVerification(item.verification_method || '');
    setError('');
    setDialogOpen(true);
  };

  const advance = async () => {
    if (!selected) return;
    const destination = nextStage[selected.pdca_stage];
    if (!destination) return;

    const additions: Record<string, unknown> = {};
    if (destination === 'do') {
      if (!cause.trim() || !preventiveAction.trim()) {
        setError('Registra la causa principal y la acción que se aplicará.');
        return;
      }
      additions.root_cause = cause.trim();
      additions.proposed_countermeasure = preventiveAction.trim();
    }
    if (destination === 'check') {
      if (!implementation.trim()) {
        setError('Registra qué se hizo antes de continuar.');
        return;
      }
      additions.implementation_notes = implementation.trim();
    }
    if (destination === 'act') {
      if (!result.trim() || !verification.trim()) {
        setError('Registra el resultado y cómo fue comprobado.');
        return;
      }
      additions.actual_result = result.trim();
      additions.verification_method = verification.trim();
    }

    setAdvancing(true);
    setError('');
    try {
      const response = await fetch('/api/lean/kaizen', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected.id, pdca_stage: destination, ...additions }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || 'No fue posible guardar la mejora');
      setDialogOpen(false);
      setSelected(null);
      await load();
    } catch (advanceError) {
      setError(advanceError instanceof Error ? advanceError.message : 'No fue posible guardar la mejora');
    } finally {
      setAdvancing(false);
    }
  };

  const destination = selected ? nextStage[selected.pdca_stage] : null;

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Control y mejora</PageHeaderEyebrow>
          <PageHeaderTitle>Mejoras y seguimiento</PageHeaderTitle>
          <PageHeaderDescription>
            Convierte problemas repetidos en acciones aplicadas, comprobadas y adoptadas como una nueva forma de trabajo.
          </PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualizar
          </Button>
        </PageHeaderActions>
      </PageHeader>

      {error ? <StatePanel tone="error" title="No fue posible completar la acción" description={error} className="min-h-0 py-5" /> : null}
      {loading ? <StatePanel tone="loading" title="Cargando mejoras" description="Revisando el avance de las mejoras registradas." /> : null}

      {payload ? (
        <>
          <div className="grid gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-5">
            {[
              ['Total', payload.summary.total],
              ['Activas', payload.summary.active],
              ['En comprobación', payload.summary.verifying],
              ['Estandarizadas', payload.summary.standardized],
              ['Ahorro real', `$${Number(payload.summary.savings).toLocaleString('es-CL')}`],
            ].map(([label, value]) => (
              <div key={String(label)} className="bg-card p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-medium">{value}</p>
              </div>
            ))}
          </div>

          <Card>
            <CardContent className="grid gap-3 p-4 lg:grid-cols-[1fr_1.4fr_180px_auto] lg:items-start">
              <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Título de la mejora" />
              <Textarea
                value={problem}
                onChange={(event) => setProblem(event.target.value)}
                placeholder="Describe el problema observable"
                className="min-h-10"
              />
              <Input
                type="date"
                value={targetDate}
                onChange={(event) => setTargetDate(event.target.value)}
                aria-label="Fecha objetivo"
              />
              <Button onClick={() => void create()} disabled={creating || !title.trim() || !problem.trim()}>
                <Plus className="h-4 w-4" />Crear mejora
              </Button>
            </CardContent>
          </Card>

          <div className="overflow-x-auto pb-3">
            <div className="grid min-w-[1320px] grid-cols-5 gap-3">
              {columns.map((column) => (
                <section key={column.key} className="rounded-md border bg-muted/20">
                  <header className="border-b p-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-medium">{column.label}</h2>
                      <Badge variant="outline">{grouped[column.key].length}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{column.hint}</p>
                  </header>
                  <div className="space-y-2 p-2">
                    {grouped[column.key].map((item) => (
                      <Card key={item.id} className="shadow-none">
                        <CardContent className="space-y-3 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs text-muted-foreground">{displayNumber(item.kaizen_number)}</p>
                              <h3 className="mt-1 text-sm font-medium leading-snug">{item.title}</h3>
                            </div>
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-current opacity-60" />
                          </div>
                          <p className="line-clamp-3 text-xs text-muted-foreground">{item.problem_statement}</p>
                          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                            <span className="truncate">{item.owner_name || 'Sin responsable'}</span>
                            <span className="shrink-0">{formatDate(item.target_date)}</span>
                          </div>
                          {column.key !== 'closed' ? (
                            <Button size="sm" variant="outline" className="w-full" onClick={() => openAdvanceDialog(item)}>
                              {actionLabels[column.key]}<ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Sparkles className="h-3.5 w-3.5" />Mejora consolidada
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                    {!grouped[column.key].length ? <div className="p-5 text-center text-xs text-muted-foreground">Sin elementos</div> : null}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{selected ? actionLabels[selected.pdca_stage] : 'Continuar mejora'}</DialogTitle>
            <DialogDescription>
              {selected ? `${displayNumber(selected.kaizen_number)} · ${selected.title}` : 'Completa la información necesaria.'}
            </DialogDescription>
          </DialogHeader>

          {destination === 'do' ? (
            <div className="grid gap-4">
              <div>
                <label className="text-sm font-medium">Causa principal</label>
                <Textarea className="mt-2 min-h-28" value={cause} onChange={(event) => setCause(event.target.value)} placeholder="Qué origina el problema" />
              </div>
              <div>
                <label className="text-sm font-medium">Acción que se aplicará</label>
                <Textarea className="mt-2 min-h-28" value={preventiveAction} onChange={(event) => setPreventiveAction(event.target.value)} placeholder="Qué se hará y cómo" />
              </div>
            </div>
          ) : null}

          {destination === 'check' ? (
            <div>
              <label className="text-sm font-medium">Qué se hizo</label>
              <Textarea className="mt-2 min-h-32" value={implementation} onChange={(event) => setImplementation(event.target.value)} placeholder="Describe la ejecución y el respaldo disponible" />
            </div>
          ) : null}

          {destination === 'act' ? (
            <div className="grid gap-4">
              <div>
                <label className="text-sm font-medium">Resultado observado</label>
                <Textarea className="mt-2 min-h-28" value={result} onChange={(event) => setResult(event.target.value)} placeholder="Qué cambió después de aplicar la acción" />
              </div>
              <div>
                <label className="text-sm font-medium">Cómo se comprobó</label>
                <Textarea className="mt-2 min-h-24" value={verification} onChange={(event) => setVerification(event.target.value)} placeholder="Medición, revisión o evidencia utilizada" />
              </div>
            </div>
          ) : null}

          {destination === 'closed' ? (
            <div className="rounded-md border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
              Confirma que la mejora fue incorporada a la forma habitual de trabajo y puede cerrarse.
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={advancing}>Cancelar</Button>
            <Button onClick={() => void advance()} disabled={advancing}>
              {destination === 'closed' ? 'Confirmar cierre' : 'Guardar y continuar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
