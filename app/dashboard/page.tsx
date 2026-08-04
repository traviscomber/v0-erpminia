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
      return 'border-destructive/30 bg-destructive/10 text-destructive';
    case 'alta':
      return 'border-orange-500/30 bg-orange-500/10 text-orange-600';
    case 'media':
      return 'border-primary/30 bg-primary/10 text-primary';
    case 'baja':
      return 'border-border bg-muted text-muted-foreground';
    default:
      return 'border-secondary/30 bg-secondary/10 text-secondary';
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
    { label: 'Alertas activas', value: alertStats.total, icon: AlertCircle, tone: 'text-destructive' },
    { label: 'Críticas', value: alertStats.critical, icon: AlertTriangle, tone: 'text-orange-600' },
    { label: 'Acción requerida', value: alertStats.actionRequired, icon: Clock, tone: 'text-primary' },
    { label: 'Cumplimiento', value: `${overview.compliance_score}%`, icon: CheckCircle2, tone: 'text-secondary' },
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
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b border-border/70 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Visión ejecutiva</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Centro de operaciones</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Prioridades reales de operación, cumplimiento y riesgo en una sola vista.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={hasError ? 'border-destructive/30 text-destructive' : ''}>
            {hasError ? 'Datos parciales' : loading ? 'Sincronizando' : 'Datos actualizados'}
          </Badge>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <RefreshCw className="h-3.5 w-3.5" />
            {lastUpdatedLabel}
          </span>
          <Button asChild>
            <Link href="/dashboard/alertas">Revisar alertas</Link>
          </Button>
        </div>
      </section>

      {hasError && (
        <Card className="border-destructive/30">
          <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 text-sm">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span>No fue posible cargar una parte del dashboard.</span>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                void mutateAlerts();
                void mutateOverview();
              }}
            >
              Reintentar
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} className="shadow-none">
            <CardContent className="flex items-start justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className={`mt-2 text-3xl font-semibold ${tone}`}>{loading ? '—' : value}</p>
              </div>
              <Icon className={`h-5 w-5 ${tone}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <Card className="shadow-none">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Prioridades recientes</CardTitle>
              <CardDescription>Alertas que requieren revisión operativa.</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/alertas">Ver todas</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Cargando alertas...</div>
            ) : topAlerts.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No hay alertas activas.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {topAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={severityClass(alert.severity)}>
                          {formatAlertType(alert.type)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(alert.timestamp).toLocaleString('es-CL')}
                        </span>
                      </div>
                      <p className="mt-2 font-medium">{alert.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{alert.description}</p>
                    </div>
                    <Button asChild variant="ghost" size="icon" aria-label={`Ver alerta ${alert.title}`}>
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

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Salud operativa</CardTitle>
            <CardDescription>Cumplimiento y riesgos abiertos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Cumplimiento</span>
                <span className="font-semibold">{overview.compliance_score}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-primary" style={{ width: `${complianceScore}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">NC abiertas</p>
                <p className="mt-1 text-2xl font-semibold">{overview.open_ncs}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Acciones vencidas</p>
                <p className="mt-1 text-2xl font-semibold text-destructive">{overview.overdue_cas}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">Riesgos destacados</p>
              <div className="mt-3 space-y-2">
                {topRisks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay riesgos abiertos.</p>
                ) : (
                  topRisks.slice(0, 4).map((risk) => (
                    <div key={risk.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
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

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Áreas de trabajo</h2>
            <p className="text-sm text-muted-foreground">Acceso directo a los módulos principales.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {workspaces.map(({ title, description, href, icon: Icon }) => (
            <Link key={title} href={href} className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Card className="h-full shadow-none transition-colors group-hover:bg-muted/30">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <Icon className="h-5 w-5 text-primary" />
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </div>
                  <h3 className="mt-5 font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <Card className="shadow-none">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <FolderOpen className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Documentación y ayuda</p>
              <p className="text-sm text-muted-foreground">Consulta guías operativas y respaldos del sistema.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard/guias">Abrir guías</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/documentos-gestion">Gestión documental</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
