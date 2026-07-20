'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { AlertCircle, AlertTriangle, ArrowRight, BookOpen, CheckCircle2, Clock, Eye, FolderOpen, HelpCircle, Plus, RefreshCw, Shield, Zap, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { BrandCard } from '@/components/ui/brand-card';
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
  inspections_completed?: number;
  generated_at?: string;
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) return null;
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
      return 'border-muted/30 bg-muted text-muted-foreground';
    default:
      return 'border-secondary/30 bg-secondary/10 text-secondary';
  }
}

function formatAlertType(type: string) {
  switch (type) {
    case 'documento':
      return 'Documento';
    case 'mantenimiento':
      return 'Mantenimiento';
    case 'inventario':
      return 'Inventario';
    case 'sostenibilidad':
      return 'Sostenibilidad';
    case 'contrato':
      return 'Contrato';
    default:
      return 'Alerta';
  }
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
  const hasError = alertsError || overviewError;

  const topAlerts = alerts.slice(0, 3);
  const topRisksPreview = topRisks.slice(0, 3);
  const latestTimestamp = overviewData?.generated_at ?? alertsData?.generatedAt;
  const lastUpdatedLabel = latestTimestamp
    ? new Date(latestTimestamp).toLocaleString('es-CL', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Sin sincronizar';
  const complianceScore = Math.max(0, Math.min(overview.compliance_score, 100));
  const statusLabel = hasError ? 'Con datos parciales' : loading ? 'Sincronizando' : 'En linea';

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-gradient-to-br from-card via-card to-muted/30 p-6 shadow-2xl shadow-black/10 md:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle at top right, rgba(85,180,115,0.12), transparent 32%), radial-gradient(circle at bottom left, rgba(186,117,62,0.12), transparent 36%)',
          }}
        />

        <div className="relative grid gap-8 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 tracking-[0.24em] ${
                  hasError
                    ? 'border-destructive/30 bg-destructive/10 text-destructive'
                    : loading
                      ? 'border-[var(--brand-cobre)]/30 bg-[var(--brand-cobre)]/10 text-[var(--brand-cobre)]'
                      : 'border-[var(--brand-verde)]/30 bg-[var(--brand-verde)]/10 text-[var(--brand-verde)]'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-current" />
                {statusLabel}
              </span>
              <span className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" />
                Faena Central
              </span>
              <span className="flex items-center gap-2">
                <RefreshCw className="h-3.5 w-3.5" />
                Actualizado {lastUpdatedLabel}
              </span>
            </div>

            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">Centro de Operaciones</h1>
              <p className="max-w-2xl text-lg text-muted-foreground">
                Resumen operativo real conectado a alertas, sostenibilidad y cumplimiento.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="bg-[var(--brand-cobre)] hover:bg-[var(--brand-cobre)]/90">
                <Link href="/dashboard/alertas">Revisar alertas</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard/guias">Abrir guias</Link>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Alertas totales</p>
                <p className="mt-2 text-3xl font-bold text-destructive">{alertStats.total}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Criticas</p>
                <p className="mt-2 text-3xl font-bold text-primary">{alertStats.critical}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Cumplimiento</p>
                <p className="mt-2 text-3xl font-bold text-secondary">{overview.compliance_score}%</p>
              </div>
            </div>
          </div>

          <Card className="relative overflow-hidden border-border/70 bg-background/75 backdrop-blur">
            <CardHeader className="space-y-3 border-b border-border/60 pb-5">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-5 w-5 text-[var(--brand-naranja)]" />
                  Salud operativa
                </CardTitle>
                <span className="rounded-full border border-[var(--brand-verde)]/30 bg-[var(--brand-verde)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--brand-verde)]">
                  {statusLabel}
                </span>
              </div>
              <CardDescription>Lectura consolidada de riesgos, alertas y cumplimiento.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Cumplimiento</span>
                  <span className="font-semibold">{overview.compliance_score}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-[var(--brand-cobre)]"
                    style={{ width: `${complianceScore}%` }}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">NC abiertas</p>
                  <p className="mt-2 text-2xl font-bold">{overview.open_ncs}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Acciones vencidas</p>
                  <p className="mt-2 text-2xl font-bold text-destructive">{overview.overdue_cas}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Riesgos destacados</p>
                <div className="mt-3 space-y-2">
                  {topRisksPreview.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hay riesgos abiertos en la fuente de datos real.</p>
                  ) : (
                    topRisksPreview.map((risk) => (
                      <div key={risk.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium">{risk.nc_number || 'NC sin número'}</p>
                          <p className="truncate text-xs text-muted-foreground">{risk.title}</p>
                        </div>
                        <Badge variant="outline">{risk.severity || 'sin estado'}</Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <BrandCard>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="h-5 w-5 text-[var(--brand-naranja)]" />
            ¿Necesitas ayuda?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            ERP SegurIA incluye guías paso a paso para operar con datos reales en órdenes de trabajo, inventario y módulos de sostenibilidad.
          </p>
          <Button asChild variant="outline" size="sm" className="gap-2 border-[var(--brand-naranja)] text-[var(--brand-naranja)] hover:bg-[var(--brand-naranja)]/10">
            <Link href="/dashboard/guias">
              <HelpCircle className="h-4 w-4" />
              Ver guias educativas
            </Link>
          </Button>
        </CardContent>
      </BrandCard>

      {hasError && (
        <Card className="border-destructive/30">
          <CardContent className="flex items-center justify-between gap-4 pt-6">
            <div className="flex items-center gap-3 text-sm">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span>No fue posible cargar algunos datos reales del dashboard.</span>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                mutateAlerts();
                mutateOverview();
              }}
            >
              Reintentar
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Alertas totales</p>
                <p className="mt-2 text-3xl font-bold text-destructive">{alertStats.total}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-destructive opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Críticas</p>
                <p className="mt-2 text-3xl font-bold text-primary">{alertStats.critical}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-primary opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Acción requerida</p>
                <p className="mt-2 text-3xl font-bold text-secondary">{alertStats.actionRequired}</p>
              </div>
              <Clock className="h-8 w-8 text-secondary opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cumplimiento</p>
                <p className="mt-2 text-3xl font-bold text-secondary">{overview.compliance_score}%</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-secondary opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Alertas reales recientes
              </CardTitle>
              <CardDescription>Prioridades detectadas por las APIs del sistema</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm" className="gap-2 bg-[var(--brand-verde)] text-white border-0 hover:bg-[var(--brand-verde)]/90">
              <Link href="/dashboard/alertas">Ver todas</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {topAlerts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
              {loading ? 'Cargando alertas reales...' : 'No hay alertas activas en este momento.'}
            </div>
          ) : (
            <div className="space-y-3">
              {topAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start justify-between gap-4 rounded-lg border border-border/50 p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={severityClass(alert.severity)}>
                        {formatAlertType(alert.type)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(alert.timestamp).toLocaleString('es-CL')}
                      </span>
                    </div>
                    <p className="mt-2 font-medium leading-tight">{alert.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{alert.description}</p>
                  </div>
                  <Button asChild variant="ghost" size="sm" className="opacity-80 hover:opacity-100">
                    <Link href={alert.actionUrl} aria-label={`Ver alerta ${alert.title}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Cumplimiento y riesgos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">No conformidades abiertas</span>
              <span className="font-semibold">{overview.open_ncs}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">No conformidades cerradas</span>
              <span className="font-semibold">{overview.closed_ncs}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Acciones vencidas</span>
              <span className="font-semibold text-destructive">{overview.overdue_cas}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Tendencia</span>
              <span className="font-semibold capitalize">{overview.trend || 'Sin datos'}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Principales riesgos abiertos</CardTitle>
          </CardHeader>
          <CardContent>
            {topRisks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay riesgos abiertos en la fuente de datos real.</p>
            ) : (
              <div className="space-y-2">
                {topRisks.slice(0, 5).map((risk) => (
                  <div key={risk.id} className="flex items-start gap-2 rounded-lg bg-muted/50 p-2 text-sm">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                    <div className="flex-1">
                      <p className="font-medium">{risk.nc_number || 'NC sin número'}</p>
                      <p className="text-xs text-muted-foreground">{risk.title}</p>
                    </div>
                    <Badge variant="outline">{risk.severity || 'sin estado'}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Nuevos módulos operacionales</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Link href="/dashboard/produccion">
            <BrandCard className="h-full cursor-pointer transition-shadow hover:shadow-lg">
              <CardHeader>
                <Zap className="mb-2 h-6 w-6 text-[var(--brand-naranja)]" />
                <CardTitle>Producción</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Monitoreo real de equipos, sensores y KPIs operacionales.
              </CardContent>
            </BrandCard>
          </Link>

          <Link href="/dashboard/hse">
            <BrandCard className="h-full cursor-pointer transition-shadow hover:shadow-lg">
              <CardHeader>
                <Shield className="mb-2 h-6 w-6 text-[var(--brand-rojo)]" />
                <CardTitle>HSE y cumplimiento</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Gestión de seguridad, incidentes y cumplimiento normativo minero-ambiental.
              </CardContent>
            </BrandCard>
          </Link>

          <Link href="/dashboard/documentos-gestion">
            <BrandCard className="h-full cursor-pointer transition-shadow hover:shadow-lg">
              <CardHeader>
                <FolderOpen className="mb-2 h-6 w-6 text-[var(--brand-verde)]" />
                <CardTitle>Gestión documental</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Centraliza contratos, procedimientos, reportes y documentos operacionales.
              </CardContent>
            </BrandCard>
          </Link>

          <Link href="/dashboard/sostenibilidad">
            <BrandCard className="h-full cursor-pointer transition-shadow hover:shadow-lg">
              <CardHeader>
                <RefreshCw className="mb-2 h-6 w-6 text-primary" />
                <CardTitle>Sostenibilidad</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Seguimiento de no conformidades, acciones correctivas y reportes reales.
              </CardContent>
            </BrandCard>
          </Link>
        </div>
      </div>

      <div className="bg-muted/50 rounded-lg border border-border p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold">Crear nueva tarea o reporte</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Registra incidentes, órdenes de trabajo o solicitudes de aprobación con datos reales.
            </p>
          </div>
          <Button asChild className="gap-2 bg-[var(--brand-naranja)] hover:bg-[var(--brand-naranja)]/90">
            <Link href="/dashboard/crear-tarea">
              <Plus className="h-4 w-4" />
              Crear tarea
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
