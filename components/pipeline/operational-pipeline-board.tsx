'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type PipelineItem = {
  pipeline_id: string;
  request_number?: string | null;
  work_order_number?: string | null;
  work_order_title?: string | null;
  asset_code?: string | null;
  asset_name?: string | null;
  priority?: string | null;
  current_stage: string;
  next_action: string;
  next_action_href: string;
  blockers?: string[] | null;
  progress_percent: number;
  order_number?: string | null;
  supplier_name?: string | null;
};

type Response = { data?: PipelineItem[] };

const fetcher = async (url: string): Promise<Response> => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar el pipeline');
  return payload;
};

export function OperationalPipelineBoard() {
  const { data, error, isLoading } = useSWR<Response>('/api/pipeline/operational?limit=20', fetcher, {
    revalidateOnFocus: false,
  });

  const items = data?.data || [];

  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Pipeline operacional</CardTitle>
        <p className="text-sm text-muted-foreground">Cada caso muestra una sola acción siguiente y únicamente bloqueos verificables.</p>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">Cargando pipeline...</p> : null}
        {error ? <p className="text-sm text-destructive">No fue posible cargar el pipeline.</p> : null}
        {!isLoading && !error && !items.length ? (
          <p className="rounded-md border border-dashed p-5 text-center text-sm text-muted-foreground">No hay casos operativos abiertos.</p>
        ) : null}
        <div className="divide-y">
          {items.map((item) => {
            const blockers = item.blockers || [];
            return (
              <div key={item.pipeline_id} className="grid gap-3 py-4 lg:grid-cols-[minmax(0,1fr)_180px_220px] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{item.request_number || item.work_order_number || 'Pipeline'}</p>
                    <Badge variant="outline">{item.current_stage}</Badge>
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {[item.work_order_title, item.asset_code, item.asset_name].filter(Boolean).join(' · ') || 'Sin contexto adicional'}
                  </p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-foreground" style={{ width: `${Math.max(0, Math.min(100, item.progress_percent || 0))}%` }} />
                  </div>
                  {blockers.length ? (
                    <p className="mt-2 text-xs text-destructive">{blockers[0]}{blockers.length > 1 ? ` · +${blockers.length - 1}` : ''}</p>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">Sin bloqueos.</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Siguiente acción</p>
                  <p className="mt-1 text-sm font-medium">{item.next_action}</p>
                </div>
                <Button asChild className="w-full justify-between">
                  <Link href={item.next_action_href || '/dashboard/compras'}>
                    Continuar
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
