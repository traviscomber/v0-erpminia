'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { AlertTriangle, CheckCircle2, PackageCheck, PackageSearch } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la cobertura de materiales');
  return payload;
};

type MaterialRow = {
  id: string;
  product_code?: string | null;
  product_name?: string | null;
  unit?: string | null;
  quantity_required?: number | string | null;
  quantity_available?: number | string | null;
  quantity_shortage?: number | string | null;
  status?: string | null;
};

export function WorkOrderMaterialCoverage({ workOrderId }: { workOrderId: string }) {
  const { data, error, isLoading, mutate } = useSWR(`/api/maintenance/work-orders/${workOrderId}/materials`, fetcher);
  const [issuing, setIssuing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const rows: MaterialRow[] = data?.materials || data?.requirements || [];
  const shortageCount = rows.filter((row) => Number(row.quantity_shortage || 0) > 0).length;
  const availableCount = rows.filter((row) => Number(row.quantity_available || 0) > 0).length;

  const issueAvailable = async () => {
    setIssuing(true);
    setActionError(null);
    try {
      const response = await fetch(`/api/maintenance/work-orders/${workOrderId}/issue-materials`, { method: 'POST', credentials: 'include' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No se pudieron entregar los materiales');
      await mutate();
    } catch (issueError) {
      setActionError(issueError instanceof Error ? issueError.message : 'No se pudieron entregar los materiales');
    } finally {
      setIssuing(false);
    }
  };

  return (
    <Card className="shadow-none">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Cobertura de materiales</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Requerimiento, stock disponible y faltante para esta OT.</p>
        </div>
        <div className="flex items-center gap-2">
          {availableCount > 0 ? <Button size="sm" variant="outline" onClick={issueAvailable} disabled={issuing}><PackageCheck className="mr-2 h-4 w-4" />{issuing ? 'Entregando…' : 'Entregar disponibles'}</Button> : null}
          <Badge variant={shortageCount > 0 ? 'destructive' : 'secondary'}>{shortageCount > 0 ? `${shortageCount} faltante(s)` : 'Cubierta'}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {actionError ? <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{actionError}</div> : null}
        {isLoading ? <div className="h-20 animate-pulse rounded-lg bg-muted" /> : null}
        {error ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error.message}</div> : null}
        {!isLoading && !error && rows.length === 0 ? <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground"><PackageSearch className="mx-auto mb-2 h-5 w-5" />Aún no se han definido materiales requeridos para esta OT.</div> : null}
        {rows.length > 0 ? <div className="divide-y rounded-lg border">{rows.map((row) => {
          const shortage = Number(row.quantity_shortage || 0);
          return <div key={row.id} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_110px_110px_120px] sm:items-center">
            <div className="min-w-0"><p className="truncate font-medium">{row.product_name || 'Producto'}</p><p className="text-xs text-muted-foreground">{row.product_code || 'Sin código'} · {row.unit || 'unidad'}</p></div>
            <div><p className="text-xs text-muted-foreground">Requerido</p><p className="font-medium">{Number(row.quantity_required || 0)}</p></div>
            <div><p className="text-xs text-muted-foreground">Disponible</p><p className="font-medium">{Number(row.quantity_available || 0)}</p></div>
            <div className="flex items-center justify-between gap-2 sm:justify-end">{shortage > 0 ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <CheckCircle2 className="h-4 w-4 text-muted-foreground" />}<span className={shortage > 0 ? 'font-semibold text-destructive' : 'font-medium'}>{shortage > 0 ? `Faltan ${shortage}` : 'Cubierto'}</span></div>
          </div>;
        })}</div> : null}
      </CardContent>
    </Card>
  );
}
