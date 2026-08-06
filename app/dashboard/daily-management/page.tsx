'use client';

import Link from 'next/link';
import useSWR from 'swr';
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Factory,
  RefreshCw,
  ShieldAlert,
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

type OperationalItem = {
  id: string;
  source: 'maintenance' | 'compliance' | 'procurement';
  source_label: string;
  kind: string;
  date: string;
  title: string;
  subtitle: string | null;
  reference: string | null;
  status_label: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  priority_label: string;
  owner: string | null;
  href: string;
  overdue: boolean;
  days_until: number;
};

type OperationalResponse = {
  data?: OperationalItem[];
  summary?: { overdue: number; today: number; next_7_days: number; total: number };
};

type AlertResponse = {
  stats?: { total: number; unread: number; critical: number; actionRequired: number };
};

type ProductionResponse = {
  kpis?: Array<{
    date: string;
    production_tons: number;
    equipment_uptime: number;
    safety_incidents: number;
    environmental_compliance: number;
  }>;
};

type MaintenanceResponse = {
  ordenes?: Array<{ id: string; status: string; priority: string }>;
};

type InventoryResponse = {
  categories?: Array<{ low_stock: number }>;
};

type OverviewResponse = {
  overview?: { compliance_score: number; open_ncs: number; overdue_cas: number };
};

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar la información');
  return payload as T;
};

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: 'short' });
}

export default function DailyManagementPage() {
  const operational = useSWR<OperationalResponse>('/api/calendar/operational?days=90&scope=open', fetcher, { revalidateOnFocus: false });
  const alerts = useSWR<AlertResponse>('/api/alertas', fetcher, { revalidateOnFocus: false });
  const production = useSWR<ProductionResponse>('/api/produccion/kpi', fetcher, { revalidateOnFocus: false });
  const maintenance = useSWR<MaintenanceResponse>('/api/mantenimiento/ordenes', fetcher, { revalidateOnFocus: false });
  const inventory = useSWR<InventoryResponse>('/api/bodega/categories', fetcher, { revalidateOnFocus: false });
  const overview = useSWR<OverviewResponse>('/api/sostenibilidad/dashboard/overview', fetcher, { revalidateOnFocus: false });

  const sources = [operational, alerts, production, maintenance, inventory, overview];
  const loading = sources.some((source) => source.isLoading);
  const partial = sources.some((source) => Boolean(source.error));
  const refresh = () => sources.forEach((source) => void source.mutate());

  const commitments = operational.data?.data || [];
  const summary = operational.data?.summary || { overdue: 0, today: 0, next_7_days: 0, total: 0 };
  const latestProduction = production.data?.kpis?.[0];
  const orders = maintenance.data?.ordenes || [];
  const criticalOrders = orders.filter((order) => {
    const status = String(order.status || '').toLowerCase();
    const priority = String(order.priority || '').toLowerCase();
    return !['completed', 'completada', 'cerrada', 'cancelled', 'cancelada'].includes(status)
      && ['critical', 'critica', 'high', 'alta', 'urgente'].includes(priority);
  }).length;
  const lowStock = (inventory.data?.categories || []).reduce((sum, category) => sum + Number(category.low_stock || 0), 0);
  const alertStats = alerts.data?.stats || { total: 0, unread: 0, critical: 0, actionRequired: 0 };
  const safety = overview.data?.overview || { compliance_score: 0, open_ncs: 0, overdue_cas: 0 };
  const todayItems = commitments.filter((item) => item.days_until === 0 || item.overdue).slice(0, 8);

  const indicators = [
    {
      label: 'Producción',
      value: latestProduction ? `${Math.round(latestProduction.production_tons || 0)} ton` : 'Sin registro',
      detail: latestProduction ? `${Number(latestProduction.equipment_uptime || 0).toFixed(1)}% de disponibilidad` : 'Sin información',
      icon: Factory,
      href: '/dashboard/produccion',
    },
    {
      label: 'Órdenes críticas',
      value: criticalOrders,
      detail: 'Abiertas con prioridad alta',
      icon: Wrench,
      href: '/dashboard/mantenimiento/ordenes-trabajo',
    },
    {
      label: 'Alertas críticas',
      value: alertStats.critical,
      detail: `${alertStats.actionRequired} requieren acción`,
      icon: AlertTriangle,
      href: '/dashboard/alertas',
    },
    {
      label: 'Stock crítico',
      value: lowStock,
      detail: 'Artículos bajo el mínimo',
      icon: Boxes,
      href: '/dashboard/bodega',
    },
    {
      label: 'Compromisos vencidos',
      value: summary.overdue,
      detail: `${summary.today} comprometidos para hoy`,
      icon: Clock3,
      href: '/dashboard/tareas',
    },
    {
      label: 'Cumplimiento de seguridad',
      value: `${Number(safety.compliance_score || 0).toFixed(0)}%`,
      detail: `${safety.open_ncs} hallazgos abiertos · ${safety.overdue_cas} acciones vencidas`,
      icon: ShieldAlert,
      href: '/dashboard/sostenibilidad',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Control y mejora</PageHeaderEyebrow>
          <PageHeaderTitle>Revisión diaria</PageHeaderTitle>
          <PageHeaderDescription>
            Problemas, compromisos y estado de la operación reunidos para comenzar el día con responsables y próximos pasos claros.
          </PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <Badge variant={partial ? 'destructive' : 'outline'}>
            {partial ? 'Información parcial' : loading ? 'Actualizando' : 'Información al día'}
          </Badge>
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
          description="Se mantiene visible todo lo que pudo comprobarse. No se completaron valores mediante estimaciones."
          className="min-h-0 py-5"
        />
      ) : null}

      <section aria-label="Indicadores diarios" className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-3">
        {indicators.map(({ label, value, detail, icon: Icon, href }) => (
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,.65fr)]">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Compromisos del día</CardTitle>
              <CardDescription>Vencidos y programados para hoy, ordenados por urgencia.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm"><Link href="/dashboard/tareas">Ver todos</Link></Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <StatePanel tone="loading" title="Cargando compromisos" className="min-h-52 border-0 bg-transparent" />
            ) : todayItems.length === 0 ? (
              <StatePanel
                tone="success"
                icon={CheckCircle2}
                title="Sin compromisos vencidos o para hoy"
                description="La operación no registra pendientes inmediatos."
                className="min-h-52 border-0 bg-transparent"
              />
            ) : (
              <div className="divide-y divide-border/70">
                {todayItems.map((item) => (
                  <article key={`${item.source}-${item.id}`} className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{item.source_label}</Badge>
                        <Badge variant={item.overdue ? 'destructive' : 'secondary'}>{item.overdue ? 'Vencido' : 'Hoy'}</Badge>
                        <span className="text-xs text-muted-foreground">{formatDate(item.date)}</span>
                      </div>
                      <p className="mt-2 text-sm font-semibold">{item.title}</p>
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{item.owner || item.reference || item.status_label}</p>
                    </div>
                    <Button asChild variant="outline" size="sm"><Link href={item.href}>Abrir<ArrowRight className="h-4 w-4" /></Link></Button>
                  </article>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Orden de la reunión</CardTitle>
            <CardDescription>Una revisión breve que debe terminar con acciones asignadas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {[
              ['1', 'Seguridad', 'Incidentes, hallazgos y acciones vencidas'],
              ['2', 'Producción', 'Resultado y disponibilidad más recientes'],
              ['3', 'Mantenimiento', 'Órdenes críticas y equipos prioritarios'],
              ['4', 'Abastecimiento', 'Stock bajo y esperas de materiales'],
              ['5', 'Compromisos', 'Vencidos, responsables y próximos pasos'],
            ].map(([number, title, description]) => (
              <div key={number} className="flex gap-3 border-b border-border/60 py-3 last:border-0">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">{number}</span>
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border bg-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <CalendarDays className="mt-0.5 h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-medium">Calendario de compromisos</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Revisa la carga de la semana y del mes.</p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/sostenibilidad/calendario">Abrir calendario<ArrowRight className="h-4 w-4" /></Link>
        </Button>
      </div>
    </div>
  );
}
