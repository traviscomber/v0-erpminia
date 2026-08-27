'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertCircle, Eye, Plus, RefreshCw, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MaintenanceSchedule } from '@/components/maintenance/maintenance-schedule';

type WorkOrderItem = {
  id: string;
  status: string | null;
  priority: string | null;
  scheduled_date: string | null;
  asset_name: string | null;
  work_order_number: string | null;
  title: string | null;
  work_type?: string | null;
  assigned_to_name?: string | null;
};

type ScheduleItem = {
  id: string;
  assetName: string;
  taskName: string;
  nextScheduledDate: string;
  priority: 'high' | 'medium' | 'low';
  daysUntil: number;
};

function normalizeText(value: string | null | undefined) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

function getStatusLabel(status: string | null | undefined) {
  const value = normalizeText(status);
  if (['completed', 'completado'].includes(value)) return 'Completada';
  if (['in_progress', 'en_progreso'].includes(value)) return 'En progreso';
  if (['open', 'abierta', 'pending', 'pendiente'].includes(value)) return 'Abierta';
  return status || 'Sin estado';
}

function getWorkTypeLabel(workType: string | null | undefined) {
  const value = normalizeText(workType);
  if (value === 'corrective') return 'Correctiva';
  if (value === 'preventive') return 'Preventiva';
  if (value === 'predictive') return 'Predictiva';
  return workType || 'Sin tipo';
}

function getPriorityLabel(priority: string | null | undefined) {
  const value = normalizeText(priority);
  if (['critical', 'urgente'].includes(value)) return 'Crítica';
  if (['high', 'alta'].includes(value)) return 'Alta';
  if (['medium', 'media'].includes(value)) return 'Media';
  if (['low', 'baja'].includes(value)) return 'Baja';
  return priority || 'Sin prioridad';
}

function getStatusClass(status: string | null | undefined) {
  const value = normalizeText(status);
  if (['completed', 'completado'].includes(value)) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (['in_progress', 'en_progreso'].includes(value)) return 'border-blue-200 bg-blue-50 text-blue-700';
  return 'border-amber-200 bg-amber-50 text-amber-700';
}

function isOverdue(order: WorkOrderItem) {
  if (!order.scheduled_date || ['completed', 'completado'].includes(normalizeText(order.status))) return false;
  const scheduled = new Date(order.scheduled_date);
  if (Number.isNaN(scheduled.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  scheduled.setHours(0, 0, 0, 0);
  return scheduled < today;
}

export default function WorkOrdersPage() {
  const searchParams = useSearchParams();
  const missingAssetOnly = searchParams.get('dataHealth') === 'missing_asset';
  const [updatingScheduleId, setUpdatingScheduleId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const { data, error, isLoading, mutate } = useSWR('/api/maintenance/work-orders', async (url: string) => {
    const response = await fetch(url, { credentials: 'include' });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || 'No se pudieron cargar las órdenes de trabajo');
    return payload;
  });

  const workOrders = Array.isArray(data?.workOrders) ? (data.workOrders as WorkOrderItem[]) : [];
  const open = workOrders.filter((order) => ['open', 'pending', 'abierta', 'pendiente'].includes(normalizeText(order.status))).length;
  const inProgress = workOrders.filter((order) => ['in_progress', 'en_progreso'].includes(normalizeText(order.status))).length;
  const critical = workOrders.filter((order) => ['critical', 'urgente'].includes(normalizeText(order.priority))).length;
  const overdue = workOrders.filter(isOverdue).length;

  const filteredOrders = useMemo(() => {
    const query = normalizeText(search);
    return workOrders.filter((order) => {
      const matchesDataHealth = !missingAssetOnly || !order.asset_name;
      const matchesSearch = !query || [order.work_order_number, order.title, order.asset_name, order.assigned_to_name].some((value) => normalizeText(value).includes(query));
      const matchesStatus = statusFilter === 'all' || normalizeText(order.status) === statusFilter;
      const matchesPriority = priorityFilter === 'all' || normalizeText(order.priority) === priorityFilter;
      return matchesDataHealth && matchesSearch && matchesStatus && matchesPriority;
    });
  }, [missingAssetOnly, priorityFilter, search, statusFilter, workOrders]);

  const scheduleItems = useMemo(() => workOrders
    .filter((order) => order.scheduled_date && !['completed', 'completado'].includes(normalizeText(order.status)))
    .map((order): ScheduleItem => {
      const scheduledDate = new Date(order.scheduled_date as string);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      scheduledDate.setHours(0, 0, 0, 0);
      const priority = normalizeText(order.priority);
      return {
        id: order.id,
        assetName: order.asset_name || 'Sin activo asociado',
        taskName: `${order.work_order_number || 'OT'} · ${order.title || 'Sin título'}`,
        nextScheduledDate: order.scheduled_date || '',
        priority: priority === 'critical' || priority === 'high' ? 'high' : priority === 'low' ? 'low' : 'medium',
        daysUntil: Math.ceil((scheduledDate.getTime() - today.getTime()) / 86400000),
      };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 7), [workOrders]);

  const markScheduleComplete = async (scheduleId: string) => {
    setUpdatingScheduleId(scheduleId);
    try {
      const response = await fetch(`/api/maintenance/work-orders/${scheduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'completed' }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'No se pudo actualizar la orden de trabajo');
      }
      await mutate();
    } finally {
      setUpdatingScheduleId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b border-border/70 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Mantenimiento · Operación diaria</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Órdenes de trabajo</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{missingAssetOnly ? 'Cola Data Health: sólo OT que todavía no tienen un activo canónico asociado. Resolver esta identidad antes de usar la OT en inteligencia de confiabilidad o causa raíz.' : 'Planifica, asigna y controla trabajos correctivos, preventivos y predictivos sin perder el historial existente.'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {missingAssetOnly ? <Button asChild variant="outline"><Link href="/dashboard/mantenimiento/ordenes-trabajo">Ver todas las OT</Link></Button> : null}
          {!missingAssetOnly ? <Button asChild variant="outline"><Link href="/dashboard/mantenimiento/ordenes-trabajo/cierre">Cierre progresivo</Link></Button> : null}
          <Button variant="outline" onClick={() => void mutate()} disabled={isLoading}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button>
          <Button asChild><Link href="/dashboard/mantenimiento/ordenes-trabajo/create"><Plus className="mr-2 h-4 w-4" />Nueva OT</Link></Button>
        </div>
      </section>

      {missingAssetOnly ? <Card className="border-destructive/30 bg-destructive/5 shadow-none"><CardContent className="flex items-start gap-3 p-4"><AlertCircle className="mt-0.5 h-5 w-5 text-destructive" /><div><p className="font-medium">Data Health · OT sin activo canónico</p><p className="mt-1 text-sm text-muted-foreground">Esta vista no corrige automáticamente la asociación. Muestra únicamente las OT que necesitan resolución de identidad del equipo.</p></div></CardContent></Card> : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[['Abiertas', open], ['En progreso', inProgress], ['Críticas', critical], ['Vencidas', overdue]].map(([label, value]) => (
          <Card key={String(label)} className="shadow-none"><CardContent className="p-4"><p className="text-xs text-muted-foreground">{String(label)}</p><p className="mt-1 text-2xl font-semibold">{Number(value)}</p></CardContent></Card>
        ))}
      </div>

      <Card className="shadow-none"><CardContent className="p-4"><div className="grid gap-3 md:grid-cols-[minmax(240px,1fr)_180px_180px_auto]">
        <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar OT, equipo o responsable" className="pl-9" /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los estados</SelectItem><SelectItem value="open">Abiertas</SelectItem><SelectItem value="in_progress">En progreso</SelectItem><SelectItem value="completed">Completadas</SelectItem></SelectContent></Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}><SelectTrigger><SelectValue placeholder="Prioridad" /></SelectTrigger><SelectContent><SelectItem value="all">Todas las prioridades</SelectItem><SelectItem value="critical">Crítica</SelectItem><SelectItem value="high">Alta</SelectItem><SelectItem value="medium">Media</SelectItem><SelectItem value="low">Baja</SelectItem></SelectContent></Select>
        <Button variant="ghost" onClick={() => { setSearch(''); setStatusFilter('all'); setPriorityFilter('all'); }}>Limpiar</Button>
      </div></CardContent></Card>

      {!missingAssetOnly && scheduleItems.length > 0 ? <Card className="shadow-none"><CardHeader className="pb-3"><CardTitle className="text-base">Próximas intervenciones</CardTitle></CardHeader><CardContent>{updatingScheduleId ? <p className="mb-3 text-sm text-muted-foreground">Actualizando orden...</p> : null}<MaintenanceSchedule schedules={scheduleItems} onMarkComplete={markScheduleComplete} /></CardContent></Card> : null}

      <Card className="shadow-none"><CardHeader className="pb-3"><CardTitle className="text-base">{missingAssetOnly ? 'OT pendientes de asociación canónica' : 'Registro de órdenes'}</CardTitle><p className="text-sm text-muted-foreground">{filteredOrders.length} de {workOrders.length} órdenes</p></CardHeader><CardContent>
        {isLoading ? <div className="space-y-2">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded-lg bg-muted" />)}</div> : error ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"><p className="font-medium text-destructive">No se pudieron cargar las órdenes</p><Button className="mt-4" variant="outline" onClick={() => void mutate()}>Reintentar</Button></div> : filteredOrders.length === 0 ? <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">{missingAssetOnly ? 'No hay OT sin activo canónico para los filtros actuales.' : 'No hay órdenes que coincidan con los filtros.'}</div> : <div className="divide-y rounded-lg border">{filteredOrders.map((order) => <div key={order.id} className="grid gap-4 p-4 transition-colors hover:bg-muted/30 lg:grid-cols-[minmax(0,1.5fr)_minmax(160px,.8fr)_minmax(150px,.7fr)_auto] lg:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs text-muted-foreground">{order.work_order_number || 'Sin folio'}</span><Badge variant="outline" className={getStatusClass(order.status)}>{getStatusLabel(order.status)}</Badge>{isOverdue(order) ? <Badge variant="destructive">Vencida</Badge> : null}{!order.asset_name ? <Badge variant="destructive">Sin activo</Badge> : null}</div><p className="mt-2 truncate font-medium">{order.title || 'Orden sin título'}</p><p className="mt-1 truncate text-sm text-muted-foreground">{order.asset_name || 'Sin activo asociado'}</p></div><div><p className="text-xs text-muted-foreground">Tipo y prioridad</p><p className="mt-1 text-sm">{getWorkTypeLabel(order.work_type)} · {getPriorityLabel(order.priority)}</p></div><div><p className="text-xs text-muted-foreground">Responsable / fecha</p><p className="mt-1 text-sm">{order.assigned_to_name || 'Sin asignar'}</p><p className="text-xs text-muted-foreground">{order.scheduled_date ? new Date(order.scheduled_date).toLocaleDateString('es-CL') : 'Sin fecha'}</p></div><Button asChild variant="ghost" size="sm"><Link href={`/dashboard/mantenimiento/ordenes-trabajo/${order.id}`}><Eye className="mr-2 h-4 w-4" />Ver detalle</Link></Button></div>)}</div>}
      </CardContent></Card>
    </div>
  );
}
