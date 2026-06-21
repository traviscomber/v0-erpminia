'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, Database, Layers3, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCostCenters } from '@/hooks/use-cost-centers';
import {
  formatCostCenterLabel,
  getCostCenterPriority,
  getCostCenterRootCode,
  isRootCostCenter,
  isVisibleCostCenter,
  sortCostCenters,
  type CostCenterRecord,
} from '@/lib/cost-centers';

type CostCenterGroup = {
  rootCode: string;
  rootName: string;
  items: CostCenterRecord[];
};

function prettifyText(value: string) {
  return value
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;
      if (/^[A-Z0-9]{2,}$/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

function normalizeName(value: string) {
  return prettifyText(String(value || '').replace(/\s+/g, ' ').trim());
}

export function CostCentersDashboard() {
  const { costCenters, loading, error, reload } = useCostCenters();
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const visibleCostCenters = useMemo(
    () => sortCostCenters(costCenters.filter((center) => isVisibleCostCenter(center.code))),
    [costCenters],
  );

  const groupedCenters = useMemo<CostCenterGroup[]>(() => {
    const groups = new Map<string, CostCenterGroup>();

    visibleCostCenters.forEach((center) => {
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

    return Array.from(groups.values()).sort((a, b) => getCostCenterPriority(a.rootCode) - getCostCenterPriority(b.rootCode));
  }, [visibleCostCenters]);

  const totalCenters = visibleCostCenters.length;
  const rootCount = groupedCenters.length;
  const activeCount = visibleCostCenters.filter((center) => center.status === 'active').length;
  const leafCount = visibleCostCenters.filter((center) => !isRootCostCenter(center.code)).length;
  const allExpanded = groupedCenters.length > 0 && groupedCenters.every((group) => expandedGroups[group.rootCode]);

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

  const toggleGroup = (rootCode: string) => {
    setExpandedGroups((current) => ({
      ...current,
      [rootCode]: !current[rootCode],
    }));
  };

  const setAllExpanded = (expanded: boolean) => {
    setExpandedGroups(
      groupedCenters.reduce<Record<string, boolean>>((acc, group) => {
        acc[group.rootCode] = expanded;
        return acc;
      }, {}),
    );
  };

  if (loading) {
    return <div className="py-10 text-center">Cargando centros de costos...</div>;
  }

  if (error && visibleCostCenters.length === 0) {
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

  if (visibleCostCenters.length === 0) {
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
        <Button onClick={() => setAllExpanded(!allExpanded)} variant="outline" size="sm">
          {allExpanded ? 'Contraer todo' : 'Expandir todo'}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Subcentros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leafCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60">
        <CardHeader className="py-4">
          <CardTitle className="flex items-center gap-2">
            <Layers3 className="h-5 w-5 text-primary" />
            Estructura simple
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {groupedCenters.map((group) => {
              const children = group.items.filter((item) => item.code !== group.rootCode);
              const isExpanded = Boolean(expandedGroups[group.rootCode]);
              const previewChildren = children.slice(0, 4);
              const extraCount = Math.max(0, children.length - previewChildren.length);
              const rootLabel = formatCostCenterLabel({
                code: group.rootCode,
                name: normalizeName(group.rootName),
              });

              return (
                <div key={group.rootCode} className="rounded-xl border border-border/60 bg-background/40 p-4 shadow-sm">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.rootCode)}
                    className="flex w-full items-start justify-between gap-3 text-left transition-colors hover:text-primary"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold tracking-wide text-primary">{group.rootCode}</span>
                        <Badge variant="secondary" className="text-xs">
                          {group.items.length} centros
                        </Badge>
                      </div>
                      <h3 className="text-base font-semibold text-foreground">{rootLabel}</h3>
                    </div>
                    <span className="mt-1 rounded-full border border-border/60 p-1 text-muted-foreground">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </span>
                  </button>

                  <div className="mt-4 space-y-3 border-t border-border/50 pt-4 text-sm">
                    <div className="flex flex-wrap gap-2">
                      {isExpanded ? (
                        group.items.map((item) => (
                          <Badge key={item.id} variant={item.code === group.rootCode ? 'default' : 'outline'} className="max-w-full truncate">
                            {item.code} {normalizeName(item.name)}
                          </Badge>
                        ))
                      ) : previewChildren.length > 0 ? (
                        previewChildren.map((item) => (
                          <Badge key={item.id} variant="outline" className="max-w-full truncate">
                            {item.code} {normalizeName(item.name)}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground">Centro principal</span>
                      )}
                      {!isExpanded && extraCount > 0 ? <span className="text-muted-foreground">+{extraCount} mas</span> : null}
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{children.length} subcentros</span>
                      <span>{group.items.filter((item) => item.status === 'active').length} activos</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
