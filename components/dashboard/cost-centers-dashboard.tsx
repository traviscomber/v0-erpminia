'use client';

import { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronRight, Database, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCostCenters } from '@/hooks/use-cost-centers';
import { isRootCostCenter, sortCostCenters } from '@/lib/cost-centers';

interface ExpandedState {
  [key: string]: boolean;
}

export function CostCentersDashboard() {
  const { costCenters, loading, error, reload } = useCostCenters();
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState('');

  const orderedCostCenters = sortCostCenters(costCenters);
  const rootCount = orderedCostCenters.filter((center) => isRootCostCenter(center.code)).length;

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
                Puedes cargar la base de referencia desde el archivo del proyecto para que la estructura aparezca en el dashboard y en los selectores de bodega.
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
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total centros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orderedCostCenters.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Nivel 1 (raices)</CardTitle>
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
            <div className="text-2xl font-bold">{orderedCostCenters.filter((c) => c.status === 'active').length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Estructura jerarquica</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSeed} disabled={seeding} variant="outline" size="sm">
              <Database className="mr-2 h-4 w-4" />
              {seeding ? 'Sincronizando...' : 'Sincronizar base'}
            </Button>
            <Button onClick={reload} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refrescar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 text-sm">
            {orderedCostCenters.map((cc) => {
              const level = Math.max(0, cc.code.split('-').length - 1);
              const hasChildren = orderedCostCenters.some(
                (child) =>
                  child.id !== cc.id &&
                  child.code.startsWith(`${cc.code}-`) &&
                  child.code.split('-').length === level + 2
              );
              const isExpanded = expanded[cc.id];

              return (
                <div key={cc.id}>
                  <div className="flex items-center gap-2 rounded px-2 py-1 hover:bg-muted/40">
                    {hasChildren ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => setExpanded((prev) => ({ ...prev, [cc.id]: !prev[cc.id] }))}
                      >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    ) : (
                      <div className="w-6" />
                    )}
                    <div style={{ marginLeft: `${level * 20}px` }} className="flex-1">
                      <span className="font-semibold text-foreground">{cc.code}</span>
                      <span className="ml-2 text-muted-foreground">{cc.name}</span>
                    </div>
                    <Badge variant={cc.status === 'active' ? 'default' : 'secondary'}>
                      {cc.status === 'active' ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>

                  {isExpanded &&
                    orderedCostCenters.map(
                      (child) =>
                        child.code.startsWith(`${cc.code}-`) &&
                        child.code.split('-').length === level + 2 && (
                          <div key={child.id} className="pl-2">
                            <div className="flex items-center gap-2 rounded px-2 py-1 hover:bg-muted/40">
                              <div className="w-6" />
                              <div style={{ marginLeft: `${(level + 1) * 20}px` }} className="flex-1">
                                <span className="text-foreground/80">{child.code}</span>
                                <span className="ml-2 text-sm text-muted-foreground">{child.name}</span>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {child.status === 'active' ? 'Activo' : 'Inactivo'}
                              </Badge>
                            </div>
                          </div>
                        )
                    )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
