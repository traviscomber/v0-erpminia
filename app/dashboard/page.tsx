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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Centro de Operaciones</h1>
        <p className="mt-2 text-muted-foreground">
          Resumen operativo real conectado a alertas, sostenibilidad y cumplimiento.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <div className="flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            <Zap className="h-3 w-3" />
            <span>Producción</span>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <MapPin className="h-3 w-3" />
            <span>Faena Central</span>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary-foreground">
            <Clock className="h-3 w-3" />
            <span>Actualización en vivo</span>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            <RefreshCw className="h-3 w-3" />
            <span>{loading ? 'Cargando datos reales...' : 'Datos reales cargados'}</span>
          </div>
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
          <Link href="/dashboard/guias">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-[var(--brand-naranja)] text-[var(--brand-naranja)] hover:bg-[var(--brand-naranja)]/10"
            >
              <HelpCircle className="h-4 w-4" />
              Ver guías educativas
            </Button>
          </Link>
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
            <Link href="/dashboard/alertas">
              <Button variant="outline" size="sm" className="gap-2 bg-[var(--brand-verde)] text-white border-0 hover:bg-[var(--brand-verde)]/90">
                Ver todas
              </Button>
            </Link>
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
                  <Link href={alert.actionUrl}>
                    <Button variant="ghost" size="sm" className="opacity-80 hover:opacity-100">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
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
          <Link href="/dashboard/crear-tarea">
            <Button className="gap-2 bg-[var(--brand-naranja)] hover:bg-[var(--brand-naranja)]/90">
              <Plus className="h-4 w-4" />
              Crear tarea
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
