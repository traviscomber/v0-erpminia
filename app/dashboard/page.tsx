'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader, PageHeaderActions, PageHeaderContent, PageHeaderDescription, PageHeaderEyebrow, PageHeaderTitle } from '@/components/ui/page-header';
import { StatePanel } from '@/components/ui/state-panel';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar los datos');
  return payload;
};

const workspaces = [
  { title: 'Producción', href: '/dashboard/produccion', description: 'Transporte, planta, geología, topografía, química y sondaje.' },
  { title: 'Mantenimiento', href: '/dashboard/mantenimiento', description: 'Órdenes, activos, planificación y Maestranza.' },
  { title: 'Inventario', href: '/dashboard/bodega', description: 'Stock, reservas, reposición y trazabilidad.' },
  { title: 'Compras', href: '/dashboard/compras', description: 'Cotizaciones, órdenes y proveedores.' },
  { title: 'Finanzas', href: '/dashboard/finanzas', description: 'Costos, compromisos y trazabilidad financiera.' },
  { title: 'Sostenibilidad', href: '/dashboard/sostenibilidad', description: 'HSE, ambiente, comunidades y cumplimiento.' },
  { title: 'Legal', href: '/dashboard/legal', description: 'Contratos, documentos y vencimientos.' },
];

export default function DashboardPage() {
  const { data: alertsData, error: alertsError, isLoading: alertsLoading } = useSWR('/api/alertas', fetcher, { revalidateOnFocus: false });
  const { data: overviewData, error: overviewError, isLoading: overviewLoading } = useSWR('/api/sostenibilidad/dashboard/overview', fetcher, { revalidateOnFocus: false });

  const alerts = alertsData?.alerts ?? [];
  const stats = alertsData?.stats ?? { total: 0, unread: 0, critical: 0, actionRequired: 0 };
  const overview = overviewData?.overview ?? { compliance_score: 0, open_ncs: 0, overdue_cas: 0, trend: 'sin datos' };
  const loading = alertsLoading || overviewLoading;
  const hasError = Boolean(alertsError || overviewError);
  const priorities = alerts.filter((item: any) => item.actionRequired || item.severity === 'critica' || item.severity === 'alta').slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Operación</PageHeaderEyebrow>
          <PageHeaderTitle>Inicio</PageHeaderTitle>
          <PageHeaderDescription>Lo que requiere atención ahora y acceso directo a cada área.</PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button asChild><Link href="/dashboard/alertas">Ver alertas</Link></Button>
        </PageHeaderActions>
      </PageHeader>

      {hasError ? (
        <StatePanel tone="warning" title="Hay información temporalmente no disponible" description="MOTIL mantiene visible la información que sí pudo validar." />
      ) : null}

      <section aria-label="Estado operacional" className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Alertas activas', stats.total],
          ['Requieren acción', stats.actionRequired],
          ['NC abiertas', overview.open_ncs],
          ['Cumplimiento', `${overview.compliance_score}%`],
        ].map(([label, value]) => (
          <div key={label} className="bg-card px-4 py-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{loading ? '—' : value}</p>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Prioridades</h2>
            <p className="text-sm text-muted-foreground">Sólo asuntos que requieren atención.</p>
          </div>
          {stats.critical > 0 ? <Badge variant="destructive">{stats.critical} críticas</Badge> : null}
        </div>

        {loading ? (
          <StatePanel tone="loading" title="Cargando prioridades" />
        ) : priorities.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg border px-4 py-4">
            <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
            <div><p className="text-sm font-medium">Sin prioridades críticas</p><p className="text-xs text-muted-foreground">No hay acciones urgentes registradas.</p></div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border bg-card">
            {priorities.map((alert: any) => (
              <Link key={alert.id} href={alert.actionUrl || '/dashboard/alertas'} className="group flex items-center gap-4 border-b px-4 py-3 last:border-0 hover:bg-muted/30">
                <AlertTriangle className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{alert.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{alert.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div><h2 className="text-lg font-semibold">Áreas</h2><p className="text-sm text-muted-foreground">Entra directamente al trabajo que necesitas realizar.</p></div>
        <div className="overflow-hidden rounded-lg border bg-card">
          {workspaces.map((item) => (
            <Link key={item.href} href={item.href} className="group grid gap-1 border-b px-4 py-3 last:border-0 hover:bg-muted/30 sm:grid-cols-[180px_1fr_24px] sm:items-center sm:gap-4">
              <span className="text-sm font-medium">{item.title}</span>
              <span className="text-sm text-muted-foreground">{item.description}</span>
              <ArrowRight className="hidden h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 sm:block" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
