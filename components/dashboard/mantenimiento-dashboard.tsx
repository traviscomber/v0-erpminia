'use client';

import Link from 'next/link';
import useSWR from 'swr';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  Boxes,
  CalendarClock,
  ClipboardList,
  DollarSign,
  FileText,
  Fuel,
  Gauge,
  HardHat,
  Plus,
  RefreshCw,
  Smartphone,
  Truck,
  Users,
  Wrench,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMantenimientoOrdenes } from '@/hooks/use-module-apis';

type MaintenanceOrder = {
  id?: string | number;
  description?: string | null;
  status: string;
  priority: string;
  scheduled_date?: string | null;
};

type DerivedMachine = {
  id: string;
  code: string;
  name: string;
  family: string;
  status: string;
};

type CostCenterMachineResponse = {
  machines?: DerivedMachine[];
};

type ModuleLink = {
  label: string;
  description: string;
  href: string;
  icon: typeof Wrench;
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) throw new Error('No se pudo cargar la información');
  return response.json();
};

function normalize(value: string | null | undefined) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function priorityLabel(priority: string) {
  const labels: Record<string, string> = {
    urgente: 'Urgente',
    critical: 'Crítica',
    alta: 'Alta',
    high: 'Alta',
    media: 'Media',
    medium: 'Media',
    baja: 'Baja',
    low: 'Baja',
  };
  return labels[priority] || priority;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    pendiente: 'Pendiente',
    open: 'Abierta',
    pending: 'Pendiente',
    en_progreso: 'En progreso',
    in_progress: 'En progreso',
    completado: 'Completada',
    completed: 'Completada',
  };
  return labels[status] || status;
}

const moduleSections: Array<{ title: string; description: string; links: ModuleLink[] }> = [
  {
    title: 'Operación diaria',
    description: 'Planifica, ejecuta y registra el trabajo de mantenimiento.',
    links: [
      { label: 'Órdenes de trabajo', description: 'Prioridades, responsables y avance.', href: '/dashboard/mantenimiento/ordenes-trabajo', icon: ClipboardList },
      { label: 'Planificación preventiva', description: 'Calendario y tareas programadas.', href: '/dashboard/mantenimiento/planificacion', icon: CalendarClock },
      { label: 'Bitácora', description: 'Historial operacional consolidado.', href: '/dashboard/mantenimiento/bitacora', icon: FileText },
      { label: 'Operación en terreno', description: 'Ejecución móvil para supervisores.', href: '/dashboard/mantenimiento/movil', icon: Smartphone },
      { label: 'Por centro de costo', description: 'Carga y desempeño por unidad.', href: '/dashboard/mantenimiento/centro-costo', icon: Gauge },
    ],
  },
  {
    title: 'Activos',
    description: 'Control técnico y disponibilidad de equipos y componentes.',
    links: [
      { label: 'Equipos', description: 'Maestro técnico de activos.', href: '/dashboard/mantenimiento/equipos', icon: Truck },
      { label: 'Vehículos', description: 'Flota y traslados operacionales.', href: '/dashboard/mantenimiento/vehiculos', icon: Truck },
      { label: 'Neumáticos', description: 'Ciclo de vida, posición y consumo.', href: '/dashboard/mantenimiento/neumaticos', icon: Boxes },
      { label: 'Componentes mayores', description: 'Seguimiento de componentes críticos.', href: '/dashboard/mantenimiento/componentes-mayores', icon: Wrench },
      { label: 'Disponibilidad', description: 'Estado y continuidad de la flota.', href: '/dashboard/mantenimiento/disponibilidad', icon: Activity },
    ],
  },
  {
    title: 'Recursos y costos',
    description: 'Gestiona personas, insumos y gasto por activo.',
    links: [
      { label: 'Personal', description: 'Dotación y asignación de técnicos.', href: '/dashboard/mantenimiento/personal', icon: Users },
      { label: 'Combustible', description: 'Consumo y control operacional.', href: '/dashboard/mantenimiento/combustible', icon: Fuel },
      { label: 'Costo por equipo', description: 'Costo acumulado y tendencias.', href: '/dashboard/mantenimiento/costos', icon: DollarSign },
    ],
  },
  {
    title: 'Control',
    description: 'Indicadores para supervisión y toma de decisiones.',
    links: [
      { label: 'Indicadores', description: 'KPIs operacionales de mantenimiento.', href: '/dashboard/mantenimiento/indicadores', icon: BarChart3 },
      { label: 'Dashboard gerencial', description: 'Visión ejecutiva de desempeño.', href: '/dashboard/mantenimiento/gerencial', icon: Gauge },
    ],
  },
  {
    title: 'Documentación',
    description: 'Centraliza evidencia técnica y expedientes de activos.',
    links: [
      { label: 'Biblioteca documental', description: 'Documentos de mantenimiento.', href: '/dashboard/mantenimiento/documentos', icon: FileText },
      { label: 'Expedientes por equipo', description: 'Historial documental por activo.', href: '/dashboard/mantenimiento/documentos/expedientes', icon: Boxes },
      { label: 'Fichas técnicas', description: 'Especificaciones y antecedentes.', href: '/dashboard/mantenimiento/fichas-tecnicas', icon: HardHat },
    ],
  },
];

export function MantenimientoDashboard() {
  const { ordenes, isLoading: ordersLoading, error: ordersError, mutate: mutateOrders } = useMantenimientoOrdenes();
  const {
    data: machineData,
    isLoading: machinesLoading,
    error: machinesError,
    mutate: mutateMachines,
  } = useSWR<CostCenterMachineResponse>('/api/maintenance/cost-center-machines', fetcher);

  const machines = Array.isArray(machineData?.machines) ? machineData.machines : [];
  const orders = Array.isArray(ordenes) ? (ordenes as MaintenanceOrder[]) : [];
  const isLoading = ordersLoading || machinesLoading;

  const activeAssets = machines.filter((machine) => ['activo', 'operativo', 'active', 'operational'].includes(normalize(machine.status))).length;
  const inactiveAssets = machines.filter((machine) => ['inactive', 'inactivo', 'decommissioned', 'baja'].includes(normalize(machine.status))).length;
  const totalAssets = machines.length;
  const availability = totalAssets > 0 ? Math.round((activeAssets / totalAssets) * 100) : 0;
  const openOrders = orders.filter((order) => ['pendiente', 'open', 'pending', 'en_progreso', 'in_progress'].includes(order.status)).length;
  const urgentOrders = orders.filter((order) => ['urgente', 'critical'].includes(order.priority)).length;
  const overdueOrders = orders.filter((order) => {
    if (!order.scheduled_date || ['completado', 'completed'].includes(order.status)) return false;
    const scheduledDate = new Date(order.scheduled_date);
    if (Number.isNaN(scheduledDate.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    scheduledDate.setHours(0, 0, 0, 0);
    return scheduledDate < today;
  }).length;

  const recentOrders = orders.slice(0, 5);
  const recommendedAction = overdueOrders > 0
    ? {
        title: 'Resolver órdenes vencidas',
        description: `${overdueOrders} órdenes están fuera de plazo y requieren reasignación o cierre.`,
        href: '/dashboard/mantenimiento/ordenes-trabajo',
        label: 'Revisar vencidas',
      }
    : urgentOrders > 0
      ? {
          title: 'Priorizar órdenes críticas',
          description: `${urgentOrders} órdenes críticas necesitan seguimiento inmediato.`,
          href: '/dashboard/mantenimiento/ordenes-trabajo',
          label: 'Ver críticas',
        }
      : {
          title: 'Programar mantenimiento preventivo',
          description: 'Mantén la planificación alineada con la disponibilidad de los activos.',
          href: '/dashboard/mantenimiento/planificacion',
          label: 'Abrir planificación',
        };

  if (ordersError || machinesError) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <div className="flex items-center gap-2 font-semibold text-destructive">
          <AlertCircle className="h-5 w-5" />
          No se pudo cargar el módulo de mantenimiento
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Revisa la conexión con las APIs de órdenes y activos.</p>
        <Button
          variant="outline"
          className="mt-4 gap-2"
          onClick={() => {
            void mutateOrders();
            void mutateMachines();
          }}
        >
          <RefreshCw className="h-4 w-4" />
          Reintentar
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-28 animate-pulse rounded-xl border bg-card" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-5 border-b pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-medium text-primary">Módulo operacional</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Mantenimiento</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Controla órdenes de trabajo, activos, recursos, costos y documentación desde una única vista operacional.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/dashboard/mantenimiento/ordenes-trabajo/create">
              <Plus className="mr-2 h-4 w-4" />
              Nueva OT
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/mantenimiento/planificacion">
              <CalendarClock className="mr-2 h-4 w-4" />
              Programar
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Actualizar datos"
            onClick={() => {
              void mutateOrders();
              void mutateMachines();
            }}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Disponibilidad</p>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{availability}%</p>
            <p className="mt-1 text-xs text-muted-foreground">{activeAssets} de {totalAssets} activos operativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">OT activas</p>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{openOrders}</p>
            <p className="mt-1 text-xs text-muted-foreground">Pendientes o en progreso</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">OT vencidas</p>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{overdueOrders}</p>
            <p className="mt-1 text-xs text-muted-foreground">Fuera de plazo</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Activos fuera de servicio</p>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{inactiveAssets}</p>
            <p className="mt-1 text-xs text-muted-foreground">Requieren revisión operacional</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-base">Actividad reciente</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Últimas órdenes registradas en el módulo.</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/mantenimiento/ordenes-trabajo">Ver todas</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No existen órdenes registradas todavía.
              </div>
            ) : (
              <div className="divide-y">
                {recentOrders.map((order, index) => (
                  <div key={String(order.id ?? index)} className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{order.description || `Orden ${order.id ?? index + 1}`}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{statusLabel(order.status)}</p>
                    </div>
                    <Badge variant={['urgente', 'critical'].includes(order.priority) ? 'destructive' : 'outline'}>
                      {priorityLabel(order.priority)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/[0.03]">
          <CardHeader>
            <CardTitle className="text-base">Acción recomendada</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{recommendedAction.title}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{recommendedAction.description}</p>
            <Button asChild className="mt-5 w-full justify-between">
              <Link href={recommendedAction.href}>
                {recommendedAction.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold tracking-tight">Áreas del módulo</h2>
          <p className="mt-1 text-sm text-muted-foreground">Navega por función, no por una lista plana de páginas.</p>
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          {moduleSections.map((section) => (
            <Card key={section.title} className="overflow-hidden">
              <CardHeader className="border-b bg-muted/20 pb-4">
                <CardTitle className="text-base">{section.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{section.description}</p>
              </CardHeader>
              <CardContent className="p-2">
                {section.links.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted/60"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-background">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="truncate text-xs text-muted-foreground">{item.description}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
