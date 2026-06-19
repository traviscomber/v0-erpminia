'use client';

import { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronRight, Database, RefreshCw } from 'lucide-react';
import { useCostCenters } from '@/hooks/use-cost-centers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ExpandedState {
  [key: string]: boolean;
}

interface CostCenterRow {
  id: string;
  code: string;
  name: string;
  status: 'active' | 'inactive';
}

export function CostCentersDashboard() {
  const { costCenters, loading, error, reload } = useCostCenters();
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState('');

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

  const hierarchy = buildHierarchy(costCenters);
  const hasData = hierarchy.length > 0;

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (error && !hasData) {
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

  if (!hasData) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="py-10">
          <div className="flex flex-col items-center gap-4 text-center">
            <Database className="h-12 w-12 text-muted-foreground" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">Todavía no hay centros de costo visibles</h3>
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
            <div className="text-2xl font-bold">{costCenters.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Nivel 1 (raíces)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hierarchy.filter((h) => !h.code.includes('-')).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{costCenters.filter((c) => c.status === 'active').length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Estructura jerárquica</CardTitle>
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
          <div className="space-y-1 font-mono text-sm">
            {hierarchy.map((cc) => {
              const level = (cc.code.match(/-/g) || []).length;
              const hasChildren = hierarchy.some(
                (child) =>
                  child.code.startsWith(`${cc.code}-`) &&
                  (child.code.match(/-/g) || []).length === level + 1
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
                        onClick={() => toggleExpand(cc.id)}
                      >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    ) : (
                      <div className="w-6" />
                    )}
                    <div style={{ marginLeft: `${level * 20}px` }} className="flex-1">
                      <span className="font-semibold">{cc.code}</span>
                      <span className="ml-2 text-muted-foreground">{cc.name}</span>
                    </div>
                    <Badge variant={cc.status === 'active' ? 'default' : 'secondary'}>
                      {cc.status === 'active' ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>

                  {isExpanded &&
                    hierarchy.map(
                      (child) =>
                        child.code.startsWith(`${cc.code}-`) &&
                        (child.code.match(/-/g) || []).length === level + 1 && (
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

function buildHierarchy(costCenters: CostCenterRow[]) {
  const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

  return [...costCenters].sort((a, b) => {
    const aDepth = (String(a.code || '').match(/-/g) || []).length;
    const bDepth = (String(b.code || '').match(/-/g) || []).length;

    if (aDepth !== bDepth) return aDepth - bDepth;
    return collator.compare(String(a.code || ''), String(b.code || ''));
  });
}
