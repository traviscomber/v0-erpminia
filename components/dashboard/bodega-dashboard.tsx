'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Boxes, ChevronLeft, ChevronRight, Layers3, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useBodegaCategories, useBodegaInventory } from '@/hooks/use-module-apis';
import { CategoryFilter } from './category-filter';
import { canonicalCategory } from '@/lib/bodega-normalization';

function splitHierarchy(description?: string) {
  const parts = String(description ?? '')
    .split(' - ')
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    subfamily: parts[0] || '',
    team: parts[1] || '',
  };
}

function prettifyLabel(value: string) {
  if (!value) return '-';

  return value
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;
      if (/^[A-Z0-9]{2,}$/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function BodegaDashboard() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const { inventory, pagination, isLoading, error, mutate } = useBodegaInventory(page, pageSize, search, category);
  const { categories } = useBodegaCategories();

  const normalizedInventory = useMemo(
    () =>
      inventory.map((item) => ({
        ...item,
        categoryLabel: canonicalCategory(item.category) || 'Sin categoria',
      })),
    [inventory],
  );

  const lowStock = normalizedInventory.filter((item) => item.quantity <= item.min_stock);
  const totalValue = normalizedInventory.reduce((sum, item) => sum + item.quantity * (item.unit_cost || 0), 0);
  const familyCount = new Set(normalizedInventory.map((item) => item.categoryLabel).filter(Boolean)).size;
  const subfamilyCount = new Set(normalizedInventory.map((item) => splitHierarchy(item.description).subfamily).filter(Boolean)).size;

  const categoryBuckets = normalizedInventory.reduce<Record<string, number>>((acc, item) => {
    const key = item.categoryLabel || 'Sin categoria';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const topFamilies = Object.entries(categoryBuckets)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const visibleRangeStart = pagination.total === 0 ? 0 : page * pageSize + 1;
  const visibleRangeEnd = Math.min((page + 1) * pageSize, pagination.total);

  if (error) {
    return <div className="text-lg font-semibold text-destructive">Error cargando inventario</div>;
  }

  return (
    <div className="min-h-screen space-y-6 bg-background p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Bodega e Inventario</h1>
          <p className="mt-1 text-lg text-muted-foreground">Resumen simple del stock real</p>
        </div>
        <Button size="lg" onClick={() => mutate()} className="gap-2" disabled={isLoading}>
          <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Actualizando...' : 'Recargar'}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary">{pagination.total.toLocaleString()}</div>
            <p className="mt-2 text-sm text-muted-foreground">Registros cargados</p>
          </CardContent>
        </Card>

        <Card className="border-destructive">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Bajo stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-destructive">{lowStock.length.toLocaleString()}</div>
            <p className="mt-2 text-sm text-muted-foreground">Revisar pronto</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Valor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{formatCurrency(totalValue)}</div>
            <p className="mt-2 text-sm text-muted-foreground">Estimado del inventario</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Layers3 className="h-5 w-5 text-primary" />
            Estructura visible
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-background/60 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Familias en pagina</div>
            <div className="mt-2 text-3xl font-bold text-foreground">{familyCount.toLocaleString()}</div>
            <div className="mt-1 text-sm text-muted-foreground">Categorias principales visibles</div>
          </div>
          <div className="rounded-lg border border-border bg-background/60 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subfamilias en pagina</div>
            <div className="mt-2 text-3xl font-bold text-foreground">{subfamilyCount.toLocaleString()}</div>
            <div className="mt-1 text-sm text-muted-foreground">Agrupaciones bajo la familia</div>
          </div>
          <div className="rounded-lg border border-border bg-background/60 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Familias destacadas</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {topFamilies.length > 0 ? (
                topFamilies.map(([label, count]) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-sm text-foreground"
                  >
                    <Boxes className="h-3.5 w-3.5 text-primary" />
                    <span>{prettifyLabel(label)}</span>
                    <span className="text-muted-foreground">({count})</span>
                  </span>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">Sin datos para resumir</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {lowStock.length > 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="h-6 w-6" />
              <span className="text-lg">{lowStock.length} items con bajo stock</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {lowStock.slice(0, 6).map((item) => {
                const hierarchy = splitHierarchy(item.description);
                return (
                  <div key={item.id} className="rounded-lg border border-border bg-background p-3">
                    <div className="text-sm font-semibold text-foreground">{item.sku}</div>
                    <div className="text-sm text-muted-foreground">{item.name?.substring(0, 40)}</div>
                    <div className="mt-2 text-xs text-destructive">
                      Stock: <span className="font-bold">{item.quantity}</span> (Min: {item.min_stock})
                    </div>
                    {(hierarchy.subfamily || hierarchy.team) && (
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {hierarchy.subfamily ? <div>Subfamilia: {hierarchy.subfamily}</div> : null}
                        {hierarchy.team ? <div>Equipo: {hierarchy.team}</div> : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {lowStock.length > 6 && <p className="mt-3 text-xs text-muted-foreground">+{lowStock.length - 6} items más con bajo stock</p>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Buscar y filtrar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Buscar SKU, nombre o categoria"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                className="h-10 border-border bg-background pl-10 text-base text-foreground"
              />
            </div>

            {categories.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">Categoria</p>
                <CategoryFilter
                  categories={categories}
                  selectedCategory={category}
                  onCategoryChange={(newCategory) => {
                    setCategory(newCategory);
                    setPage(0);
                  }}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">
            Lista {pagination.page > 0 && `(Pagina ${pagination.page + 1} de ${pagination.totalPages})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-border bg-muted">
                  <th className="p-3 text-left font-bold text-foreground">SKU</th>
                  <th className="p-3 text-left font-bold text-foreground">Producto</th>
                  <th className="p-3 text-left font-bold text-foreground">Familia</th>
                  <th className="p-3 text-left font-bold text-foreground">Subfamilia</th>
                  <th className="p-3 text-left font-bold text-foreground">Equipo</th>
                  <th className="p-3 text-right font-bold text-foreground">Cant.</th>
                  <th className="p-3 text-right font-bold text-foreground">Costo</th>
                  <th className="p-3 text-right font-bold text-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      Cargando...
                    </td>
                  </tr>
                ) : normalizedInventory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      No se encontraron items
                    </td>
                  </tr>
                ) : (
                  normalizedInventory.map((item, idx) => {
                    const hierarchy = splitHierarchy(item.description);

                    return (
                      <tr
                        key={item.id}
                        className={`border-b border-border hover:bg-muted ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'} ${item.quantity <= item.min_stock ? 'bg-destructive/10' : ''}`}
                      >
                        <td className="p-3 font-mono font-semibold text-foreground">{item.sku}</td>
                        <td className="max-w-xs p-3 text-foreground">
                          <div className="font-medium">{item.name}</div>
                        </td>
                        <td className="p-3 text-sm text-foreground">
                          <span className="inline-flex rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-semibold">
                            {item.categoryLabel}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">{hierarchy.subfamily || '-'}</td>
                        <td className="p-3 text-sm text-muted-foreground">{hierarchy.team || '-'}</td>
                        <td className="p-3 text-right font-semibold text-foreground">
                          {item.quantity.toLocaleString()}
                          {item.quantity <= item.min_stock && <span className="ml-2 font-bold text-destructive">!</span>}
                        </td>
                        <td className="p-3 text-right text-foreground">{formatCurrency(item.unit_cost || 0)}</td>
                        <td className="p-3 text-right font-bold text-primary">{formatCurrency((item.quantity || 0) * (item.unit_cost || 0))}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
              <div className="text-sm text-muted-foreground">
                Mostrando {visibleRangeStart} a {visibleRangeEnd} de {pagination.total.toLocaleString()} articulos
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(0);
                  }}
                  className="rounded border border-border bg-background px-3 py-2 text-sm font-medium text-foreground"
                >
                  <option value={25}>25 por pagina</option>
                  <option value={50}>50 por pagina</option>
                  <option value={100}>100 por pagina</option>
                  <option value={250}>250 por pagina</option>
                  <option value={500}>500 por pagina</option>
                </select>

                <Button variant="outline" size="sm" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="gap-1">
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(pagination.totalPages - 1, page + 1))}
                  disabled={page >= pagination.totalPages - 1}
                  className="gap-1"
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
