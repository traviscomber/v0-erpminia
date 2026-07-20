'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { AlertCircle, ArrowRight, CircleAlert, CircleCheckBig, Factory, RefreshCw, Upload, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMantenimientoOrdenes } from '@/hooks/use-module-apis';
import { inferMachineFamilyFromText } from '@/lib/maintenance/cost-center-machines';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

type MaintenanceAsset = {
  status?: string | null;
  criticality?: string | null;
  id?: string | number;
  name?: string | null;
  assetName?: string | null;
  assetCode?: string | null;
  assetType?: string | null;
  location?: string | null;
};

type MaintenanceOrder = {
  status: string;
  priority: string;
  scheduled_date?: string | null;
  id?: string | number;
  description?: string | null;
};

type DerivedMachine = {
  id: string;
  code: string;
  name: string;
  family: string;
  rootCode: string;
  status: string;
  source: 'cost_center';
  description?: string | null;
};

type CostCenterMachineResponse = {
  machines?: DerivedMachine[];
  summary?: {
    total?: number;
    families?: number;
    source?: string;
  };
};

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    pendiente: 'Pendiente',
    en_progreso: 'En progreso',
    completado: 'Completada',
    open: 'Abierta',
    pending: 'Pendiente',
    in_progress: 'En progreso',
    completed: 'Completada',
  };

  return labels[status] || status;
}

function priorityLabel(priority: string) {
  const labels: Record<string, string> = {
    urgente: 'Urgente',
    critical: 'Critica',
    alta: 'Alta',
    high: 'Alta',
    media: 'Media',
    medium: 'Media',
    baja: 'Baja',
    low: 'Baja',
  };

  return labels[priority] || priority;
}

function priorityVariant(priority: string) {
  if (priority === 'urgente' || priority === 'critical') return 'destructive' as const;
  if (priority === 'alta' || priority === 'high') return 'secondary' as const;
  return 'outline' as const;
}

function assetStatusLabel(status: string) {
  const normalized = normalizeText(status);
  const labels: Record<string, string> = {
    activo: 'Operativo',
    operativa: 'Operativo',
    operativo: 'Operativo',
    active: 'Operativo',
    inactive: 'Inactivo',
    inactivo: 'Inactivo',
    maintenance: 'En mantenimiento',
    mantenimiento: 'En mantenimiento',
    decommissioned: 'Baja',
    baja: 'Baja',
  };

  return labels[normalized] || status;
}

function assetStatusVariant(status: string) {
  const normalized = normalizeText(status);
  if (normalized === 'maintenance' || normalized === 'mantenimiento') return 'secondary' as const;
  if (normalized === 'inactive' || normalized === 'inactivo' || normalized === 'decommissioned' || normalized === 'baja') return 'outline' as const;
  return 'default' as const;
}

function normalizeText(value: string | null | undefined) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function MantenimientoDashboard() {
  const { ordenes, isLoading: ordersLoading, error: ordersError, mutate: mutateOrders } = useMantenimientoOrdenes();
  const { data: assetsData, isLoading: assetsLoading, mutate: mutateAssets, error: assetsError } = useSWR(
    '/api/maquinaria/machinery',
    fetcher,
  );
  const {
    data: machineCatalogData,
    isLoading: machineCatalogLoading,
    mutate: mutateMachineCatalog,
  } = useSWR<CostCenterMachineResponse>('/api/maintenance/cost-center-machines', fetcher);

  const isLoading = ordersLoading || assetsLoading || machineCatalogLoading;

  const machinery = (Array.isArray(assetsData?.machinery) ? assetsData.machinery : []) as Array<{ status?: string | null; family?: string | null; name?: string | null; code?: string | null }>;
  const assets = machinery as unknown as MaintenanceAsset[];
  const derivedMachines = Array.isArray(machineCatalogData?.machines) ? machineCatalogData.machines : [];
  const derivedMachineCount = derivedMachines.length;
  const totalAssets = derivedMachineCount;
  const activeAssets = derivedMachines.filter((machine) =>
    ['activo', 'operativo', 'active', 'operational'].includes(normalizeText(machine.status)),
  ).length;
  const maintenanceAssets = assets.filter((asset) =>
    ['maintenance', 'mantenimiento'].includes(normalizeText(asset.status)),
  ).length;
  const inactiveAssets = derivedMachines.filter((machine) =>
    ['inactive', 'inactivo', 'decommissioned', 'baja'].includes(normalizeText(machine.status)),
  ).length;
  const machineFamilySummary = derivedMachines.reduce<Record<string, number>>((acc, machine) => {
    const family = machine.family || inferMachineFamilyFromText(`${machine.name} ${machine.code}`) || 'Sin familia';
    acc[family] = (acc[family] || 0) + 1;
    return acc;
  }, {});
  const topMachineFamilies = Object.entries(machineFamilySummary)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const openOrders = ordenes.filter((o) => ['pendiente', 'open', 'pending'].includes(o.status)).length;
  const inProgressOrders = ordenes.filter((o) => ['en_progreso', 'in_progress'].includes(o.status)).length;
  const completedOrders = ordenes.filter((o) => ['completado', 'completed'].includes(o.status)).length;
  const urgentOrders = ordenes.filter((o) => ['urgente', 'critical'].includes(o.priority)).length;
  const overdueOrders = (ordenes as MaintenanceOrder[]).filter((order) => {
    if (!order.scheduled_date) return false;
    if (['completado', 'completed'].includes(order.status)) return false;
    const scheduled = new Date(order.scheduled_date);
    if (Number.isNaN(scheduled.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    scheduled.setHours(0, 0, 0, 0);
    return scheduled < today;
  }).length;

  const availability = totalAssets > 0 ? Math.round((activeAssets / totalAssets) * 100) : 0;
  const recentOrders = [...ordenes].slice(0, 6);
  const criticalAssets = assets
    .filter((asset) => ['critical', 'high', 'critico', 'critica', 'alto', 'alta'].includes(normalizeText(asset.criticality)))
    .slice(0, 6);
  const handleRefreshOrders = () => {
    void mutateOrders();
  };
  const handleRefreshAssets = () => {
    void mutateAssets();
    void mutateMachineCatalog();
  };
  const nextAction =
    overdueOrders > 0
      ? {
          title: 'Atender OT vencidas',
          description: 'Revisa las ordenes atrasadas antes de abrir nuevas tareas.',
          href: '/dashboard/work-orders',
          cta: 'Ver ordenes atrasadas',
        }
      : criticalAssets.length > 0
        ? {
            title: 'Revisar activos criticos',
            description: 'Enlaza la planificacion preventiva con los equipos de mayor riesgo.',
            href: '/dashboard/mantenimiento/planificacion',
            cta: 'Abrir planificacion',
          }
        : {
            title: 'Crear una OT preventiva',
            description: 'Inicia el flujo operativo con una orden nueva y un activo real.',
            href: '/dashboard/work-orders/create',
            cta: 'Crear OT',
          };

  if (ordersError || assetsError) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-destructive">
        <div className="flex items-center gap-2 font-semibold">
          <AlertCircle className="h-4 w-4" />
          No se pudo cargar mantenimiento
        </div>
        <p className="mt-2 text-sm text-destructive/80">
          Revisa la conexion a las APIs de mantenimiento y activos antes de volver a intentar.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Cargando mantenimiento...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mantenimiento</h1>
          <p className="text-muted-foreground">Panel ejecutivo con equipos, OT y disponibilidad real.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={handleRefreshOrders} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualizar OT
          </Button>
          <Button size="sm" variant="outline" onClick={handleRefreshAssets} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualizar equipos
          </Button>
        </div>
      </div>

      <Card className="border-border/70 bg-card/90">
        <CardHeader className="pb-3">
          <CardTitle>Siguiente accion recomendada</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="font-semibold text-foreground">{nextAction.title}</p>
            <p className="text-sm text-muted-foreground">{nextAction.description}</p>
          </div>
          <Button asChild className="gap-2">
            <Link href={nextAction.href}>
              {nextAction.cta}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Factory className="h-4 w-4 text-primary" />
              Equipos totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalAssets}</div>
            <p className="text-xs text-muted-foreground">{availability}% disponibilidad operativa</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CircleCheckBig className="h-4 w-4 text-green-500" />
              Operativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">{activeAssets}</div>
            <p className="text-xs text-muted-foreground">Equipos en servicio</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Wrench className="h-4 w-4 text-secondary" />
              OT abiertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-secondary">{openOrders}</div>
            <p className="text-xs text-muted-foreground">Incluye pendientes y abiertas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CircleAlert className="h-4 w-4 text-orange-500" />
              Atrasadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">{overdueOrders}</div>
            <p className="text-xs text-muted-foreground">OT con fecha vencida</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/90">
        <CardHeader>
          <CardTitle>Acceso rapido al ecosistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/telemetria">
                Telemetria de sensores
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/bodega">
                Bodega e inventario
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/mantenimiento/planificacion">
                Planificacion preventiva
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/mantenimiento/documentos">
                Documentos de mantenimiento
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/mantenimiento/centro-costo">
                Mantenimiento por centro de costo
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/90">
        <CardHeader>
          <CardTitle>Inteligencia minera desde centros de costo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Familias de maquinaria derivadas de la estructura real de centros de costo para apoyar
            planificacion, repuestos y control operativo.
          </p>
          {topMachineFamilies.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              No hay maquinaria derivada aun desde centros de costo. Revisa la carga de la base para
              habilitar esta lectura.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {topMachineFamilies.map(([family, count]) => (
                <div key={family} className="rounded-lg border border-border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{family}</p>
                  <p className="mt-2 text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">Activos derivados para mantenimiento</p>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Total de modelos detectados: {derivedMachineCount}
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/90">
        <CardHeader>
          <CardTitle>Acceso rapido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Button asChild className="justify-between">
              <Link href="/dashboard/work-orders/create">
                Crear orden de trabajo
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/work-orders">
                Ver ordenes
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/mantenimiento/vehiculos">
                Vehiculos, QR y ficha
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/mantenimiento/equipos">
                Maquinaria y equipos
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/mantenimiento/bitacora">
                Ver bitacora
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/mantenimiento/planificacion">
                Ver planificacion
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/mantenimiento/gerencial">
                Ver dashboard gerencial
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/mantenimiento/movil">
                Panel movil
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/mantenimiento/costos">
                Ver costos
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/mantenimiento/indicadores">
                Ver indicadores
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/mantenimiento/neumaticos">
                Ver neumaticos
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/mantenimiento/componentes-mayores">
                Ver componentes mayores
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/mantenimiento/fichas-tecnicas">
                Fichas tecnicas
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/90">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" />
            Importaciones estandarizadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/mantenimiento/equipos/importar">
                Equipos
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/mantenimiento/vehiculos/importar">
                Vehiculos
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/mantenimiento/planificacion/importar">
                Planificacion
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/mantenimiento/componentes-mayores/importar">
                Componentes
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/mantenimiento/fichas-tecnicas/importar">
                Fichas tecnicas
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/mantenimiento/neumaticos/importar">
                Neumaticos
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/mantenimiento/combustible/importar">
                Combustible
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/mantenimiento/centro-costo/importar">
                Centro de costo
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/mantenimiento/costos/importar">
                Costos
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/mantenimiento/bitacora/importar">
                Bitacora
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/mantenimiento/personal/importar">
                Personal
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Estado de equipos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Operativos</p>
                <p className="text-2xl font-bold text-green-500">{activeAssets}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">En mantenimiento</p>
                <p className="text-2xl font-bold text-secondary">{maintenanceAssets}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Inactivos</p>
                <p className="text-2xl font-bold text-muted-foreground">{inactiveAssets}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Criticos</p>
                <p className="text-2xl font-bold text-orange-500">{criticalAssets.length}</p>
              </div>
            </div>

            <div className="space-y-2">
              {criticalAssets.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  No hay equipos criticos visibles.
                </div>
              ) : (
                criticalAssets.map((asset) => (
                  <div key={asset.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="font-semibold">{asset.assetName || asset.assetCode || 'Equipo'}</p>
                      <p className="text-xs text-muted-foreground">
                        {asset.assetType || 'Sin tipo'} - {asset.location || 'Sin ubicacion'}
                      </p>
                    </div>
                    <Badge variant={assetStatusVariant(String(asset.status || '').toLowerCase())}>
                      {assetStatusLabel(String(asset.status || '').toLowerCase())}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>OT recientes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentOrders.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                No hay ordenes registradas todavia.
              </div>
            ) : (
              recentOrders.map((orden) => (
                <div key={orden.id} className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground">
                        {orden.order_number || orden.code || 'OT'} - {orden.title}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{orden.description}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Badge variant={priorityVariant(orden.priority)}>{priorityLabel(orden.priority)}</Badge>
                      <span className="text-xs text-muted-foreground">{statusLabel(orden.status)}</span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {orden.asset_name ? <span>Equipo: {orden.asset_name}</span> : null}
                    {orden.scheduled_date ? <span>Programada: {new Date(orden.scheduled_date).toLocaleDateString('es-CL')}</span> : null}
                    {orden.assigned_to_name ? <span>Responsable: {orden.assigned_to_name}</span> : null}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumen operacional</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground">OT completadas</p>
              <p className="text-2xl font-bold text-green-500">{completedOrders}</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground">OT en progreso</p>
              <p className="text-2xl font-bold text-blue-500">{inProgressOrders}</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground">OT urgentes</p>
              <p className="text-2xl font-bold text-orange-500">{urgentOrders}</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground">Disponibilidad</p>
              <p className="text-2xl font-bold">{availability}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
