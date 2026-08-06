'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ArrowRight, PackageSearch } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar el seguimiento de compras');
  return payload;
};

type FlowItem = {
  pipeline_id: string;
  request_number?: string | null;
  current_stage?: string | null;
  next_action?: string | null;
  next_action_href?: string | null;
  blockers?: string[] | null;
  progress_percent?: number | null;
  order_number?: string | null;
  supplier_name?: string | null;
  required_date?: string | null;
};

export function WorkOrderPurchasingFlow({ workOrderId }: { workOrderId: string }) {
  const { data, error, isLoading } = useSWR<{ data?: FlowItem[] }>(
    workOrderId ? `/api/pipeline/operational?workOrderId=${encodeURIComponent(workOrderId)}&limit=20` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const items = data?.data || [];

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PackageSearch className="h-4 w-4" />
          Repuestos y compras relacionadas
        </CardTitle>
        <CardDescription>
          Solicitudes, compras y entregas vinculadas directamente con esta orden de trabajo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">Cargando seguimiento…</p> : null}
        {error ? <p className="text-sm text-destructive">No fue posible cargar las compras relacionadas.</p> : null}
        {!isLoading && !error && items.length === 0 ? (
          <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
            Esta orden no tiene solicitudes de compra relacionadas.
          </p>
        ) : null}

        <div className="divide-y">
          {items.map((item) => {
            const blockers = item.blockers || [];
            const progress = Math.max(0, Math.min(100, Number(item.progress_percent || 0)));
            return (
              <div key={item.pipeline_id} className="grid gap-4 py-4 lg:grid-cols-[minmax(0,1fr)_240px_150px] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{item.request_number || 'Solicitud relacionada'}</p>
                    <Badge variant="outline">{item.current_stage || 'En revisión'}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[item.order_number, item.supplier_name].filter(Boolean).join(' · ') || 'Compra aún no emitida'}
                  </p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-foreground" style={{ width: `${progress}%` }} />
                  </div>
                  <p className={`mt-2 text-xs ${blockers.length ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {blockers.length ? blockers[0] : 'Sin bloqueos registrados.'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Siguiente acción</p>
                  <p className="mt-1 text-sm font-medium">{item.next_action || 'Revisar estado'}</p>
                  {item.required_date ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Requerido: {new Date(item.required_date).toLocaleDateString('es-CL')}
                    </p>
                  ) : null}
                </div>
                <Button asChild variant="outline" className="w-full justify-between">
                  <Link href={item.next_action_href || '/dashboard/compras'}>
                    Abrir
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
