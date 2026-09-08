'use client';

import { usePathname } from 'next/navigation';
import useSWR from 'swr';
import { Archive, CheckCircle2, GitBranch, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type DecisionCase = {
  id: string;
  source_domain: string;
  target_domain: string;
  title: string;
  summary: string;
  evidence_refs: Array<{ source?: string; tool?: string; mode?: string }>;
  uncertainty: string | null;
  contradictions: string[];
  missing_evidence: string[];
  recommended_human_action: string | null;
  recommended_workflow_key: string | null;
  authority: 'advisory_only';
  status: 'open' | 'acknowledged' | 'archived';
  created_at: string;
};

type DecisionCasesResponse = {
  cases: DecisionCase[];
  hiddenByCurrentPermissions: number;
  authority: 'advisory_only';
  policy: string;
};

const DOMAIN_LABELS: Record<string, string> = {
  executive: 'Centro Ejecutivo',
  inventory: 'Inventario',
  procurement: 'Compras',
  production: 'Producción',
  finance: 'Finanzas',
  documents: 'Documentos',
  data_health: 'Data Health',
  maintenance: 'Mantención',
  geology: 'Geología',
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudieron cargar los Decision Cases');
  return payload;
};

export function DecisionCasesPanel() {
  const pathname = usePathname();
  const { data, error, isLoading, mutate } = useSWR<DecisionCasesResponse>(
    pathname === '/dashboard/decisiones' ? '/api/intelligence/decision-cases?status=open' : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  if (pathname !== '/dashboard/decisiones') return null;

  const cases = data?.cases || [];
  const updateCase = async (caseId: string, action: 'acknowledge' | 'archive') => {
    const response = await fetch('/api/intelligence/decision-cases', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, action }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || 'No se pudo actualizar el Decision Case');
    await mutate();
  };

  return (
    <Card className="shadow-none">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-lg">Casos advisory del Intelligence Core</CardTitle>
          </div>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Handoffs explicables construidos desde respuestas con evidencia persistida. No son aprobaciones, órdenes de trabajo ni decisiones operacionales.
          </p>
        </div>
        <Badge variant="outline">Sólo recomendación</Badge>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-2 border-t p-5">
            {Array.from({ length: 2 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-lg bg-muted" />)}
          </div>
        ) : error ? (
          <div className="border-t p-5 text-sm text-destructive">No se pudo cargar la capa advisory. Las decisiones operacionales del Centro Ejecutivo no se modifican.</div>
        ) : cases.length === 0 ? (
          <div className="border-t p-6 text-sm text-muted-foreground">
            No hay casos advisory abiertos. El Centro Ejecutivo continúa mostrando únicamente evidencia y decisiones operacionales canónicas.
          </div>
        ) : (
          <div className="divide-y border-t">
            {cases.map((item) => (
              <div key={item.id} className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{DOMAIN_LABELS[item.source_domain] || item.source_domain}</Badge>
                    <Badge variant="outline"><GitBranch className="mr-1 h-3 w-3" />{DOMAIN_LABELS[item.target_domain] || item.target_domain}</Badge>
                    <Badge variant="outline">{item.evidence_refs?.length || 0} fuente(s)</Badge>
                  </div>
                  <p className="mt-2 font-medium">{item.title}</p>
                  <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{item.summary}</p>
                  {item.uncertainty ? <p className="mt-2 text-xs text-muted-foreground"><span className="font-medium text-foreground">Incertidumbre:</span> {item.uncertainty}</p> : null}
                  {item.missing_evidence?.length ? <p className="mt-1 text-xs text-muted-foreground"><span className="font-medium text-foreground">Evidencia faltante:</span> {item.missing_evidence.slice(0, 3).join(' · ')}</p> : null}
                </div>
                <div className="text-sm">
                  <p className="text-xs text-muted-foreground">Siguiente validación humana</p>
                  <p className="mt-1 font-medium">{item.recommended_human_action || 'Revisar evidencia antes de decidir.'}</p>
                  {item.recommended_workflow_key ? <p className="mt-2 break-all text-xs text-muted-foreground">Workflow: {item.recommended_workflow_key}</p> : null}
                </div>
                <div className="flex gap-2 lg:justify-end">
                  <Button size="sm" variant="outline" onClick={() => void updateCase(item.id, 'acknowledge')}>
                    <CheckCircle2 className="mr-1 h-4 w-4" />Revisado
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void updateCase(item.id, 'archive')}>
                    <Archive className="mr-1 h-4 w-4" />Archivar
                  </Button>
                </div>
              </div>
            ))}
            {data?.hiddenByCurrentPermissions ? (
              <div className="bg-muted/20 px-5 py-3 text-xs text-muted-foreground">
                {data.hiddenByCurrentPermissions} caso(s) ocultos porque el usuario ya no tiene acceso al origen o destino.
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
