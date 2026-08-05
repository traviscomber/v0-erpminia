'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { ArrowLeft, Building2, ShoppingCart, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type CostCenter = {
  cost_center_code: string;
  name: string;
  full_path: string | null;
  budget_annual: number;
  actual_cost: number;
  work_order_cost: number;
  operational_cost: number;
  purchase_commitments: number;
  budget_available: number;
  budget_usage_pct: number | null;
  financial_status: string;
};

type ActualCost = { id: number; transaction_date: string; asset_code: string | null; asset_name: string | null; category: string | null; document_number: string | null; description: string | null; total_cost: number; currency: string | null };
type PurchaseOrder = { id: string; order_number: string; order_date: string; supplier_name: string | null; total_amount: number; currency: string | null; operational_status: string | null; status: string | null };
type WorkOrder = { id: string; work_order_number: string; title: string; status: string; priority: string; scheduled_date: string | null; assigned_to_name: string | null };
type Asset = { id: string; asset_code: string; name: string; category: string | null; status: string | null };
type Response = { costCenter: CostCenter; actualCosts: ActualCost[]; purchaseOrders: PurchaseOrder[]; workOrders: WorkOrder[]; assets: Asset[] };

const fetcher = async (url: string): Promise<Response> => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar el centro de costo');
  return payload;
};

const money = (value: unknown) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(value || 0));
const date = (value: string | null | undefined) => value ? new Intl.DateTimeFormat('es-CL').format(new Date(value)) : '—';

export default function CostCenterProfilePage() {
  const params = useParams<{ id: string }>();
  const { data, error, isLoading } = useSWR<Response>(params.id ? `/api/finance/cost-centers/${params.id}` : null, fetcher);

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Cargando trazabilidad financiera...</p>;
  if (error) return <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error.message}</div>;
  if (!data) return null;

  const center = data.costCenter;

  return (
    <div className="space-y-6">
      <section className="border-b border-border/70 pb-6">
        <Button asChild variant="ghost" size="sm" className="mb-3 -ml-3"><Link href="/dashboard/finanzas"><ArrowLeft className="mr-2 h-4 w-4" />Volver a centros de costo</Link></Button>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="font-mono text-sm text-muted-foreground">{center.cost_center_code}</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">{center.name}</h1><p className="mt-2 text-sm text-muted-foreground">{center.full_path || 'Centro de costo canónico'}</p></div>
          <Badge variant="outline">{center.financial_status}</Badge>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="shadow-none"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Presupuesto</p><p className="mt-1 text-2xl font-semibold">{money(center.budget_annual)}</p></CardContent></Card>
        <Card className="shadow-none"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Gasto real</p><p className="mt-1 text-2xl font-semibold">{money(center.operational_cost)}</p></CardContent></Card>
        <Card className="shadow-none"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Compromisos OC</p><p className="mt-1 text-2xl font-semibold">{money(center.purchase_commitments)}</p></CardContent></Card>
        <Card className="shadow-none"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Disponible</p><p className="mt-1 text-2xl font-semibold">{money(center.budget_available)}</p></CardContent></Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="shadow-none"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4" />Movimientos reales</CardTitle></CardHeader><CardContent className="space-y-3">{data.actualCosts.length ? data.actualCosts.map((row) => <div key={row.id} className="flex items-start justify-between gap-4 border-b pb-3 last:border-0"><div><p className="text-sm font-medium">{row.description || row.category || 'Movimiento'}</p><p className="text-xs text-muted-foreground">{date(row.transaction_date)} · {row.asset_code || row.document_number || 'Sin referencia'}</p></div><p className="text-sm font-medium">{money(row.total_cost)}</p></div>) : <p className="text-sm text-muted-foreground">Sin movimientos reales asociados.</p>}</CardContent></Card>

        <Card className="shadow-none"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShoppingCart className="h-4 w-4" />Órdenes de compra</CardTitle></CardHeader><CardContent className="space-y-3">{data.purchaseOrders.length ? data.purchaseOrders.map((row) => <div key={row.id} className="flex items-start justify-between gap-4 border-b pb-3 last:border-0"><div><p className="text-sm font-medium">{row.order_number}</p><p className="text-xs text-muted-foreground">{row.supplier_name || 'Sin proveedor'} · {date(row.order_date)}</p></div><p className="text-sm font-medium">{money(row.total_amount)}</p></div>) : <p className="text-sm text-muted-foreground">Sin compromisos de compra asociados.</p>}</CardContent></Card>

        <Card className="shadow-none"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Wrench className="h-4 w-4" />Órdenes de trabajo</CardTitle></CardHeader><CardContent className="space-y-3">{data.workOrders.length ? data.workOrders.map((row) => <Link key={row.id} href={`/dashboard/mantenimiento/ordenes/${row.id}`} className="block border-b pb-3 last:border-0 hover:text-primary"><p className="text-sm font-medium">{row.work_order_number} · {row.title}</p><p className="text-xs text-muted-foreground">{row.status} · {row.assigned_to_name || 'Sin responsable'}</p></Link>) : <p className="text-sm text-muted-foreground">Sin OT asociadas.</p>}</CardContent></Card>

        <Card className="shadow-none"><CardHeader><CardTitle className="text-base">Activos relacionados</CardTitle></CardHeader><CardContent className="space-y-3">{data.assets.length ? data.assets.map((row) => <Link key={row.id} href={`/dashboard/mantenimiento/equipos/${row.id}`} className="block border-b pb-3 last:border-0 hover:text-primary"><p className="text-sm font-medium">{row.asset_code} · {row.name}</p><p className="text-xs text-muted-foreground">{row.category || 'Activo'} · {row.status || 'Sin estado'}</p></Link>) : <p className="text-sm text-muted-foreground">Sin activos vinculados mediante OT.</p>}</CardContent></Card>
      </div>
    </div>
  );
}
