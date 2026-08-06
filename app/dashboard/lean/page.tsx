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

type AndonItem = {
  id: string;
  title: string;
  severity: string;
  status: string;
  owner_name: string | null;
  opened_at: string;
  action_url: string | null;
};

type KanbanResponse = {
  summary?: { total: number; active: number; blocked: number; overdue: number };
  counts?: Record<string, number>;
  warnings?: string[];
};

type KaizenResponse = {
  summary?: { total: number; active: number; verifying: number; standardized: number; savings: number };
};

type OperationalResponse = {
  summary?: { overdue: number; today: number; next_7_days: number; total: number };
};

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar la fuente');
  return payload as T;
};

function elapsed(value: string) {
  const hours = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 3_600_000));
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} d`;
}

export default function LeanControlCenterPage() {
  const andon = useSWR<{ data?: AndonItem[] }>('/api/lean/andon', fetcher, { revalidateOnFocus: false });
  const kanban = useSWR<KanbanResponse>('/api/lean/kanban', fetcher, { revalidateOnFocus: false });
  const kaizen = useSWR<KaizenResponse>('/api/lean/kaizen', fetcher, { revalidateOnFocus: false });
  const commitments = useSWR<OperationalResponse>('/api/calendar/operational?days=90&scope=open', fetcher, { revalidateOnFocus: false });

  const sources = [andon, kanban, kaizen, commitments];
  const loading = sources.some((source) => source.isLoading);
  const partial = sources.some((source) => Boolean(source.error));
  const refresh = () => sources.forEach((source) => void source.mutate());

  const andonItems = andon.data?.data || [];
  const activeAndon = andonItems.filter((item) => !['resuelta', 'cerrada'].includes(item.status));
  const unassignedAndon = activeAndon.filter((item) => !item.owner_name).length;
  const kanbanSummary = kanban.data?.summary || { total: 0, active: 0, blocked: 0, overdue: 0 };
  const kaizenSummary = kaizen.data?.summary || { total: 0, active: 0, verifying: 0, standardized: 0, savings: 0 };
  const commitmentSummary = commitments.data?.summary || { overdue: 0, today: 0, next_7_days: 0, total: 0 };

  const metrics = [
    { label: 'Andon activos', value: activeAndon.length, detail: `${unassignedAndon} sin responsable`, href: '/dashboard/andon', icon: AlertTriangle },
    { label: 'Trabajo activo', value: kanbanSummary.active, detail: `${kanbanSummary.blocked} bloqueados`, href: '/dashboard/kanban', icon: Columns3 },
    { label: 'Compromisos vencidos', value: commitmentSummary.overdue, detail: `${commitmentSummary.today} para hoy`, href: '/dashboard/tareas', icon: Clock3 },
    { label: 'Kaizen activos', value: kaizenSummary.active, detail: `${kaizenSummary.verifying} en verificación`, href: '/dashboard/kaizen', icon: Lightbulb },
  ];

  const flow = [
    { step: '1', title: 'Detectar', description: 'Revisar desviaciones abiertas y reconocer las críticas.', href: '/dashboard/andon', action: 'Abrir Andon' },
    { step: '2', title: 'Priorizar', description: 'Limitar el trabajo en curso y resolver bloqueos del flujo.', href: '/dashboard/kanban', action: 'Abrir Kanban' },
    { step: '3', title: 'Cumplir', description: 'Resolver vencidos y compromisos programados para hoy.', href: '/dashboard/tareas', action: 'Ver pendientes' },
    { step: '4', title: 'Mejorar', description: 'Convertir problemas repetitivos en contramedidas verificables.', href: '/dashboard/kaizen', action: 'Abrir Kaizen' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Lean · Control operacional</PageHeaderEyebrow>
          <PageHeaderTitle>Centro Lean</PageHeaderTitle>
          <PageHeaderDescription>
            Un circuito de trabajo real para detectar desviaciones, controlar el flujo, cumplir compromisos y estandarizar mejoras.
          </PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <Badge variant={partial ? 'destructive' : 'outline'}>{partial ? 'Datos parciales' : loading ? 'Sincronizando' : 'Fuentes conectadas'}</Badge>
          <Button variant="outline" onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </PageHeaderActions>
      </PageHeader>

      {partial ? (
        <StatePanel
          tone="warning"
          title="Una o más fuentes no respondieron"
          description="Solo se muestra información canónica disponible. No se completaron valores mediante estimaciones."
          className="min-h-0 py-5"
        />
      ) : null}

      <section aria-label="Estado del circuito Lean" className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-4">
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
            <CardTitle>Circuito operativo</CardTitle>
            <CardDescription>La reunión diaria debe terminar con responsables y acciones en estas cuatro superficies.</CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border/70">
            {flow.map((item) => (
              <div key={item.step} className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold">{item.step}</span>
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{item.description}</p>
                </div>
                <Button asChild variant="outline" size="sm"><Link href={item.href}>{item.action}<ArrowRight className="h-4 w-4" /></Link></Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Desviaciones prioritarias</CardTitle>
              <CardDescription>Andon activos ordenados por apertura.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm"><Link href="/dashboard/andon">Ver todos</Link></Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <StatePanel tone="loading" title="Cargando desviaciones" className="min-h-52 border-0 bg-transparent" />
            ) : activeAndon.length === 0 ? (
              <StatePanel tone="success" icon={CheckCircle2} title="Sin Andon activos" description="No existen desviaciones abiertas en la fuente Lean." className="min-h-52 border-0 bg-transparent" />
            ) : (
              <div className="divide-y divide-border/70">
                {activeAndon.slice(0, 6).map((item) => (
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
            <p className="text-sm font-medium">Comenzar la reunión diaria</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Revisa seguridad, producción, mantenimiento, abastecimiento y compromisos usando datos del día.</p>
          </div>
        </div>
        <Button asChild size="sm"><Link href="/dashboard/daily-management">Abrir Daily Management<ArrowRight className="h-4 w-4" /></Link></Button>
      </div>
    </div>
  );
}
