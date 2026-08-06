'use client';

import Link from 'next/link';
import useSWR from 'swr';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  FolderOpen,
  RefreshCw,
  Shield,
  ShoppingCart,
  Wrench,
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

type AlertItem = {
  id: string;
  title: string;
  description: string;
  severity: 'critica' | 'alta' | 'media' | 'baja' | 'info';
  type: string;
  timestamp: string;
  actionRequired: boolean;
  actionUrl: string;
};

type AlertStats = {
  total: number;
  unread: number;
  critical: number;
  actionRequired: number;
};

type Overview = {
  compliance_score: number;
  total_ncs: number;
  open_ncs: number;
  closed_ncs: number;
  overdue_cas: number;
  trend: string;
};

type DashboardResponse = {
  alerts?: AlertItem[];
  stats?: AlertStats;
  generatedAt?: string;
};

type OverviewResponse = {
  overview?: Overview;
  top_risks?: Array<{ id: string; nc_number?: string; title: string; severity?: string }>;
  generated_at?: string;
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar los datos');
  return payload;
};

function severityClass(severity: AlertItem['severity']) {
  switch (severity) {
    case 'critica':
      return 'border-destructive/25 bg-destructive/8 text-destructive';
    case 'alta':
      return 'border-primary/25 bg-primary/8 text-primary';
    case 'media':
      return 'border-primary/20 bg-primary/5 text-primary';
    case 'baja':
      return 'border-border bg-muted/60 text-muted-foreground';
    default:
      return 'border-secondary/25 bg-secondary/8 text-secondary';
  }
}

function formatAlertType(type: string) {
  const labels: Record<string, string> = {
    documento: 'Documento',
    mantenimiento: 'Mantenimiento',
    inventario: 'Inventario',
    sostenibilidad: 'Sostenibilidad',
    contrato: 'Contrato',
  };
  return labels[type] || 'Alerta';
}

export default function DashboardPage() {
  const {
    data: alertsData,
    error: alertsError,
    isLoading: alertsLoading,
    mutate: mutateAlerts,
  } = useSWR<DashboardResponse>('/api/alertas', fetcher, { revalidateOnFocus: false });

  const {
    data: overviewData,
    error: overviewError,
    isLoading: overviewLoading,
    mutate: mutateOverview,
  } = useSWR<OverviewResponse>('/api/sostenibilidad/dashboard/overview', fetcher, {
    revalidateOnFocus: false,
  });

  const alerts = alertsData?.alerts ?? [];
  const alertStats = alertsData?.stats ?? { total: 0, unread: 0, critical: 0, actionRequired: 0 };
  const overview = overviewData?.overview ?? {
    compliance_score: 0,
    total_ncs: 0,
    open_ncs: 0,
    closed_ncs: 0,
    overdue_cas: 0,
    trend: 'sin datos',
  };
  const topRisks = overviewData?.top_risks ?? [];
  const loading = alertsLoading || overviewLoading;
  const hasError = Boolean(alertsError || overviewError);
  const latestTimestamp = overviewData?.generated_at ?? alertsData?.generatedAt;
  const lastUpdatedLabel = latestTimestamp
    ? new Date(latestTimestamp).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Sin sincronizar';
  const complianceScore = Math.max(0, Math.min(overview.compliance_score, 100));
  const topAlerts = alerts.slice(0, 5);

  const kpis = [
    { label: 'Alertas activas', value: alertStats.total, detail: `${alertStats.unread} sin revisar`, icon: AlertCircle, tone: 'text-destructive' },
    { label: 'Críticas', value: alertStats.critical, detail: 'Prioridad inmediata', icon: AlertTriangle, tone: 'text-primary' },
    { label: 'Acción requerida', value: alertStats.actionRequired, detail: 'Pendientes de gestión', icon: Clock, tone: 'text-foreground' },
    { label: 'Cumplimiento', value: `${overview.compliance_score}%`, detail: overview.trend || 'Sin tendencia', icon: CheckCircle2, tone: 'text-secondary' },
  ];

  const workspaces = [
    {
      title: 'Mantenimiento',
      description: 'Órdenes, planificación, activos y costos.',
      href: '/dashboard/mantenimiento',
      icon: Wrench,
    },
    {
      title: 'Abastecimiento',
      description: 'Inventario, compras, proveedores y finanzas.',
      href: '/dashboard/bodega',
      icon: ShoppingCart,
    },
    {
      title: 'Sostenibilidad y HSE',
      description: 'Riesgos, ambiente, comunidades y cumplimiento.',
      href: '/dashboard/sostenibilidad',
      icon: Shield,
    },
    {
      title: 'Legal y contratos',
      description: 'Contratos, documentos, vigencias y revisión.',
      href: '/dashboard/legal',
      icon: FileText,
    },
  ];

  return (
    <div className="space-y-7">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Visión ejecutiva</PageHeaderEyebrow>
          <PageHeaderTitle>Centro de operaciones</PageHeaderTitle>
          <PageHeaderDescription>
            Prioridades reales de operación, cumplimiento y riesgo en una sola vista.
          </PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <div className="mr-1 hidden text-right lg:block">
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Última actualización</p>
            <p className="mt-1 text-xs font-medium text-foreground">{lastUpdatedLabel}</p>
          </div>
          <Badge variant={hasError ? 'destructive' : 'outline'}>
            {hasError ? 'Datos parciales' : loading ? 'Sincronizando' : 'Actualizado'}
          </Badge>
          <Button asChild size="sm">
            <Link href="/dashboard/alertas">Revisar alertas</Link>
          </Button>
        </PageHeaderActions>
      </PageHeader>

      {hasError ? (
        <StatePanel
          tone="error"
          title="Parte del dashboard no pudo actualizarse"
          description="La información disponible sigue visible. Reintenta para recuperar las fuentes pendientes."
          className="min-h-0 py-6"
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void mutateAlerts();
                void mutateOverview();
              }}
            >
              <RefreshCw className="h-4 w-4" />
              Reintentar
            </Button>
          }
        />
      ) : null}

      <section aria-label="Indicadores principales" className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ label, value, detail, icon: Icon, tone }) => (
          <div key={label} className="bg-card px-5 py-5 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
              <Icon className={`h-4 w-4 ${tone}`} aria-hidden="true" />
            </div>
            <p className={`mt-5 text-3xl font-semibold tracking-[-0.04em] ${tone}`}>{loading ? '—' : value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,.55fr)]">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Prioridades recientes</CardTitle>
              <CardDescription>Alertas que requieren revisión operativa.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/alertas">Ver todas</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <StatePanel tone="loading" title="Cargando prioridades" className="min-h-52 border-0 bg-transparent" />
            ) : topAlerts.length === 0 ? (
              <StatePanel
                tone="success"
                title="Sin alertas activas"
                description="No existen prioridades operativas pendientes en este momento."
                className="min-h-52 border-0 bg-transparent"
              />
            ) : (
              <div className="divide-y divide-border/70">
                {topAlerts.map((alert) => (
                  <div key={alert.id} className="group flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={severityClass(alert.severity)}>
                          {formatAlertType(alert.type)}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(alert.timestamp).toLocaleString('es-CL')}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-medium leading-5">{alert.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">{alert.description}</p>
                    </div>
                    <Button asChild variant="ghost" size="icon-sm" aria-label={`Ver alerta ${alert.title}`}>
                      <Link href={alert.actionUrl}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Salud operativa</CardTitle>
            <CardDescription>Cumplimiento y riesgos abiertos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="mb-2 flex items-end justify-between gap-4">
                <span className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Cumplimiento</span>
                <span className="text-2xl font-semibold tracking-[-0.03em]">{overview.compliance_score}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${complianceScore}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-border rounded-lg border">
              <div className="px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">NC abiertas</p>
                <p className="mt-2 text-2xl font-semibold">{overview.open_ncs}</p>
              </div>
              <div className="px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Acciones vencidas</p>
                <p className="mt-2 text-2xl font-semibold text-destructive">{overview.overdue_cas}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Riesgos destacados</p>
              <div className="mt-3 divide-y divide-border/70">
                {topRisks.length === 0 ? (
                  <p className="py-4 text-sm text-muted-foreground">No hay riesgos abiertos.</p>
                ) : (
                  topRisks.slice(0, 4).map((risk) => (
                    <div key={risk.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{risk.nc_number || 'NC sin número'}</p>
                        <p className="truncate text-xs text-muted-foreground">{risk.title}</p>
                      </div>
                      <Badge variant="outline">{risk.severity || 'Sin estado'}</Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Accesos directos</p>
          <h2 className="mt-1 text-lg font-semibold">Áreas de trabajo</h2>
        </div>
        <div className="overflow-hidden rounded-lg border">
          <div className="grid divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-4">
            {workspaces.map(({ title, description, href, icon: Icon }) => (
              <Link
                key={title}
                href={href}
                className="group flex min-h-36 flex-col justify-between bg-card p-5 transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <div className="flex items-start justify-between gap-4">
                  <Icon className="h-5 w-5 text-primary" />
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </div>
                <div className="mt-8">
                  <h3 className="text-sm font-semibold">{title}</h3>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-4 rounded-lg border bg-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <FolderOpen className="mt-0.5 h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-medium">Documentación y ayuda</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Guías operativas y respaldos del sistema.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/guias">Abrir guías</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/documentos-gestion">Gestión documental</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
