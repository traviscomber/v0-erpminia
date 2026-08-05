'use client';

import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';
import { AlertTriangle, Building2, Search, WalletCards } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type FinanceOverview = {
  active_cost_centers?: number;
  cost_centers_with_activity?: number;
  total_budget?: number;
  total_operational_cost?: number;
  total_purchase_commitments?: number;
  over_budget_centers?: number;
  warning_centers?: number;
};

type CostCenterRow = {
  canonical_cost_center_id: string;
  cost_center_code: string;
  name: string;
  full_path: string | null;
  budget_annual: number;
  operational_cost: number;
  purchase_commitments: number;
  budget_available: number;
  budget_usage_pct: number | null;
  transaction_count: number;
  purchase_order_count: number;
  work_order_count: number;
  financial_status: 'healthy' | 'warning' | 'over_budget' | 'inactive';
};

type FinanceResponse = { overview?: FinanceOverview; costCenters?: CostCenterRow[] };

const fetcher = async (url: string): Promise<FinanceResponse> => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar finanzas');
  return payload;
};

const money = (value: unknown) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(value || 0));
const number = (value: unknown) => new Intl.NumberFormat('es-CL').format(Number(value || 0));

const statusLabel: Record<CostCenterRow['financial_status'], string> = {
  healthy: 'Saludable',
  warning: 'Atención',
  over_budget: 'Sobre presupuesto',
  inactive: 'Sin actividad',
};

export default function FinanzasPage() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const params = new URLSearchParams();
  if (query.trim()) params.set('q', query.trim());
  if (status !== 'all') params.set('status', status);

  const { data, error, isLoading } = useSWR<FinanceResponse>(`/api/finance/intelligence?${params.toString()}`, fetcher);
  const overview = data?.overview || {};
  const centers = data?.costCenters || [];

  return (
    <div className="space-y-6">
      <section className="border-b border-border/70 pb-6">
        <p className="text-sm font-medium text-muted-foreground">Finanzas · Control operativo</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Centros de costo</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Presupuesto, gasto real, compromisos de compra, OT y activos reunidos en una sola trazabilidad financiera.
        </p>
      </section>

      {error ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error.message}</div> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="shadow-none"><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">Presupuesto activo</p><p className="mt-1 text-2xl font-semibold">{money(overview.total_budget)}</p></div><WalletCards className="h-5 w-5 text-muted-foreground" /></CardContent></Card>
        <Card className="shadow-none"><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">Gasto operativo</p><p className="mt-1 text-2xl font-semibold">{money(overview.total_operational_cost)}</p></div><Building2 className="h-5 w-5 text-muted-foreground" /></CardContent></Card>
        <Card className="shadow-none"><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">Compromisos OC</p><p className="mt-1 text-2xl font-semibold">{money(overview.total_purchase_commitments)}</p></div><WalletCards className="h-5 w-5 text-muted-foreground" /></CardContent></Card>
        <Card className="shadow-none"><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">Centros con alerta</p><p className="mt-1 text-2xl font-semibold">{number(Number(overview.over_budget_centers || 0) + Number(overview.warning_centers || 0))}</p></div><AlertTriangle className="h-5 w-5 text-muted-foreground" /></CardContent></Card>
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar código, centro o ruta" /></div>
          <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-full lg:w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos los estados</SelectItem><SelectItem value="healthy">Saludable</SelectItem><SelectItem value="warning">Atención</SelectItem><SelectItem value="over_budget">Sobre presupuesto</SelectItem><SelectItem value="inactive">Sin actividad</SelectItem></SelectContent></Select>
        </div>

        <div className="overflow-hidden rounded-lg border">
          <div className="hidden grid-cols-[120px_1fr_150px_150px_150px_120px] gap-4 border-b bg-muted/40 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground lg:grid">
            <span>Código</span><span>Centro</span><span>Presupuesto</span><span>Gasto real</span><span>Compromisos</span><span>Estado</span>
          </div>
          {isLoading ? <p className="p-6 text-sm text-muted-foreground">Cargando control financiero...</p> : null}
          {!isLoading && !centers.length ? <p className="p-8 text-center text-sm text-muted-foreground">No hay centros para los filtros seleccionados.</p> : null}
          {centers.map((row) => (
            <Link key={row.canonical_cost_center_id} href={`/dashboard/finanzas/centros/${row.canonical_cost_center_id}`} className="grid gap-2 border-b px-4 py-4 transition-colors last:border-0 hover:bg-muted/40 lg:grid-cols-[120px_1fr_150px_150px_150px_120px] lg:items-center lg:gap-4">
              <p className="font-mono text-sm">{row.cost_center_code}</p>
              <div><p className="font-medium">{row.name}</p><p className="text-xs text-muted-foreground">{row.transaction_count} movimientos · {row.purchase_order_count} OC · {row.work_order_count} OT</p></div>
              <p className="text-sm"><span className="lg:hidden text-muted-foreground">Presupuesto: </span>{money(row.budget_annual)}</p>
              <p className="text-sm font-medium"><span className="lg:hidden text-muted-foreground">Gasto: </span>{money(row.operational_cost)}</p>
              <p className="text-sm"><span className="lg:hidden text-muted-foreground">Compromisos: </span>{money(row.purchase_commitments)}</p>
              <Badge variant={row.financial_status === 'healthy' ? 'secondary' : 'outline'}>{statusLabel[row.financial_status]}</Badge>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
