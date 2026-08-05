'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudieron cargar las necesidades');
  return payload;
};

type NeedRow = {
  id: string;
  work_order_id: string;
  quantity_shortage: number | string;
  priority?: string | null;
  required_date?: string | null;
  maintenance_work_orders?: { work_order_number?: string | null; title?: string | null } | null;
  canonical_product?: { product_code?: string | null; name?: string | null; unit?: string | null } | null;
};

export function OpenSupplyNeeds() {
  const { data, error, isLoading } = useSWR('/api/procurement/supply-needs', fetcher);
  const needs: NeedRow[] = data?.needs || [];

  if (!isLoading && !error && needs.length === 0) return null;

  return (
    <Card className="shadow-none">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Necesidades desde mantenimiento</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Faltantes reales detectados en OT que requieren gestión de abastecimiento.</p>
        </div>
        <Badge variant={needs.length ? 'destructive' : 'secondary'}>{needs.length} abierta(s)</Badge>
      </CardHeader>
      <CardContent>
        {isLoading ? <div className="h-20 animate-pulse rounded-lg bg-muted" /> : null}
        {error ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error.message}</div> : null}
        {needs.length ? (
          <div className="divide-y rounded-lg border">
            {needs.slice(0, 8).map((need) => (
              <div key={need.id} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_130px_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /><p className="truncate font-medium">{need.canonical_product?.name || 'Producto'}</p></div>
                  <p className="mt-1 text-xs text-muted-foreground">{need.canonical_product?.product_code || 'Sin código'} · {need.maintenance_work_orders?.work_order_number || 'OT'} · {need.maintenance_work_orders?.title || 'Sin título'}</p>
                </div>
                <div><p className="text-xs text-muted-foreground">Faltante</p><p className="font-semibold text-destructive">{Number(need.quantity_shortage || 0)} {need.canonical_product?.unit || 'un.'}</p></div>
                <Button asChild size="sm" variant="outline"><Link href={`/dashboard/mantenimiento/ordenes-trabajo/${need.work_order_id}`}>Ver OT <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
