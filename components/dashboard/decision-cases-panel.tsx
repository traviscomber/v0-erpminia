'use client';

import useSWR from 'swr';
import { Archive, CheckCircle2, RefreshCw, Route, ShieldCheck } from 'lucide-react';
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
  created_at: string;
};

type Response = {
  cases?: DecisionCase[];
  hiddenByCurrentPermissions?: number;
  authority?: string;
  policy?: string;
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

export function DecisionCasesPanel() {
  const state = useSWR<Response>('/api/intelligence/decision-cases?status=open', fetcher, { revalidateOnFocus: false });
  const cases = state.data?.cases || [];

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
          const missing = Array.isArray(item.missing_evidence) ? item.missing_evidence : [];
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

                {item.uncertainty ? <p className="text-xs leading-5"><span className="font-medium">Incertidumbre:</span> {item.uncertainty}</p> : null}
                {missing.length ? <p className="text-xs leading-5"><span className="font-medium">Evidencia faltante:</span> {missing.slice(0, 3).join(' · ')}</p> : null}
                {item.recommended_human_action ? <p className="text-xs leading-5"><span className="font-medium">Siguiente validación humana:</span> {item.recommended_human_action}</p> : null}
                {item.recommended_workflow_key ? <p className="text-[11px] text-muted-foreground">Workflow disponible: {item.recommended_workflow_key}</p> : null}

                <div className="flex flex-wrap gap-2 border-t pt-3">
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
