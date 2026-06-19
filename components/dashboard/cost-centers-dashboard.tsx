'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, Database, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCostCenters } from '@/hooks/use-cost-centers';
import { getCostCenterRootCode, isRootCostCenter, sortCostCenters, type CostCenterRecord } from '@/lib/cost-centers';

type CostCenterGroup = {
  rootCode: string;
  rootName: string;
  items: CostCenterRecord[];
};

export function CostCentersDashboard() {
  const { costCenters, loading, error, reload } = useCostCenters();
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState('');

  const orderedCostCenters = sortCostCenters(costCenters);
  const groupedCenters = useMemo<CostCenterGroup[]>(() => {
    const groups = new Map<string, CostCenterGroup>();

    orderedCostCenters.forEach((center) => {
      const rootCode = isRootCostCenter(center.code) ? center.code : getCostCenterRootCode(center.code);
      const current = groups.get(rootCode);
      if (current) {
        current.items.push(center);
        return;
      }

      groups.set(rootCode, {
        rootCode,
        rootName: center.code === rootCode ? center.name : rootCode,
        items: [center],
      });
    });

    return Array.from(groups.values()).sort((a, b) => a.rootCode.localeCompare(b.rootCode, 'es', { numeric: true }));
  }, [orderedCostCenters]);

  const totalCenters = orderedCostCenters.length;
  const rootCount = orderedCostCenters.filter((center) => isRootCostCenter(center.code)).length;
  const activeCount = orderedCostCenters.filter((center) => center.status === 'active').length;

  const handleSeed = async () => {
    setSeeding(true);
    setSeedError('');
    try {
      const response = await fetch('/api/admin/seed-cost-centers', {
        method: 'POST',
        credentials: 'include',
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo cargar la base de referencia');
      }
      reload();
    } catch (err) {
      setSeedError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return <div className="py-10 text-center">Cargando centros de costos...</div>;
  }

  if (error && orderedCostCenters.length === 0) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="py-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">No pudimos cargar los centros de costo</h3>
              <p className="max-w-2xl text-sm text-muted-foreground">{error}</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button onClick={reload} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Reintentar
              </Button>
              <Button onClick={handleSeed} disabled={seeding}>
                <Database className="mr-2 h-4 w-4" />
                {seeding ? 'Cargando...' : 'Cargar base de referencia'}
              </Button>
            </div>
            {seedError ? <p className="text-sm text-destructive">{seedError}</p> : null}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (orderedCostCenters.length === 0) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="py-10">
          <div className="flex flex-col items-center gap-4 text-center">
            <Database className="h-12 w-12 text-muted-foreground" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">Todavia no hay centros de costo visibles</h3>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Puedes cargar la base de referencia para que la estructura aparezca en el dashboard y en los selectores de bodega.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button onClick={handleSeed} disabled={seeding}>
                <Database className="mr-2 h-4 w-4" />
                {seeding ? 'Cargando...' : 'Cargar base de referencia'}
              </Button>
              <Button variant="outline" onClick={reload}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Revisar de nuevo
              </Button>
            </div>
            {seedError ? <p className="text-sm text-destructive">{seedError}</p> : null}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleSeed} disabled={seeding} variant="outline" size="sm">
          <Database className="mr-2 h-4 w-4" />
          {seeding ? 'Actualizando...' : 'Actualizar base'}
        </Button>
        <Button onClick={reload} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Recargar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total centros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCenters}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Grupos principales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rootCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60">
        <CardHeader className="py-4">
          <CardTitle>Grupos de costos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {groupedCenters.map((group) => {
              const details = group.items.slice(1, 4);
              const extraCount = Math.max(0, group.items.length - 4);

              return (
                <details
                  key={group.rootCode}
                  className="group rounded-xl border border-border/60 bg-background/40 p-4 shadow-sm transition-colors open:bg-background"
                >
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold tracking-wide text-primary">{group.rootCode}</span>
                          <Badge variant="secondary" className="text-xs">
                            {group.items.length} centros
                          </Badge>
                        </div>
                        <h3 className="text-base font-semibold text-foreground">{group.rootName}</h3>
                      </div>
                    </div>
                  </summary>

                  <div className="mt-4 space-y-3 border-t border-border/50 pt-4 text-sm">
                    <div className="text-muted-foreground">
                      {details.length > 0 ? details.map((item) => `${item.code} ${item.name}`).join(' - ') : 'Centro principal'}
                      {extraCount > 0 ? ` - +${extraCount} mas` : ''}
                    </div>

                    <div className="space-y-2">
                      {group.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-muted/35 px-3 py-2">
                          <div className="min-w-0">
                            <div className="font-medium text-foreground">{item.code}</div>
                            <div className="truncate text-xs text-muted-foreground">{item.name}</div>
                          </div>
                          <Badge variant={item.status === 'active' ? 'default' : 'secondary'} className="shrink-0">
                            {item.status === 'active' ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
