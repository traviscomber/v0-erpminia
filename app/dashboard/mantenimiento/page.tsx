'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { AlertTriangle, ArrowRight, ClipboardList, PackageCheck, ShoppingCart, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar el flujo');
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
  missing_asset: 'Sin activo',
  missing_person: 'Sin responsable',
  completed: 'Completada',
};

const money = (value: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value || 0);

export default function MantenimientoPage() {
  const { data, error, isLoading, mutate } = useSWR<FlowResponse>('/api/maintenance/work-order-flow?limit=200', fetcher);
  const rows = data?.rows || [];
  const overview = data?.overview;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b border-border/70 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Mantenimiento · Flujo operativo</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Órdenes de trabajo</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Una sola vista para activo, responsable, compras, recepción, repuestos, mano de obra, costos y cierre.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/mantenimiento/ordenes-trabajo/nueva">
            Nueva OT <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">OT activas</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{overview ? overview.total - overview.completed : '—'}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Esperando abastecimiento</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{overview ? overview.waiting_procurement + overview.waiting_parts : '—'}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Costo ejecutado</CardTitle></CardHeader><CardContent className="text-xl font-semibold">{overview ? money(overview.totalCost) : '—'}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Compromisos de compra</CardTitle></CardHeader><CardContent className="text-xl font-semibold">{overview ? money(overview.purchaseCommitment) : '—'}</CardContent></Card>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-center gap-2 text-sm text-destructive"><AlertTriangle className="h-4 w-4" /> No se pudo cargar el flujo de OT.</div>
          <Button variant="outline" size="sm" onClick={() => void mutate()}>Reintentar</Button>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Flujo central</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Cargando órdenes...</div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No hay órdenes de trabajo para mostrar.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>OT</TableHead><TableHead>Activo</TableHead><TableHead>Responsable</TableHead><TableHead>Flujo</TableHead><TableHead>Abastecimiento</TableHead><TableHead>Ejecución</TableHead><TableHead className="text-right">Costo</TableHead></TableRow></TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.work_order_id} className="cursor-pointer">
                      <TableCell><Link className="font-medium hover:underline" href={`/dashboard/mantenimiento/ordenes-trabajo/${row.work_order_id}`}>{row.work_order_number}</Link><div className="mt-1 text-xs text-muted-foreground">{row.priority || 'Sin prioridad'}</div></TableCell>
                      <TableCell><div className="font-medium">{row.asset_name || 'Activo pendiente'}</div><div className="text-xs text-muted-foreground">{row.asset_code || 'Sin código'}</div></TableCell>
                      <TableCell>{row.assigned_person_name || 'Sin asignar'}</TableCell>
                      <TableCell><Badge variant={row.flow_status === 'completed' ? 'secondary' : row.flow_status.startsWith('missing') ? 'destructive' : 'outline'}>{labels[row.flow_status] || row.flow_status}</Badge></TableCell>
                      <TableCell><div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><ShoppingCart className="h-3.5 w-3.5" />{row.purchase_order_count}</span><span className="inline-flex items-center gap-1"><PackageCheck className="h-3.5 w-3.5" />{row.receipt_count}</span></div></TableCell>
                      <TableCell><div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><Wrench className="h-3.5 w-3.5" />{row.quantity_installed}/{row.quantity_requested}</span><span className="inline-flex items-center gap-1"><ClipboardList className="h-3.5 w-3.5" />{Number(row.labor_hours || 0).toFixed(1)} h</span></div></TableCell>
                      <TableCell className="text-right font-medium">{money(Number(row.total_cost || 0))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
