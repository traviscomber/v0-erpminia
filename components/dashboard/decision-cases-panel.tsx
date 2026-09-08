'use client';

import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';
import { Archive, ArrowRight, CheckCircle2, Plus, RefreshCw, Route, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type SourceRef = { source?: string; tool?: string; mode?: string };
type DecisionCase = {
  id: string;
  source_domain: string;
  target_domain: string;
  title: string;
  summary: string;
  evidence_refs: SourceRef[];
  uncertainty?: string | null;
  contradictions?: string[];
  missing_evidence?: string[];
  recommended_human_action?: string | null;
  recommended_workflow_key?: string | null;
  authority: 'advisory_only';
  status: 'open' | 'acknowledged' | 'archived';
  last_revalidated_at?: string | null;
  last_revalidated_by_user_id?: string | null;
  last_revalidation_evidence_refs?: SourceRef[];
  created_at: string;
};

type Response = {
  cases?: DecisionCase[];
  hiddenByCurrentPermissions?: number;
  authority?: string;
  policy?: string;
};

type ParsedCaseSections = {
  uncertainty: string | null;
  contradictions: string[];
  missingEvidence: string[];
  nextHumanAction: string | null;
};

const labels: Record<string, string> = {
  executive: 'Centro Ejecutivo',
  inventory: 'Inventario',
  procurement: 'Compras',
  production: 'Producción',
  finance: 'Finanzas',
  documents: 'Documentos',
  data_health: 'Calidad de Datos',
  maintenance: 'Mantención',
  geology: 'Geología',
};

const domainHref: Record<string, string> = {
  executive: '/dashboard/decisiones',
  inventory: '/dashboard/inventario',
  procurement: '/dashboard/compras',
  production: '/dashboard/produccion',
  finance: '/dashboard/finanzas',
  documents: '/dashboard/documentos',
  data_health: '/dashboard/calidad-datos',
  maintenance: '/dashboard/mantenimiento',
  geology: '/dashboard/produccion/geologia',
};

const sourceDomains = ['executive', 'inventory', 'procurement', 'production', 'finance', 'documents', 'data_health'] as const;
const targetDomains = [...sourceDomains, 'maintenance', 'geology'] as const;

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudieron cargar los Decision Cases.');
  return payload as Response;
};

function shortSummary(value: string) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > 280 ? `${text.slice(0, 277)}…` : text;
}

function evidenceLabel(ref: SourceRef) {
  return ref.tool || ref.source || 'Fuente';
}

function formatRevalidationDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function parseExplicitCaseSections(summary: string): ParsedCaseSections {
  const parsed: ParsedCaseSections = {
    uncertainty: null,
    contradictions: [],
    missingEvidence: [],
    nextHumanAction: null,
  };

  for (const rawLine of String(summary || '').split(/\r?\n/)) {
    const line = rawLine.replace(/^[-*•\s]+/, '').trim();
    if (!line) continue;
    const match = line.match(/^(incertidumbre|contradicciones?|evidencia faltante|evidencia que falta|siguiente validaci[oó]n humana|siguiente acci[oó]n humana|acci[oó]n humana recomendada)\s*[:：-]\s*(.+)$/i);
    if (!match) continue;
    const key = match[1].toLowerCase();
    const value = match[2].trim();
    if (!value) continue;

    if (key.startsWith('incertidumbre')) parsed.uncertainty = parsed.uncertainty || value;
    else if (key.startsWith('contradic')) parsed.contradictions.push(value);
    else if (key.startsWith('evidencia')) parsed.missingEvidence.push(value);
    else parsed.nextHumanAction = parsed.nextHumanAction || value;
  }

  return parsed;
}

export function DecisionCasesPanel() {
  const state = useSWR<Response>('/api/intelligence/decision-cases?status=open', fetcher, { revalidateOnFocus: false });
  const cases = state.data?.cases || [];
  const [sourceDomain, setSourceDomain] = useState('');
  const [targetDomain, setTargetDomain] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createNotice, setCreateNotice] = useState<string | null>(null);

  const createLatest = async () => {
    if (!sourceDomain || !targetDomain || creating) return;
    setCreating(true);
    setCreateError(null);
    setCreateNotice(null);
    try {
      const response = await fetch('/api/intelligence/decision-cases', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_latest', sourceDomain, targetDomain }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No se pudo crear el handoff.');
      setCreateNotice(payload?.duplicate ? 'Ese análisis ya tiene un caso abierto hacia el mismo destino.' : 'Decision Case creado desde la última respuesta fundamentada.');
      await state.mutate();
    } catch (cause) {
      setCreateError(cause instanceof Error ? cause.message : 'No se pudo crear el handoff.');
    } finally {
      setCreating(false);
    }
  };

  const updateCase = async (caseId: string, action: 'acknowledge' | 'archive') => {
    const response = await fetch('/api/intelligence/decision-cases', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, caseId }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || 'No se pudo actualizar el caso.');
    await state.mutate();
  };

  return (
    <section className="mt-6 space-y-3" aria-label="Decision Cases del Intelligence Core">
      <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight">Casos de decisión del Intelligence Core</h2>
            <Badge variant="outline">Advisory</Badge>
          </div>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Handoffs explicables creados desde respuestas con evidencia persistida. No aprueban, ejecutan ni reemplazan decisiones operacionales.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void state.mutate()} disabled={state.isLoading}>
          <RefreshCw className="mr-2 size-4" />Actualizar casos
        </Button>
      </div>

      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
            <label className="space-y-1.5 text-xs font-medium">
              Análisis origen
              <select value={sourceDomain} onChange={(event) => setSourceDomain(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-normal text-foreground outline-none focus:ring-2 focus:ring-primary/40">
                <option value="">Seleccionar último análisis fundamentado</option>
                {sourceDomains.map((domain) => <option key={domain} value={domain}>{labels[domain]}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-xs font-medium">
              Handoff a
              <select value={targetDomain} onChange={(event) => setTargetDomain(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-normal text-foreground outline-none focus:ring-2 focus:ring-primary/40">
                <option value="">Seleccionar dominio destino</option>
                {targetDomains.map((domain) => <option key={domain} value={domain}>{labels[domain]}</option>)}
              </select>
            </label>
            <Button type="button" onClick={() => void createLatest()} disabled={!sourceDomain || !targetDomain || creating}>
              <Plus className="mr-2 size-4" />{creating ? 'Creando…' : 'Crear handoff'}
            </Button>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-muted-foreground">El servidor toma la última respuesta del dominio que tenga evidencia persistida, vuelve a validar permisos de origen y destino y evita duplicar un caso abierto. Mantención y Geología reciben el caso como referencia advisory; sus especialistas no son modificados.</p>
          {createError ? <p className="mt-2 text-xs text-destructive">{createError}</p> : null}
          {createNotice ? <p className="mt-2 text-xs text-muted-foreground">{createNotice}</p> : null}
        </CardContent>
      </Card>

      {state.error ? (
        <Card className="border-destructive/30">
          <CardContent className="p-4 text-sm text-destructive">{state.error.message}</CardContent>
        </Card>
      ) : null}

      {!state.error && state.isLoading ? (
        <Card><CardContent className="p-5 text-sm text-muted-foreground">Cargando casos advisory autorizados…</CardContent></Card>
      ) : null}

      {!state.error && !state.isLoading && cases.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex items-start gap-3 p-5">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">No hay Decision Cases abiertos.</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Esto no significa ausencia de riesgos ni decisiones pendientes. Sólo indica que no existen handoffs advisory visibles con tus permisos actuales.</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3 xl:grid-cols-2">
        {cases.slice(0, 8).map((item) => {
          const evidence = Array.isArray(item.evidence_refs) ? item.evidence_refs : [];
          const revalidationEvidence = Array.isArray(item.last_revalidation_evidence_refs) ? item.last_revalidation_evidence_refs : [];
          const revalidatedAt = formatRevalidationDate(item.last_revalidated_at);
          const explicit = parseExplicitCaseSections(item.summary);
          const missing = Array.isArray(item.missing_evidence) && item.missing_evidence.length
            ? item.missing_evidence
            : explicit.missingEvidence;
          const contradictions = Array.isArray(item.contradictions) && item.contradictions.length
            ? item.contradictions
            : explicit.contradictions;
          const uncertainty = item.uncertainty || explicit.uncertainty;
          const nextHumanAction = item.recommended_human_action || explicit.nextHumanAction;
          const targetHref = domainHref[item.target_domain] || '/dashboard/decisiones';
          return (
            <Card key={item.id}>
              <CardHeader className="space-y-3 pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Route className="size-4" />
                    <span>{labels[item.source_domain] || item.source_domain}</span>
                    <span>→</span>
                    <span className="font-medium text-foreground">{labels[item.target_domain] || item.target_domain}</span>
                  </div>
                  <Badge variant="secondary">No canónico</Badge>
                </div>
                <CardTitle className="text-base leading-6">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-6 text-muted-foreground">{shortSummary(item.summary)}</p>

                <div className="flex flex-wrap gap-1.5">
                  {evidence.slice(0, 6).map((ref, index) => (
                    <span key={`${evidenceLabel(ref)}-${index}`} className="rounded-full border px-2 py-1 text-[10px] text-muted-foreground">
                      {evidenceLabel(ref)}
                    </span>
                  ))}
                  {evidence.length > 6 ? <span className="rounded-full border px-2 py-1 text-[10px] text-muted-foreground">+{evidence.length - 6} fuentes</span> : null}
                </div>

                <div className="rounded-md border border-dashed px-3 py-2 text-[11px] leading-5 text-muted-foreground">
                  {revalidatedAt ? (
                    <>
                      <span className="font-medium text-foreground">Última revalidación registrada:</span> {revalidatedAt}.
                      {' '}{revalidationEvidence.length} referencia(s) de evidencia fueron usadas en esa revisión. El registro sigue siendo advisory y puede quedar desactualizado si cambian las fuentes.
                    </>
                  ) : (
                    <>
                      <span className="font-medium text-foreground">Pendiente de revalidación en destino.</span> Aún no existe una revisión fundamentada registrada por el especialista destino para este caso.
                    </>
                  )}
                </div>

                {uncertainty ? <p className="text-xs leading-5"><span className="font-medium">Incertidumbre:</span> {uncertainty}</p> : null}
                {contradictions.length ? <p className="text-xs leading-5"><span className="font-medium">Contradicciones:</span> {contradictions.slice(0, 3).join(' · ')}</p> : null}
                {missing.length ? <p className="text-xs leading-5"><span className="font-medium">Evidencia faltante:</span> {missing.slice(0, 3).join(' · ')}</p> : null}
                {nextHumanAction ? <p className="text-xs leading-5"><span className="font-medium">Siguiente validación humana:</span> {nextHumanAction}</p> : null}
                {item.recommended_workflow_key ? <p className="text-[11px] text-muted-foreground">Workflow disponible: {item.recommended_workflow_key}</p> : null}

                <div className="flex flex-wrap gap-2 border-t pt-3">
                  <Button asChild type="button" variant="default" size="sm">
                    <Link href={targetHref}>
                      Abrir {labels[item.target_domain] || 'especialista'}
                      <ArrowRight className="ml-2 size-4" />
                    </Link>
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => void updateCase(item.id, 'acknowledge')}>
                    <CheckCircle2 className="mr-2 size-4" />Reconocer
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => void updateCase(item.id, 'archive')}>
                    <Archive className="mr-2 size-4" />Archivar
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {Number(state.data?.hiddenByCurrentPermissions || 0) > 0 ? (
        <p className="text-xs text-muted-foreground">{state.data?.hiddenByCurrentPermissions} caso(s) ocultos porque tus permisos actuales ya no cubren el origen o destino.</p>
      ) : null}
    </section>
  );
}
