'use client';

import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';
import { AlertTriangle, ArrowRight, CheckCircle2, ShoppingCart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudieron cargar las necesidades');
  return payload;
};

type MaterialRow = {
  canonical_product_id?: string | null;
  product_code?: string | null;
  product_name?: string | null;
  unit?: string | null;
  quantity_required?: number | string | null;
  quantity_available?: number | string | null;
  quantity_shortage?: number | string | null;
};

type NeedRow = {
  supply_need_id: string;
  work_order_id: string;
  work_order_number?: string | null;
  title?: string | null;
  asset_code?: string | null;
  asset_name?: string | null;
  priority?: string | null;
  required_date?: string | null;
  shortage_lines?: number | string | null;
  total_shortage_units?: number | string | null;
  materials?: MaterialRow[] | null;
};

export function OpenSupplyNeeds() {
  const { data, error, isLoading, mutate } = useSWR('/api/procurement/supply-needs', fetcher);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [created, setCreated] = useState<Record<string, string>>({});
  const needs: NeedRow[] = data?.needs || [];

  const createIntake = async (need: NeedRow) => {
    setBusyId(need.supply_need_id);
    setActionError(null);
    try {
      const response = await fetch('/api/procurement/supply-needs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ supplyNeedId: need.supply_need_id }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No se pudo crear la solicitud operativa');
      setCreated((current) => ({ ...current, [need.supply_need_id]: payload?.intake?.request_number || 'Solicitud creada' }));
      await mutate();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo crear la solicitud operativa');
    } finally {
      setBusyId(null);
    }
  };

  if (!isLoading && !error && needs.length === 0) return null;

  return (
    <Card className="shadow-none">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Necesidades desde mantenimiento</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Convierte faltantes reales de OT en solicitudes operativas, sin duplicar datos.</p>
        </div>
        <Badge variant={needs.length ? 'destructive' : 'secondary'}>{needs.length} abierta(s)</Badge>
      </CardHeader>
      <CardContent>
        {isLoading ? <div className="h-20 animate-pulse rounded-lg bg-muted" /> : null}
        {error ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error.message}</div> : null}
        {actionError ? <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{actionError}</div> : null}
        {needs.length ? (
          <div className="divide-y rounded-lg border">
            {needs.slice(0, 8).map((need) => {
              const materials = Array.isArray(need.materials) ? need.materials.filter((item) => Number(item.quantity_shortage || 0) > 0) : [];
              const createdNumber = created[need.supply_need_id];
              return (
                <div key={need.supply_need_id} className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_150px_auto] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <p className="truncate font-medium">{need.work_order_number || 'OT'} · {need.title || 'Sin título'}</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{need.asset_code || 'Sin código'} · {need.asset_name || 'Sin activo'} · {materials.length || Number(need.shortage_lines || 0)} producto(s)</p>
                    {materials.length ? <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{materials.slice(0, 3).map((item) => `${item.product_code || ''} ${item.product_name || ''}: ${Number(item.quantity_shortage || 0)} ${item.unit || 'un.'}`).join(' · ')}</p> : null}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Faltante total</p>
                    <p className="font-semibold text-destructive">{Number(need.total_shortage_units || 0)} unidades</p>
                    <p className="text-xs text-muted-foreground">Prioridad {need.priority || 'media'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Button asChild size="sm" variant="ghost"><Link href={`/dashboard/mantenimiento/ordenes-trabajo/${need.work_order_id}`}>Ver OT <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
                    {createdNumber ? (
                      <Badge className="h-9 px-3"><CheckCircle2 className="mr-2 h-4 w-4" />{createdNumber}</Badge>
                    ) : (
                      <Button size="sm" onClick={() => void createIntake(need)} disabled={busyId === need.supply_need_id}>
                        <ShoppingCart className="mr-2 h-4 w-4" />Crear solicitud
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
