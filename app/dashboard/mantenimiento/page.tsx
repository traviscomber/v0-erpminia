'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ArrowRight, ClipboardList, PackageCheck, Plus, RefreshCw, ShoppingCart, Wrench } from 'lucide-react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar las órdenes de trabajo.');
  return payload;
};

type FlowRow = {
  work_order_id: string;
  work_order_number: string;
  asset_code: string | null;
  asset_name: string | null;
  assigned_person_name: string | null;
  status: string | null;
  priority: string | null;
  flow_status: string;
  procurement_request_count: number;
  purchase_order_count: number;
  receipt_count: number;
  quantity_requested: number;
  quantity_issued: number;
  quantity_installed: number;
  labor_hours: number;
  total_cost: number;
  purchase_commitment: number;
};

type FlowResponse = {
  rows: FlowRow[];
  overview: {
    total: number;
    planned: number;
    in_progress: number;
    waiting_procurement: number;
    waiting_parts: number;
    missing_asset: number;
    missing_person: number;
    completed: number;
    totalCost: number;
    purchaseCommitment: number;
  };
};

const labels: Record<string, string> = {
  planned: 'Planificada',
  in_progress: 'En ejecución',
  waiting_procurement: 'Esperando compra',
  waiting_parts: 'Esperando repuestos',
  missing_asset: 'Sin equipo',
  missing_person: 'Sin responsable',
  completed: 'Completada',
};

const priorityLabels: Record<string, string> = {
  critical: 'Crítica',
  critica: 'Crítica',
  high: 'Alta',
  alta: 'Alta',
  medium: 'Media',
  media: 'Media',
  low: 'Baja',
  baja: 'Baja',
};

const money = (value: number) => new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
}).format(value || 0);

export default function MantenimientoPage() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<FlowResponse>(
    '/api/maintenance/work-order-flow?limit=200',
    fetcher,
    { revalidateOnFocus: false },
  );
  const rows = data?.rows || [];
  const overview = data?.overview;

  const metrics = [
    { label: 'Órdenes activas', value: overview ? overview.total - overview.completed : '—', detail: 'Trabajo aún no completado' },
    { label: 'Esperando abastecimiento', value: overview ? overview.waiting_procurement + overview.waiting_parts : '—', detail: 'Compras o repuestos pendientes' },
    { label: 'Costo ejecutado', value: overview ? money(overview.totalCost) : '—', detail: 'Costo registrado en órdenes' },
    { label: 'Compras comprometidas', value: overview ? money(overview.purchaseCommitment) : '—', detail: 'Órdenes de compra asociadas' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Mantenimiento</PageHeaderEyebrow>
          <PageHeaderTitle>Órdenes de trabajo</PageHeaderTitle>
          <PageHeaderDescription>
            Equipos, responsables, repuestos, compras, horas y costos reunidos en una sola vista de seguimiento.
          </PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button variant="outline" asChild>
            <Link href="/dashboard/mantenimiento/ejecucion-renovacion">Ejecución de renovación</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/mantenimiento/validacion-renovacion">Validación de renovación</Link>
          </Button>
          <Button variant="outline" onClick={() => void mutate()} disabled={isValidating}>
            <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button asChild>
            <Link href="/dashboard/mantenimiento/ordenes-trabajo/create">
              <Plus className="h-4 w-4" />
              Crear orden
            </Link>
          </Button>
        </PageHeaderActions>
      </PageHeader>

      <section aria-label="Resumen de mantenimiento" className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="bg-card px-5 py-5">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{metric.label}</p>
            <p className="mt-4 text-2xl font-semibold tracking-[-0.03em]">{isLoading ? '—' : metric.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p>
          </div>
        ))}
      </section>

      {error ? (
        <StatePanel
          tone="error"
          title="No fue posible cargar las órdenes de trabajo"
          description={error.message}
          actions={<Button variant="outline" onClick={() => void mutate()}>Reintentar</Button>}
          className="min-h-0 py-6"
        />
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Seguimiento de órdenes</CardTitle>
            <CardDescription>Estado, abastecimiento, ejecución y costo de cada trabajo.</CardDescription>
          </div>
          {!isLoading && !error ? <Badge variant="outline">{rows.length} registros</Badge> : null}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <StatePanel tone="loading" title="Cargando órdenes" className="min-h-64 border-0 bg-transparent" />
          ) : !error && rows.length === 0 ? (
            <StatePanel
              tone="neutral"
              title="No hay órdenes de trabajo"
              description="Crea una orden cuando exista un trabajo que planificar o ejecutar."
              actions={<Button asChild><Link href="/dashboard/mantenimiento/ordenes-trabajo/create"><Plus className="h-4 w-4" />Crear orden</Link></Button>}
              className="min-h-64 border-0 bg-transparent"
            />
          ) : !error ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Orden</TableHead>
                    <TableHead>Equipo</TableHead>
                    <TableHead>Responsable</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Abastecimiento</TableHead>
                    <TableHead>Ejecución</TableHead>
                    <TableHead className="text-right">Costo</TableHead>
                    <TableHead className="w-20 text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.work_order_id}>
                      <TableCell>
                        <p className="font-medium">{row.work_order_number}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {priorityLabels[String(row.priority || '').toLowerCase()] || 'Sin prioridad'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{row.asset_name || 'Equipo pendiente'}</p>
                        <p className="text-xs text-muted-foreground">{row.asset_code || 'Sin código'}</p>
                      </TableCell>
                      <TableCell>{row.assigned_person_name || 'Sin asignar'}</TableCell>
                      <TableCell>
                        <Badge variant={row.flow_status === 'completed' ? 'secondary' : row.flow_status.startsWith('missing') ? 'destructive' : 'outline'}>
                          {labels[row.flow_status] || 'Pendiente'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1" title="Órdenes de compra"><ShoppingCart className="h-3.5 w-3.5" />{row.purchase_order_count}</span>
                          <span className="inline-flex items-center gap-1" title="Recepciones"><PackageCheck className="h-3.5 w-3.5" />{row.receipt_count}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1" title="Repuestos instalados"><Wrench className="h-3.5 w-3.5" />{row.quantity_installed}/{row.quantity_requested}</span>
                          <span className="inline-flex items-center gap-1" title="Horas registradas"><ClipboardList className="h-3.5 w-3.5" />{Number(row.labor_hours || 0).toFixed(1)} h</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{money(Number(row.total_cost || 0))}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="icon-sm" aria-label={`Abrir orden ${row.work_order_number}`}>
                          <Link href={`/dashboard/mantenimiento/ordenes-trabajo/${row.work_order_id}`}><ArrowRight className="h-4 w-4" /></Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}