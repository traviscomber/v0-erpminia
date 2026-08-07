'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, Columns3, Lightbulb, RefreshCw, Route } from 'lucide-react';
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

type AlertItem = {
  id: string;
  title: string;
  severity: string;
  status: string;
  owner_name: string | null;
  opened_at: string;
  action_url: string | null;
};

type WorkResponse = {
  summary?: { total: number; active: number; blocked: number; overdue: number };
  counts?: Record<string, number>;
  warnings?: string[];
};

type ImprovementResponse = {
  summary?: { total: number; active: number; verifying: number; standardized: number; savings: number };
};

type CommitmentResponse = {
  summary?: { overdue: number; today: number; next_7_days: number; total: number };
};

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar la información');
  return payload as T;
};

function elapsed(value: string) {
  const hours = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 3_600_000));
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} d`;
}

export default function LeanControlCenterPage() {
  const alerts = useSWR<{ data?: AlertItem[] }>('/api/lean/andon', fetcher, { revalidateOnFocus: false });
  const work = useSWR<WorkResponse>('/api/lean/kanban', fetcher, { revalidateOnFocus: false });
  const improvements = useSWR<ImprovementResponse>('/api/lean/kaizen', fetcher, { revalidateOnFocus: false });
  const commitments = useSWR<CommitmentResponse>('/api/calendar/operational?days=90&scope=open', fetcher, { revalidateOnFocus: false });

  const sources = [alerts, work, improvements, commitments];
  const loading = sources.some((source) => source.isLoading);
  const partial = sources.some((source) => Boolean(source.error));
  const refresh = () => sources.forEach((source) => void source.mutate());

  const alertItems = alerts.data?.data || [];
  const activeAlerts = alertItems.filter((item) => !['resuelta', 'cerrada'].includes(item.status));
  const unassignedAlerts = activeAlerts.filter((item) => !item.owner_name).length;
  const workSummary = work.data?.summary || { total: 0, active: 0, blocked: 0, overdue: 0 };
  const improvementSummary = improvements.data?.summary || { total: 0, active: 0, verifying: 0, standardized: 0, savings: 0 };
  const commitmentSummary = commitments.data?.summary || { overdue: 0, today: 0, next_7_days: 0, total: 0 };

  const metrics = [
    { label: 'Alertas abiertas', value: activeAlerts.length, detail: `${unassignedAlerts} sin responsable`, href: '/dashboard/andon', icon: AlertTriangle },
    { label: 'Trabajo en curso', value: workSummary.active, detail: `${workSummary.blocked} bloqueados`, href: '/dashboard/kanban', icon: Columns3 },
    { label: 'Compromisos vencidos', value: commitmentSummary.overdue, detail: `${commitmentSummary.today} para hoy`, href: '/dashboard/tareas', icon: Clock3 },
    { label: 'Mejoras activas', value: improvementSummary.active, detail: `${improvementSummary.verifying} en comprobación`, href: '/dashboard/kaizen', icon: Lightbulb },
  ];

  const flow = [
    { step: '1', title: 'Detectar', description: 'Revisar problemas abiertos y tomar a cargo los más urgentes.', href: '/dashboard/andon', action: 'Abrir alertas' },
    { step: '2', title: 'Priorizar', description: 'Limitar el trabajo en curso y resolver los bloqueos.', href: '/dashboard/kanban', action: 'Abrir trabajo' },
    { step: '3', title: 'Cumplir', description: 'Resolver vencidos y compromisos programados para hoy.', href: '/dashboard/tareas', action: 'Ver pendientes' },
    { step: '4', title: 'Mejorar', description: 'Convertir problemas repetidos en acciones comprobadas.', href: '/dashboard/kaizen', action: 'Abrir mejoras' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Control y mejora</PageHeaderEyebrow>
          <PageHeaderTitle>Centro de gestión</PageHeaderTitle>
          <PageHeaderDescription>
            Un solo lugar para detectar problemas, ordenar el trabajo, cumplir compromisos y consolidar mejoras.
          </PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <Badge variant={partial ? 'destructive' : 'outline'}>
            {partial ? 'Información parcial' : loading ? 'Actualizando' : 'Información al día'}
          </Badge>
          <Button asChild variant="outline">
            <Link href="/dashboard/decisiones">Centro ejecutivo</Link>
          </Button>
          <Button variant="outline" onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </PageHeaderActions>
      </PageHeader>

      {partial ? (
        <StatePanel
          tone="warning"
          title="Parte de la información no está disponible"
          description="Se muestra únicamente la información validada que respondió correctamente."
          className="min-h-0 py-5"
        />
      ) : null}

      <section aria-label="Estado del trabajo" className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, detail, href, icon: Icon }) => (
          <Link key={label} href={href} className="group bg-card px-5 py-5 transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
                <p className="mt-4 text-3xl font-semibold tracking-[-0.04em]">{loading ? '—' : value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
              </div>
              <Icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
            </div>
          </Link>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,.85fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Secuencia de trabajo</CardTitle>
            <CardDescription>La revisión diaria debe terminar con responsables y acciones claras.</CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border/70">
            {flow.map((item) => (
              <div key={item.step} className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold">{item.step}</span>
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{item.description}</p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={item.href}>{item.action}<ArrowRight className="h-4 w-4" /></Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Problemas prioritarios</CardTitle>
              <CardDescription>Alertas abiertas ordenadas por antigüedad.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm"><Link href="/dashboard/andon">Ver todos</Link></Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <StatePanel tone="loading" title="Cargando alertas" className="min-h-52 border-0 bg-transparent" />
            ) : activeAlerts.length === 0 ? (
              <StatePanel
                tone="success"
                icon={CheckCircle2}
                title="Sin alertas abiertas"
                description="No hay problemas abiertos que requieran seguimiento."
                className="min-h-52 border-0 bg-transparent"
              />
            ) : (
              <div className="divide-y divide-border/70">
                {activeAlerts.slice(0, 6).map((item) => (
                  <article key={item.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={item.severity === 'critica' ? 'destructive' : 'outline'}>{item.severity}</Badge>
                          <span className="text-xs text-muted-foreground">{elapsed(item.opened_at)}</span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm font-medium">{item.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{item.owner_name || 'Sin responsable asignado'}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border bg-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Route className="mt-0.5 h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-medium">Comenzar la revisión diaria</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Revisa seguridad, producción, mantenimiento, abastecimiento y compromisos del día.</p>
          </div>
        </div>
        <Button asChild size="sm">
          <Link href="/dashboard/daily-management">Abrir revisión diaria<ArrowRight className="h-4 w-4" /></Link>
        </Button>
      </div>
    </div>
  );
}
