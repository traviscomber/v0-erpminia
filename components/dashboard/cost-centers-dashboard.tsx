'use client';

import { useMemo, useRef, useState, type DragEvent } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Database,
  Layers3,
  Loader2,
  RefreshCw,
  Upload,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  repairCostCenterText,
  sortCostCenters,
  type CostCenterRecord,
} from '@/lib/cost-centers';

type CostCenterGroup = {
  rootCode: string;
  rootName: string;
  items: CostCenterRecord[];
};

type ImportResult = {
  success: boolean;
  message: string;
  imported?: number;
  updated?: number;
  error?: string;
};

export function CostCentersDashboard() {
  const { costCenters, loading, error, reload } = useCostCenters();
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImportFile = async (file: File) => {
    const name = file.name.toLowerCase();
    const valid = name.endsWith('.csv') || name.endsWith('.xls') || name.endsWith('.xlsx');

    if (!valid) {
      setImportResult({
        success: false,
        message: 'Solo aceptamos archivos CSV, XLS o XLSX',
        error: 'Tipo de archivo no valido',
      });
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/import-cost-centers', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setImportResult({
          success: false,
          message: 'No se pudo importar la base de centros de costo',
          error: payload.error || 'Error desconocido',
        });
        return;
      }

      setImportResult({
        success: true,
        message: payload.message || 'Centros de costo importados correctamente',
        imported: payload.imported,
        updated: payload.updated,
      });
      reload();
    } catch (err) {
      setImportResult({
        success: false,
        message: 'Error al subir el archivo',
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleImportDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImportFile(file);
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
              <h3 className="text-lg font-semibold text-foreground">No pudimos cargar los centros de costos</h3>
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
              <h3 className="text-lg font-semibold text-foreground">Todavia no hay centros de costos visibles</h3>
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
      <Card className="border-[var(--secondary)]/25 bg-[var(--secondary)]/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-5 w-5" />
            Importar centros de costo desde Excel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onDragEnter={handleImportDrag}
            onDragLeave={handleImportDrag}
            onDragOver={handleImportDrag}
            onDrop={handleImportDrop}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="font-semibold text-foreground">Arrastra tu archivo o haz clic para seleccionar</p>
            <p className="mt-1 text-sm text-muted-foreground">Formato: CSV, XLS o XLSX</p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xls,.xlsx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportFile(file);
              }}
              className="hidden"
            />
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="mb-2 font-semibold">Columnas sugeridas:</p>
              <div className="rounded bg-muted p-2 font-mono text-sm">
                CODE | NAME | DESCRIPTION | STATUS | CREATED_AT | UPDATED_AT
              </div>
            </AlertDescription>
          </Alert>

          {importResult && (
            <Alert className={importResult.success ? 'border-green-500' : 'border-red-500'}>
              {importResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription>
                <p className={importResult.success ? 'font-semibold text-green-900' : 'font-semibold text-red-900'}>
                  {importResult.message}
                </p>
                {importResult.imported !== undefined ? <p className="mt-1 text-sm">Importados: {importResult.imported}</p> : null}
                {importResult.updated !== undefined ? <p className="text-sm">Actualizados: {importResult.updated}</p> : null}
                {importResult.error ? <p className="mt-1 text-sm text-red-700">{importResult.error}</p> : null}
              </AlertDescription>
            </Alert>
          )}

          {isImporting && (
            <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Procesando archivo...
            </div>
          )}
        </CardContent>
      </Card>

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

      {seedError ? (
        <Alert className="border-red-500">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">{seedError}</AlertDescription>
        </Alert>
      ) : null}

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
                name: repairCostCenterText(group.rootName),
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
                      <p className="text-xs text-muted-foreground">
                        {isExpanded ? 'Pulsa para ocultar los centros incluidos' : 'Pulsa para ver todos los centros incluidos'}
                      </p>
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
                            {item.code} {repairCostCenterText(item.name)}
                          </Badge>
                        ))
                      ) : previewChildren.length > 0 ? (
                        previewChildren.map((item) => (
                          <Badge key={item.id} variant="outline" className="max-w-full truncate">
                            {item.code} {repairCostCenterText(item.name)}
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