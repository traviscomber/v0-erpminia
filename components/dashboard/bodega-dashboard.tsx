'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBodegaInventory, useBodegaCategories } from '@/hooks/use-module-apis';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, AlertTriangle, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { CategoryFilter } from './category-filter';

export function BodegaDashboard() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const { inventory, pagination, isLoading, error, mutate } = useBodegaInventory(page, pageSize, search, category);
  const { categories } = useBodegaCategories();

  if (error) return <div className="text-destructive font-semibold text-lg">Error cargando inventario</div>;

  // Calculate metrics
  const lowStock = inventory.filter(item => item.quantity <= item.min_stock);
  const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * (item.unit_cost || 0)), 0);

  return (
    <div className="space-y-6 p-6 bg-background min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Bodega</h1>
          <p className="text-muted-foreground text-lg mt-1">Gestión de {pagination.total.toLocaleString()} artículos</p>
        </div>
        <Button 
          size="lg" 
          onClick={() => mutate()} 
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          disabled={isLoading}
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Actualizando...' : 'Actualizar'}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-2 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground">Total en Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary">{pagination.total.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground mt-2">Artículos en inventario</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-2 border-destructive">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground">Stock Bajo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-destructive">{lowStock.length.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground mt-2">Por debajo del mínimo</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-2 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground">Valor Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">${(totalValue / 1000).toFixed(1)}k</div>
            <p className="text-sm text-muted-foreground mt-2">Inventario valorizado</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts if low stock */}
      {lowStock.length > 0 && (
        <Card className="border-2 border-destructive bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex gap-3 items-center text-destructive">
              <AlertTriangle className="w-6 h-6" />
              <span className="text-lg">{lowStock.length} Artículos con Stock Bajo</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {lowStock.slice(0, 6).map(item => (
                <div key={item.id} className="bg-background p-3 rounded-lg border border-border">
                  <div className="font-semibold text-foreground text-sm">{item.sku}</div>
                  <div className="text-sm text-muted-foreground">{item.name?.substring(0, 30)}</div>
                  <div className="text-xs text-destructive mt-2">
                    Stock: <span className="font-bold">{item.quantity}</span> (Mín: {item.min_stock})
                  </div>
                </div>
              ))}
            </div>
            {lowStock.length > 6 && (
              <p className="text-xs text-muted-foreground mt-3">
                +{lowStock.length - 6} artículos más con stock bajo
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <Card className="bg-card border-2 border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Filtros y Búsqueda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search box */}
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Buscar por SKU, nombre o categoría..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                className="pl-10 bg-background text-foreground border-border h-10 text-base"
              />
            </div>

            {/* Category filter */}
            {categories.length > 0 && (
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Categoría</p>
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

      {/* Inventory Table */}
      <Card className="bg-card border-2 border-border">
        <CardHeader>
          <CardTitle className="text-foreground">
            Inventario {pagination.page > 0 && `(Página ${pagination.page + 1} de ${pagination.totalPages})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-border bg-muted">
                  <th className="text-left p-3 font-bold text-foreground">SKU</th>
                  <th className="text-left p-3 font-bold text-foreground">Producto</th>
                  <th className="text-left p-3 font-bold text-foreground">Categoría</th>
                  <th className="text-right p-3 font-bold text-foreground">Cantidad</th>
                  <th className="text-right p-3 font-bold text-foreground">Costo Unit.</th>
                  <th className="text-right p-3 font-bold text-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      Cargando...
                    </td>
                  </tr>
                ) : inventory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No se encontraron artículos
                    </td>
                  </tr>
                ) : (
                  inventory.map((item, idx) => (
                    <tr 
                      key={item.id} 
                      className={`border-b border-border hover:bg-muted transition-colors ${
                        idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'
                      } ${item.quantity <= item.min_stock ? 'bg-destructive/10' : ''}`}
                    >
                      <td className="p-3 font-mono text-foreground font-semibold">{item.sku}</td>
                      <td className="p-3 text-foreground max-w-xs truncate">{item.name}</td>
                      <td className="p-3 text-muted-foreground text-sm">{item.category || '-'}</td>
                      <td className="text-right p-3 font-semibold text-foreground">
                        {item.quantity.toLocaleString()}
                        {item.quantity <= item.min_stock && (
                          <span className="ml-2 text-destructive font-bold">⚠</span>
                        )}
                      </td>
                      <td className="text-right p-3 text-foreground">${(item.unit_cost || 0).toFixed(2)}</td>
                      <td className="text-right p-3 font-bold text-primary">
                        ${((item.quantity || 0) * (item.unit_cost || 0)).toFixed(0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
              <div className="text-sm text-muted-foreground">
                Mostrando {(page * pageSize) + 1} a {Math.min((page + 1) * pageSize, pagination.total)} de {pagination.total.toLocaleString()} artículos
              </div>

              <div className="flex items-center gap-2">
                {/* Page size selector */}
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(0);
                  }}
                  className="px-3 py-2 rounded border border-border bg-background text-foreground text-sm font-medium"
                >
                  <option value={25}>25 por página</option>
                  <option value={50}>50 por página</option>
                  <option value={100}>100 por página</option>
                  <option value={250}>250 por página</option>
                  <option value={500}>500 por página</option>
                </select>

                {/* Navigation buttons */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </Button>

                <span className="text-sm font-medium text-foreground px-3">
                  {page + 1} / {pagination.totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(pagination.totalPages - 1, page + 1))}
                  disabled={page >= pagination.totalPages - 1}
                  className="gap-1"
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
