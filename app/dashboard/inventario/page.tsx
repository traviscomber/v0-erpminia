'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertCircle, Edit2, Eye, Filter, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { canonicalCategory } from '@/lib/bodega-normalization';

type InventoryItem = {
  id: string;
  part_code: string;
  part_name: string;
  part_category: string;
  quantity_on_hand: number;
  quantity_available: number;
  reorder_level: number;
  reorder_quantity: number;
  unit_cost: number;
  bin: {
    bin_code: string;
    bin_location: string;
  } | null;
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) return null;
  return payload;
};

function categoryForItem(item: InventoryItem) {
  return canonicalCategory(item.part_category) || 'Sin categoria';
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(value || 0);
}

function stockTone(quantity: number, minLevel: number) {
  if (quantity <= 0) return 'text-destructive';
  if (quantity <= minLevel) return 'text-amber-600';
  if (quantity < 10) return 'text-orange-500';
  return 'text-foreground';
}

function stockLabel(quantity: number, minLevel: number) {
  if (quantity <= 0) return 'Sin stock';
  if (quantity <= minLevel) return 'Bajo';
  if (quantity < 10) return 'Revisar';
  return 'OK';
}

export default function InventarioPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const { data, error, isLoading, mutate } = useSWR('/api/warehouse/stock', fetcher, {
    revalidateOnFocus: false,
  });

  const stockList = ((data?.items || data?.stock || []) as InventoryItem[]).map((item) => ({
    ...item,
    part_category: canonicalCategory(item.part_category),
    quantity_on_hand: Number(item.quantity_on_hand || 0),
    quantity_available: Number(item.quantity_available || 0),
    reorder_level: Number(item.reorder_level || 0),
    reorder_quantity: Number(item.reorder_quantity || 0),
    unit_cost: Number(item.unit_cost || 0),
  }));

  const filteredItems = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return stockList.filter((item) => {
      const category = categoryForItem(item);
      return (
        (item.part_name || '').toLowerCase().includes(query) ||
        (item.part_code || '').toLowerCase().includes(query) ||
        category.toLowerCase().includes(query)
      );
    });
  }, [searchTerm, stockList]);

  const totalValue = useMemo(
    () => filteredItems.reduce((sum, item) => sum + item.quantity_on_hand * item.unit_cost, 0),
    [filteredItems],
  );

  const lowStockItems = filteredItems.filter((item) => item.quantity_on_hand <= item.reorder_level);
  const criticalStockItems = filteredItems.filter((item) => item.quantity_on_hand < 10 && item.quantity_on_hand <= item.reorder_level);
  const categoriesCount = new Set(filteredItems.map((item) => categoryForItem(item))).size;

  const abc = useMemo(() => {
    const sorted = [...filteredItems]
      .map((item) => ({ ...item, totalValue: item.quantity_on_hand * item.unit_cost }))
      .sort((left, right) => right.totalValue - left.totalValue);

    const total = Math.max(1, sorted.reduce((sum, item) => sum + item.totalValue, 0));
    let accumulated = 0;

    return sorted.map((item) => {
      accumulated += item.totalValue;
      const pct = (accumulated / total) * 100;
      let abcCategory = 'C';
      if (pct <= 80) abcCategory = 'A';
      else if (pct <= 95) abcCategory = 'B';
      return { ...item, abcCategory, accumulatedValue: pct };
    });
  }, [filteredItems]);

  const abcA = abc.filter((item) => item.abcCategory === 'A').length;
  const visibleRangeStart = filteredItems.length === 0 ? 0 : 1;
  const visibleRangeEnd = filteredItems.length;

  if (error) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Bodega e Inventario</h1>
          <p className="mt-3 text-muted-foreground">Resumen operativo del stock real, valorizacion y alertas de reposicion.</p>
        </div>

        <Card className="border-destructive/30">
          <CardContent className="flex items-center justify-between gap-4 pt-6">
            <div className="flex items-center gap-3 text-sm">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span>No fue posible cargar el inventario real.</span>
            </div>
            <Button variant="outline" onClick={() => mutate()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return <div className="text-muted-foreground">Cargando inventario...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Bodega e Inventario</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">Resumen ejecutivo del stock real, familias, ABC y alertas de reposicion.</p>
        </div>
        <Button variant="outline" onClick={() => mutate()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Valor total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            <p className="mt-1 text-xs text-muted-foreground">{filteredItems.length} articulos visibles</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Articulos A</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-rojo)]">{abcA}</div>
            <p className="mt-1 text-xs text-muted-foreground">Concentran la mayor parte del valor</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-[var(--secondary)]/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <AlertCircle className="h-4 w-4 text-[var(--secondary)]" />
              Bajo minimo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--secondary)]">{lowStockItems.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">{criticalStockItems.length} criticos</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Categorias visibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categoriesCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">Segun el filtro actual</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>Articulos de inventario</CardTitle>
            <Button className="w-full md:w-auto" disabled>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo articulo
            </Button>
          </div>
          <CardDescription>Vista operativa basada en stock real, bins y niveles de reorden.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, codigo o categoria..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="bg-input pl-10"
              />
            </div>
            <Button variant="outline" className="gap-2" disabled>
              <Filter className="h-4 w-4" />
              Filtros
            </Button>
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="border-border">
                  <TableHead className="font-semibold">Articulo</TableHead>
                  <TableHead className="font-semibold">Categoria</TableHead>
                  <TableHead className="text-center font-semibold">Stock</TableHead>
                  <TableHead className="text-right font-semibold">Valor unitario</TableHead>
                  <TableHead className="text-right font-semibold">Valor total</TableHead>
                  <TableHead className="text-right font-semibold">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const totalItemValue = item.quantity_on_hand * item.unit_cost;
                  const category = categoryForItem(item);
                  const isLowStock = item.quantity_on_hand <= item.reorder_level;

                  return (
                    <TableRow key={item.id} className={`border-border hover:bg-muted/50 ${isLowStock ? 'bg-destructive/5' : ''}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.part_name || 'Sin nombre'}</p>
                          <p className="text-xs text-muted-foreground">{item.part_code || item.id}</p>
                        </div>
                      </TableCell>
                      <TableCell>{category}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className={`font-medium ${stockTone(item.quantity_on_hand, item.reorder_level)}`}>
                              {item.quantity_on_hand} u.
                            </span>
                            <Badge className={isLowStock ? 'bg-[var(--secondary)]/20 text-[var(--secondary)]' : 'bg-muted text-muted-foreground'}>
                              {stockLabel(item.quantity_on_hand, item.reorder_level)}
                            </Badge>
                          </div>
                          <Progress value={Math.min(100, (item.quantity_on_hand / Math.max(item.reorder_level * 3, 1)) * 100)} className="h-1.5" />
                          <p className="text-xs text-muted-foreground">
                            Min: {item.reorder_level} u. Disponible: {item.quantity_available} u.
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unit_cost)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(totalItemValue)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedItem(item)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" disabled>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" disabled>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {filteredItems.length === 0 && (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No se encontraron articulos.
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border pt-4 text-sm text-muted-foreground">
            <span>
              Mostrando {visibleRangeStart} a {visibleRangeEnd} de {filteredItems.length} articulos
            </span>
            <span>Stock y valuacion desde la base real</span>
          </div>
        </CardContent>
      </Card>

      {selectedItem && (
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Detalle: {selectedItem.part_name || selectedItem.part_code}</CardTitle>
              <CardDescription>Informacion operativa del item seleccionado</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedItem(null)}>
              Cerrar
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Codigo</p>
                <p className="font-semibold">{selectedItem.part_code || selectedItem.id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Categoria</p>
                <p className="font-semibold">{categoryForItem(selectedItem)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cantidad en stock</p>
                <p className="font-semibold">{selectedItem.quantity_on_hand} u.</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Disponible</p>
                <p className="font-semibold">{selectedItem.quantity_available} u.</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nivel minimo</p>
                <p className="font-semibold">{selectedItem.reorder_level} u.</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cantidad de reorden</p>
                <p className="font-semibold">{selectedItem.reorder_quantity} u.</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor unitario</p>
                <p className="font-semibold">{formatCurrency(selectedItem.unit_cost)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor total</p>
                <p className="font-semibold">{formatCurrency(selectedItem.quantity_on_hand * selectedItem.unit_cost)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Ubicacion</p>
                <p className="font-semibold">{selectedItem.bin?.bin_location || selectedItem.bin?.bin_code || 'Sin bin asignado'}</p>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <p className="mb-2 text-sm text-muted-foreground">Estado del stock</p>
              <Progress value={Math.min(100, (selectedItem.quantity_on_hand / Math.max(selectedItem.reorder_level * 3, 1)) * 100)} className="h-2" />
              <p className="mt-2 text-xs text-muted-foreground">
                {selectedItem.quantity_on_hand <= selectedItem.reorder_level ? (
                  <span className="font-medium text-[var(--secondary)]">Alerta: stock por debajo del nivel minimo</span>
                ) : (
                  <span className="font-medium text-[var(--brand-verde)]">Stock dentro del rango operacional esperado</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
