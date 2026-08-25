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
  { title: 'Producción', href: '/dashboard/produccion', capabilities: [
    ['Transporte de Mineral', '/dashboard/produccion/transporte-mineral'], ['Planta y metalurgia', '/dashboard/produccion/planta-metalurgia'], ['Geología', '/dashboard/produccion/geologia'], ['Topografía', '/dashboard/produccion/topografia'], ['Química', '/dashboard/produccion/quimica'], ['Sondaje', '/dashboard/produccion/sondaje'],
  ] },
  { title: 'Mantenimiento', href: '/dashboard/mantenimiento', capabilities: [
    ['Órdenes de trabajo', '/dashboard/mantenimiento/ordenes-trabajo'], ['Activos', '/dashboard/mantenimiento/equipos'], ['Planificación', '/dashboard/mantenimiento/planificacion'], ['Vehículos', '/dashboard/mantenimiento/vehiculos'], ['Maestranza', '/dashboard/mantenimiento/maestranza'],
  ] },
  { title: 'Inventario', href: '/dashboard/bodega', capabilities: [
    ['Stock', '/dashboard/bodega'], ['Reservas', '/dashboard/bodega'], ['Reposición', '/dashboard/bodega/repuestos-criticos'], ['Repuestos', '/dashboard/bodega/repuestos-criticos'], ['Trazabilidad', '/dashboard/bodega/productos-360'],
  ] },
  { title: 'Compras', href: '/dashboard/compras', capabilities: [
    ['Cotizaciones', '/dashboard/compras/flujo'], ['Órdenes de compra', '/dashboard/compras/flujo'], ['Proveedores', '/dashboard/compras/proveedores-360'], ['Comparación', '/dashboard/compras/inteligencia'],
  ] },
  { title: 'Finanzas', href: '/dashboard/finanzas', capabilities: [
    ['Costos', '/dashboard/finanzas'], ['Compromisos', '/dashboard/finanzas/trazabilidad'], ['Centros de costo', '/dashboard/finanzas/centros'], ['Trazabilidad financiera', '/dashboard/finanzas/trazabilidad'],
  ] },
  { title: 'RRHH', href: '/dashboard/rrhh', capabilities: [
    ['Personas', '/dashboard/personas'], ['Contratos laborales', '/dashboard/rrhh'], ['Asistencia', '/dashboard/rrhh'], ['Desempeño', '/dashboard/desempeno'], ['Competencias', '/dashboard/desempeno'], ['Evidencia', '/dashboard/desempeno'],
  ] },
  { title: 'Sostenibilidad', href: '/dashboard/sostenibilidad', capabilities: [
    ['HSE', '/dashboard/hse'], ['Prevención', '/dashboard/sostenibilidad/prevencion-riesgos'], ['EPP', '/dashboard/hse/epp'], ['Medio ambiente', '/dashboard/sostenibilidad/medio-ambiente'], ['Comunidades', '/dashboard/sostenibilidad/comunidades'], ['Cumplimiento', '/dashboard/sostenibilidad/compliance'],
  ] },
  { title: 'Legal', href: '/dashboard/legal', capabilities: [
    ['Contratos', '/dashboard/documentos-gestion/contratos'], ['Documentos', '/dashboard/legal/documentos'], ['Permisos', '/dashboard/legal/permisos-licencias'], ['Vencimientos', '/dashboard/legal/permisos-licencias'], ['Cumplimiento', '/dashboard/legal'],
  ] },
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
          <PageHeaderEyebrow>MOTIL Mining OS</PageHeaderEyebrow>
          <PageHeaderTitle>Inicio</PageHeaderTitle>
          <PageHeaderDescription>Estado de la operación y acceso directo a las áreas habilitadas para tu organización.</PageHeaderDescription>
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
        <div>
          <h2 className="text-lg font-semibold">Áreas</h2>
          <p className="text-sm text-muted-foreground">Cada área corresponde a un módulo comercial del Mining OS y contiene sus capacidades específicas.</p>
        </div>
        <div className="overflow-hidden rounded-lg border bg-card">
          {workspaces.map((item) => (
            <div key={item.href} className="grid gap-2 border-b px-4 py-3 last:border-0 sm:grid-cols-[180px_1fr_24px] sm:items-start sm:gap-4">
              <Link href={item.href} className="group flex items-center gap-2 text-sm font-medium hover:underline">
                {item.title}
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-1 sm:hidden" />
              </Link>
              <div className="flex flex-wrap gap-x-1.5 gap-y-1" aria-label={`Accesos de ${item.title}`}>
                {item.capabilities.map(([label, href], index) => (
                  <span key={`${label}-${href}`} className="inline-flex items-center text-sm text-muted-foreground">
                    <Link href={href} className="rounded-sm hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      {label}
                    </Link>
                    {index < item.capabilities.length - 1 ? <span aria-hidden="true">,</span> : null}
                  </span>
                ))}
              </div>
              <Link href={item.href} aria-label={`Abrir ${item.title}`} className="group hidden sm:block">
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
