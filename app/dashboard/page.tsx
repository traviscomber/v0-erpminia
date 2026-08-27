'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { AlertTriangle, ArrowRight, CheckCircle2, Drill, Factory, Gauge, Inbox, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderTitle,
} from '@/components/ui/page-header';
import { StatePanel } from '@/components/ui/state-panel';

type RoleTask = {
  task_key: string;
  domain: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  evidence_summary: string | null;
  responsibility: 'owner' | 'support' | 'escalation';
  module_route: string;
  urgency_label?: string | null;
};

type InboxPayload = {
  profile?: { name?: string | null; cargoId?: string | null; cargoName?: string | null };
  summary?: { total: number; owners: number; support: number; escalations: number; critical: number; overdue: number; backlog: number };
  tasks?: RoleTask[];
};

type ProductionOverview = {
  counts?: { drillingReports?: number; drillingHoles?: number };
  quality?: { status?: 'PASS' | 'HOLD'; pass?: number; hold?: number };
  coverage?: {
    queue?: { importExceptions?: number };
    domains?: {
      plant?: { status?: string; evidenceCount?: number; reviewCount?: number };
      drilling?: { status?: string; evidenceCount?: number; reviewCount?: number };
    };
  };
  currentPeriod?: null | {
    treatedTons?: number;
    avgHeadGradePct?: number | null;
    avgRecoveryPct?: number | null;
    plan?: null | { treatmentProgressPct?: number | null; paceIndexPct?: number | null };
  };
};

type MaintenanceOverview = {
  overview?: {
    total: number;
    planned: number;
    in_progress: number;
    waiting_procurement: number;
    waiting_parts: number;
    missing_asset: number;
    missing_person: number;
    completed: number;
  };
};

type HomeMode = 'plant' | 'maintenance' | 'drilling' | 'inventory' | 'management' | 'general';

type Metric = { label: string; value: string | number; detail?: string };
type Shortcut = { label: string; href: string; detail: string };

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar los datos');
  return payload;
};

const optionalFetcher = async (url: string) => {
  try {
    return await fetcher(url);
  } catch {
    return null;
  }
};

function normalize(value: string | null | undefined) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function resolveMode(cargoName: string | null | undefined): HomeMode {
  const cargo = normalize(cargoName);
  if (/gerenc|director|administrador|admin|jefatura general/.test(cargo)) return 'management';
  if (/mantencion|mantenimiento|mecan|taller/.test(cargo)) return 'maintenance';
  if (/sondaje|perforacion|perforista/.test(cargo)) return 'drilling';
  if (/jefe.*planta|planta.*jefe|metalurg/.test(cargo)) return 'plant';
  if (/bodega|inventario|almacen/.test(cargo)) return 'inventory';
  return 'general';
}

const n = (value: number | null | undefined, digits = 0) =>
  value == null ? '—' : value.toLocaleString('es-CL', { maximumFractionDigits: digits });
const pct = (value: number | null | undefined, digits = 1) => value == null ? '—' : `${n(value, digits)}%`;
const tons = (value: number | null | undefined, digits = 0) => value == null ? '—' : `${n(value, digits)} t`;

function configFor(
  mode: HomeMode,
  production: ProductionOverview | null | undefined,
  maintenance: MaintenanceOverview | null | undefined,
  inbox: InboxPayload | null | undefined,
): { eyebrow: string; title: string; description: string; metrics: Metric[]; shortcuts: Shortcut[] } {
  const p = production?.currentPeriod;
  const queue = production?.coverage?.queue;
  const drill = production?.coverage?.domains?.drilling;
  const plant = production?.coverage?.domains?.plant;
  const m = maintenance?.overview;
  const summary = inbox?.summary;

  if (mode === 'plant') {
    return {
      eyebrow: 'Planta · operación actual',
      title: 'Mi Planta',
      description: 'Producción, ritmo y excepciones que afectan directamente la operación de Planta.',
      metrics: [
        { label: 'Tratado acumulado', value: tons(p?.treatedTons, 1), detail: p?.plan ? `${pct(p.plan.treatmentProgressPct)} del plan` : 'Sin plan activo' },
        { label: 'Ritmo mensual', value: pct(p?.plan?.paceIndexPct), detail: 'Índice de avance contra calendario' },
        { label: 'Ley cabeza Cu', value: pct(p?.avgHeadGradePct, 3), detail: 'Promedio del período' },
        { label: 'Acciones críticas', value: summary?.critical ?? 0, detail: `${summary?.overdue ?? 0} vencidas para tu cargo` },
      ],
      shortcuts: [
        { label: 'Inteligencia Producción', href: '/dashboard/produccion/inteligencia', detail: 'Plan, ritmo, confianza y forecast' },
        { label: 'Planta y metalurgia', href: '/dashboard/produccion/planta-metalurgia', detail: 'Turnos, tratamiento y metalurgia' },
        { label: 'Mis acciones', href: '/dashboard/acciones', detail: 'Incluye Data Health asignado a Planta' },
      ],
    };
  }

  if (mode === 'maintenance') {
    const active = m ? Math.max(0, m.total - m.completed) : null;
    return {
      eyebrow: 'Mantención · disponibilidad y trabajo',
      title: 'Mi Mantención',
      description: 'Disponibilidad de activos, órdenes en ejecución y bloqueos que requieren intervención.',
      metrics: [
        { label: 'OT activas', value: active ?? '—', detail: `${m?.in_progress ?? 0} en ejecución` },
        { label: 'Esperando repuestos', value: m ? m.waiting_procurement + m.waiting_parts : '—', detail: 'Compra o abastecimiento pendiente' },
        { label: 'OT sin equipo', value: m?.missing_asset ?? '—', detail: 'Requieren completar activo' },
        { label: 'Acciones críticas', value: summary?.critical ?? 0, detail: `${summary?.overdue ?? 0} vencidas para tu cargo` },
      ],
      shortcuts: [
        { label: 'Inteligencia Mantención', href: '/dashboard/mantenimiento/inteligencia', detail: 'Backlog, recurrencia y abastecimiento' },
        { label: 'Órdenes de trabajo', href: '/dashboard/mantenimiento/ordenes-trabajo', detail: 'Planificar, ejecutar y cerrar OT' },
        { label: 'Mis acciones', href: '/dashboard/acciones', detail: 'Incluye Data Health y escalaciones del cargo' },
      ],
    };
  }

  if (mode === 'drilling') {
    return {
      eyebrow: 'Sondaje · equipos y actividad',
      title: 'Mi Sondaje',
      description: 'Actividad de sondaje, cobertura de pozos y excepciones asignadas al cargo.',
      metrics: [
        { label: 'Reportes', value: production?.counts?.drillingReports ?? '—', detail: 'Registros canónicos' },
        { label: 'Pozos', value: production?.counts?.drillingHoles ?? '—', detail: 'Pozos identificados' },
        { label: 'En revisión', value: drill?.reviewCount ?? '—', detail: 'Casos que requieren evidencia' },
        { label: 'Acciones críticas', value: summary?.critical ?? 0, detail: `${summary?.overdue ?? 0} vencidas para tu cargo` },
      ],
      shortcuts: [
        { label: 'Sondaje', href: '/dashboard/produccion/sondaje', detail: 'Pozos, metros, equipos y ubicación' },
        { label: 'Equipos', href: '/dashboard/mantenimiento/equipos', detail: 'Estado de activos asociados' },
        { label: 'Mis acciones', href: '/dashboard/acciones', detail: 'Sólo tareas asignadas a tu cargo' },
      ],
    };
  }

  if (mode === 'inventory') {
    return {
      eyebrow: 'Bodega · stock y abastecimiento',
      title: 'Mi Bodega',
      description: 'Stock canónico, calidad del inventario y necesidades que requieren acción.',
      metrics: [
        { label: 'Acciones propias', value: summary?.owners ?? 0, detail: 'Responsabilidad directa' },
        { label: 'Críticas', value: summary?.critical ?? 0, detail: `${summary?.overdue ?? 0} vencidas` },
        { label: 'Escalaciones', value: summary?.escalations ?? 0, detail: 'Seguimiento superior' },
        { label: 'Backlog', value: summary?.backlog ?? 0, detail: 'Más de 30 días' },
      ],
      shortcuts: [
        { label: 'Inteligencia Inventario', href: '/dashboard/bodega/inteligencia', detail: 'Stock, calidad y readiness predictivo' },
        { label: 'Inventario', href: '/dashboard/bodega', detail: 'Existencias y productos canónicos' },
        { label: 'Mis acciones', href: '/dashboard/acciones', detail: 'Data Health y reposición asignada a Bodega' },
      ],
    };
  }

  if (mode === 'management') {
    return {
      eyebrow: 'Gerencia · excepciones',
      title: 'Resumen ejecutivo',
      description: 'Sólo indicadores ejecutivos, decisiones y escalaciones que requieren intervención.',
      metrics: [
        { label: 'Acciones críticas', value: summary?.critical ?? 0, detail: `${summary?.overdue ?? 0} vencidas` },
        { label: 'Escalaciones', value: summary?.escalations ?? 0, detail: 'Requieren decisión superior' },
        { label: 'Excepciones importación', value: queue?.importExceptions ?? '—', detail: 'Deuda de datos de Producción' },
        { label: 'Calidad Producción', value: production?.quality?.status ?? '—', detail: `${production?.quality?.hold ?? 0} fuentes HOLD` },
      ],
      shortcuts: [
        { label: 'Centro Ejecutivo', href: '/dashboard/decisiones', detail: 'Top decisiones, causa raíz y escalaciones' },
        { label: 'Data Health', href: '/dashboard/calidad-datos/salud', detail: 'Confianza y frescura por dominio' },
        { label: 'Mis acciones', href: '/dashboard/acciones', detail: 'Tareas y escalaciones visibles para Gerencia' },
      ],
    };
  }

  return {
    eyebrow: 'MOTIL Mining OS',
    title: 'Inicio',
    description: 'Tu trabajo pendiente y accesos principales según la operación disponible.',
    metrics: [
      { label: 'Acciones propias', value: summary?.owners ?? 0 },
      { label: 'Críticas', value: summary?.critical ?? 0 },
      { label: 'Vencidas', value: summary?.overdue ?? 0 },
      { label: 'Escalaciones', value: summary?.escalations ?? 0 },
    ],
    shortcuts: [
      { label: 'Mis acciones', href: '/dashboard/acciones', detail: 'Tareas visibles para tu cargo' },
      { label: 'Producción', href: '/dashboard/produccion', detail: 'Operación y cobertura canónica' },
      { label: 'Mantención', href: '/dashboard/mantenimiento', detail: 'OT y activos' },
      { label: 'Inventario', href: '/dashboard/bodega', detail: 'Stock y trazabilidad' },
    ],
  };
}

export default function DashboardPage() {
  const inbox = useSWR<InboxPayload>('/api/actions/inbox', fetcher, { refreshInterval: 60000, revalidateOnFocus: false });
  const production = useSWR<ProductionOverview | null>('/api/produccion/canonical-overview', optionalFetcher, { revalidateOnFocus: false });
  const maintenance = useSWR<MaintenanceOverview | null>('/api/maintenance/work-order-flow?limit=200', optionalFetcher, { revalidateOnFocus: false });

  const mode = resolveMode(inbox.data?.profile?.cargoName);
  const config = configFor(mode, production.data, maintenance.data, inbox.data);
  const tasks = (inbox.data?.tasks || []).slice(0, 5);
  const loading = inbox.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>{config.eyebrow}</PageHeaderEyebrow>
          <PageHeaderTitle>{config.title}</PageHeaderTitle>
          <PageHeaderDescription>{config.description}</PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button asChild><Link href={mode === 'management' ? '/dashboard/decisiones' : '/dashboard/acciones'}><Inbox className="h-4 w-4" />{mode === 'management' ? 'Centro Ejecutivo' : 'Mis acciones'}</Link></Button>
        </PageHeaderActions>
      </PageHeader>

      {inbox.error ? (
        <StatePanel tone="warning" title="No fue posible resolver tu cargo" description="Se muestra una portada operacional segura sin inventar asignaciones." />
      ) : null}

      <section aria-label="Indicadores de mi cargo" className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-4">
        {config.metrics.map((metric) => (
          <div key={metric.label} className="bg-card px-5 py-4">
            <p className="text-xs text-muted-foreground">{metric.label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{loading ? '—' : metric.value}</p>
            {metric.detail ? <p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p> : null}
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Lo que requiere atención</h2>
            <p className="text-sm text-muted-foreground">Sólo trabajo visible para tu cargo.</p>
          </div>
          {(inbox.data?.summary?.critical || 0) > 0 ? <Badge variant="destructive">{inbox.data?.summary?.critical} críticas</Badge> : null}
        </div>

        {loading ? (
          <StatePanel tone="loading" title="Cargando trabajo del cargo" />
        ) : tasks.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg border px-4 py-4">
            <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Sin acciones pendientes</p>
              <p className="text-xs text-muted-foreground">No hay excepciones asignadas a tu cargo en este momento.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border bg-card">
            {tasks.map((task) => (
              <Link key={task.task_key} href={task.module_route || '/dashboard/acciones'} className="group flex items-center gap-4 border-b px-4 py-3 last:border-0 hover:bg-muted/30">
                <AlertTriangle className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    {task.severity === 'critical' ? <Badge variant="destructive">Crítica</Badge> : null}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{task.evidence_summary || task.urgency_label || task.domain}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Accesos de mi cargo</h2>
          <p className="text-sm text-muted-foreground">La portada prioriza el trabajo habitual y evita módulos irrelevantes.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {config.shortcuts.map((item) => {
            const Icon = item.href.includes('mantenimiento') ? Wrench : item.href.includes('sondaje') ? Drill : item.href.includes('produccion') ? Factory : Gauge;
            return (
              <Link key={item.href} href={item.href} className="group rounded-lg border bg-card p-4 hover:bg-muted/30">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-background"><Icon className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
