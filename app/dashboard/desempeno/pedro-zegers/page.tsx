'use client';

import Link from 'next/link';
import useSWR from 'swr';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  FolderKanban,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderTitle,
} from '@/components/ui/page-header';
import { StatePanel } from '@/components/ui/state-panel';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Improvement = {
  id: string;
  kaizen_number: string | null;
  title: string;
  priority: string | null;
  pdca_stage: string;
  target_date: string | null;
  actual_result: string | null;
  verification_method: string | null;
};

type Project = {
  name: string;
  contracts: number;
  currencies: string[];
  contractualAmountByCurrency: Record<string, number>;
  nearestEndDate: string | null;
  expiringContracts: number;
  evidenceState: 'contractual_only';
};

type Scorecard = {
  subject: {
    requestedName: string;
    person: null | { full_name: string; role_title: string | null; employment_status: string | null; updated_at: string };
    mode: string;
    personalEvaluation: false;
  };
  summary: {
    improvements: number;
    activeImprovements: number;
    verifiedImprovements: number;
    overdueImprovements: number;
    onTimeClosurePct: number | null;
    comparableClosures: number;
    linkedProjects: number;
    assignedContracts: number;
  };
  decisions: Array<{ tone: 'critical' | 'warning'; label: string; value: number | null; detail: string }>;
  projects: Project[];
  improvements: Improvement[];
  evidenceGaps: Array<{ key: string; label: string; detail: string }>;
  provenance: { sources: string[]; generatedAt: string; rule: string };
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar el scorecard.');
  return payload;
};

const stageLabels: Record<string, string> = {
  plan: 'Definición',
  do: 'En ejecución',
  check: 'Comprobación',
  act: 'Estandarización',
  closed: 'Cerrada',
};

function formatDate(value: string | null) {
  if (!value) return 'Sin fecha';
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatContractualAmounts(project: Project) {
  const entries = Object.entries(project.contractualAmountByCurrency);
  if (!entries.length) return 'Sin monto';
  return entries
    .map(([currency, amount]) => {
      try {
        return new Intl.NumberFormat('es-CL', {
          style: 'currency',
          currency,
          maximumFractionDigits: 0,
        }).format(amount);
      } catch {
        return `${currency} ${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(amount)}`;
      }
    })
    .join(' · ');
}

function Metric({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof Clock3 }) {
  return (
    <Card className="min-h-36">
      <CardHeader className="pb-0">
        <div className="flex items-start justify-between gap-4">
          <CardDescription className="leading-5">{label}</CardDescription>
          <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </div>
        <CardTitle className="mt-2 text-3xl font-semibold tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent className="mt-auto pt-0 text-xs leading-5 text-muted-foreground">{detail}</CardContent>
    </Card>
  );
}

export default function PedroZegersScorecardPage() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<Scorecard>('/api/desempeno/pedro-zegers', fetcher, {
    revalidateOnFocus: false,
  });

  if (isLoading) {
    return <StatePanel tone="loading" title="Preparando scorecard" description="Reuniendo evidencia de RRHH, mejoras y contratos." />;
  }

  if (error || !data) {
    return (
      <StatePanel
        tone="error"
        title="No fue posible cargar el scorecard"
        description={error instanceof Error ? error.message : 'Reintenta la consulta.'}
        actions={<Button variant="outline" onClick={() => void mutate()}>Reintentar</Button>}
      />
    );
  }

  const { summary } = data;
  const onTimeValue = summary.onTimeClosurePct === null ? 'Sin base' : `${summary.onTimeClosurePct.toFixed(0)}%`;
  const displayName = data.subject.person?.full_name || data.subject.requestedName;
  const roleTitle = data.subject.person?.role_title || 'Proyectos y mejora continua';

  return <div className="space-y-6">
    <PageHeader className="pb-6">
      <PageHeaderContent>
        <PageHeaderEyebrow>Desempeño · vista dedicada</PageHeaderEyebrow>
        <PageHeaderTitle>{displayName}</PageHeaderTitle>
        <PageHeaderDescription>
          {roleTitle}. Control ejecutivo construido únicamente desde registros operacionales atribuibles y trazables.
        </PageHeaderDescription>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="outline">Baseline operacional</Badge>
          <Badge variant="neutral">No evaluación personal</Badge>
          <Badge variant={data.subject.person ? 'secondary' : 'outline'}>
            {data.subject.person ? 'Identidad canónica vinculada' : 'Identidad pendiente'}
          </Badge>
        </div>
      </PageHeaderContent>
      <PageHeaderActions>
        <Button variant="outline" asChild><Link href="/dashboard/desempeno"><ArrowLeft />Desempeño</Link></Button>
        <Button variant="outline" onClick={() => void mutate()} disabled={isValidating}>
          <RefreshCw className={isValidating ? 'animate-spin' : ''} />Actualizar
        </Button>
      </PageHeaderActions>
    </PageHeader>

    <section aria-labelledby="decisiones-pedro" className="border-y border-border/70 bg-muted/15 px-4 py-5 sm:px-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">01 — Decisión</p>
          <h2 id="decisiones-pedro" className="mt-1 text-lg font-semibold tracking-tight">Atención de gestión</h2>
        </div>
        <Badge variant="outline">Máximo 3 señales</Badge>
      </div>
      {data.decisions.length ? (
        <div className="grid gap-px overflow-hidden rounded-md border bg-border md:grid-cols-3">
          {data.decisions.map((decision) => (
            <div key={decision.label} className="bg-background p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className={decision.tone === 'critical' ? 'size-4 text-destructive' : 'size-4 text-primary'} />
                <span className="text-sm font-medium">{decision.label}</span>
                {decision.value !== null ? <span className="ml-auto text-xl font-semibold tabular-nums">{decision.value}</span> : null}
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{decision.detail}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No aparecen excepciones en las fuentes conectadas. Esto no reemplaza las brechas de evidencia indicadas más abajo.</p>
      )}
    </section>

    <section aria-labelledby="metricas-pedro">
      <div className="mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">02 — Evidencia</p>
        <h2 id="metricas-pedro" className="mt-1 text-lg font-semibold tracking-tight">Métricas ejecutivas</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Metric label="Mejoras activas" value={String(summary.activeImprovements)} detail={`${summary.improvements} iniciativas atribuibles en total`} icon={FolderKanban} />
        <Metric label="Resultados comprobados" value={String(summary.verifiedImprovements)} detail="Resultado y método de verificación registrados" icon={CheckCircle2} />
        <Metric label="Cierres dentro de fecha" value={onTimeValue} detail={summary.comparableClosures ? `${summary.comparableClosures} cierres comparables` : 'Sin cierres con fecha objetivo y cierre trazable'} icon={Clock3} />
        <Metric label="Mejoras vencidas" value={String(summary.overdueImprovements)} detail="Abiertas después de su fecha objetivo" icon={AlertTriangle} />
        <Metric label="Proyectos vinculados" value={String(summary.linkedProjects)} detail="Identificados por contrato asignado" icon={FileCheck2} />
        <Metric label="Contratos en alcance" value={String(summary.assignedContracts)} detail="Responsable registrado como Pedro Zegers" icon={ShieldCheck} />
      </div>
    </section>

    <section aria-labelledby="portafolio-pedro" className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.8fr)]">
      <Card>
        <CardHeader>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">03 — Portafolio</p>
          <CardTitle id="portafolio-pedro">Proyectos con evidencia contractual</CardTitle>
          <CardDescription>Esta vista acredita contratos asociados; todavía no interpreta avance físico ni presupuesto integral.</CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {data.projects.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Proyecto</TableHead><TableHead>Alcance</TableHead><TableHead>Monto contractual</TableHead><TableHead>Próximo vencimiento</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data.projects.map((project) => (
                    <TableRow key={project.name}>
                      <TableCell className="font-medium">{project.name}</TableCell>
                      <TableCell>{project.contracts} contrato{project.contracts === 1 ? '' : 's'}</TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">{formatContractualAmounts(project)}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(project.nearestEndDate)}</TableCell>
                      <TableCell><Badge variant={project.expiringContracts ? 'destructive' : 'outline'}>{project.expiringContracts ? `${project.expiringContracts} por vencer` : 'Evidencia contractual'}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="px-5 pb-5"><StatePanel title="Sin proyectos vinculados" description="No existen contratos cuyo responsable sea Pedro Zegers y que además tengan un proyecto identificado." /></div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">04 — Confianza</p>
          <CardTitle>Brechas de evidencia</CardTitle>
          <CardDescription>Condiciones pendientes antes de activar metas o evaluación.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.evidenceGaps.map((gap, index) => (
            <div key={gap.key} className="border-t border-border/70 pt-4 first:border-0 first:pt-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
                <p className="text-sm font-medium">{gap.label}</p>
              </div>
              <p className="mt-1 pl-7 text-xs leading-5 text-muted-foreground">{gap.detail}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>

    <Card>
      <CardHeader>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">05 — Acción y resultado</p>
        <CardTitle>Mejoras bajo responsabilidad</CardTitle>
        <CardDescription>Flujo PDCA real, con comprobación visible antes de considerar una mejora consolidada.</CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {data.improvements.length ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Mejora</TableHead><TableHead>Etapa</TableHead><TableHead>Fecha objetivo</TableHead><TableHead>Evidencia</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.improvements.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell><p className="font-medium">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.kaizen_number || 'Sin folio'} · {item.priority || 'Sin prioridad'}</p></TableCell>
                    <TableCell><Badge variant={['act', 'closed'].includes(item.pdca_stage) ? 'secondary' : 'outline'}>{stageLabels[item.pdca_stage] || item.pdca_stage}</Badge></TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(item.target_date)}</TableCell>
                    <TableCell className="max-w-sm text-xs leading-5 text-muted-foreground">{item.actual_result && item.verification_method ? 'Resultado y método registrados' : 'Pendiente de comprobación'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="px-5 pb-5"><StatePanel title="Sin mejoras atribuibles" description="No hay iniciativas cuyo owner registrado contenga Pedro Zegers. No se asignan mejoras por inferencia." /></div>
        )}
      </CardContent>
    </Card>

    <footer className="flex flex-col gap-3 border-t border-border/70 pt-4 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
      <p className="flex items-center gap-2"><CircleDollarSign className="size-4" />Los ahorros no se agregan hasta normalizar moneda y baseline.</p>
      <p>Fuentes: {data.provenance.sources.join(' · ')} · Corte {new Date(data.provenance.generatedAt).toLocaleString('es-CL')}</p>
    </footer>
  </div>;
}
