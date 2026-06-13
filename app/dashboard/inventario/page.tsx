'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Plus, Search, Filter, Eye, Edit2, Trash2, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

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
  const response = await fetch(url);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload.error || 'Request failed');
  }

  return payload;
};

function categoryForItem(item: InventoryItem) {
  return item.part_category || 'General';
}

export default function InventarioPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const { data, error, isLoading, mutate } = useSWR('/api/warehouse/stock', fetcher, {
    revalidateOnFocus: false,
  });

  const stockList = ((data.stock || []) as InventoryItem[]).map((item) => ({
    ...item,
    quantity_on_hand: Number(item.quantity_on_hand || 0),
    quantity_available: Number(item.quantity_available || 0),
    reorder_level: Number(item.reorder_level || 0),
    reorder_quantity: Number(item.reorder_quantity || 0),
    unit_cost: Number(item.unit_cost || 0),
  }));

  const filteredItems = useMemo(
    () =>
      stockList.filter((item) => {
        const category = categoryForItem(item);
        return (
          (item.part_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.part_code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          category.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }),
    [searchTerm, stockList]
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(value);

  const getLowStockItems = () =>
    filteredItems.filter((item) => item.quantity_on_hand <= item.reorder_level).length;

  const getTotalInventoryValue = () =>
    filteredItems.reduce((sum, item) => sum + item.quantity_on_hand * item.unit_cost, 0);

  const getStockPercentage = (quantity: number, minLevel: number) => {
    if (minLevel <= 0) return quantity > 0 ? 100 : 0;
    return Math.min((quantity / (minLevel * 3)) * 100, 100);
  };

  const abcAnalysis = () => {
    const sorted = [...filteredItems]
      .map((item) => ({ ...item, totalValue: item.quantity_on_hand * item.unit_cost }))
      .sort((left, right) => right.totalValue - left.totalValue);

    const totalValue = Math.max(
      1,
      sorted.reduce((sum, item) => sum + item.totalValue, 0)
    );

    let accumulated = 0;
    return sorted.map((item) => {
      accumulated += item.totalValue;
      const percentage = (accumulated / totalValue) * 100;
      let abcCategory = 'C';
      if (percentage <= 80) abcCategory = 'A';
      else if (percentage <= 95) abcCategory = 'B';

      return { ...item, abcCategory, accumulatedValue: percentage };
    });
  };

  const abc = abcAnalysis();
  const abcA = abc.filter((item) => item.abcCategory === 'A').length;

  if (error) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Control de Inventario</h1>
          <p className="mt-3 text-muted-foreground">
            Analisis consolidado de valuacion, rotacion, ABC y alertas de reorden.
          </p>
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Control de Inventario</h1>
          <p className="mt-3 text-muted-foreground">
            Analisis consolidado de valuacion, rotacion, ABC y alertas de reorden.
          </p>
        </div>
        <Button variant="outline" onClick={() => mutate()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Valor Total Inventario</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(getTotalInventoryValue())}</div>
            <p className="mt-1 text-xs text-muted-foreground">{filteredItems.length} articulos</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Analisis ABC - Articulos A</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-rojo)]">{abcA}</div>
            <p className="mt-1 text-xs text-muted-foreground">80% del valor controlado</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-[var(--secondary)]/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <AlertCircle className="h-4 w-4 text-[var(--secondary)]" />
              Stock Bajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--secondary)]">{getLowStockItems()}</div>
            <p className="mt-1 text-xs text-muted-foreground">requieren reorden</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>Articulos de Inventario</CardTitle>
            <Button className="w-full md:w-auto" disabled>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Articulo
            </Button>
          </div>
          <CardDescription>
            Vista operativa basada en `warehouse_stock`, bins y niveles de reorden.
          </CardDescription>
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
                  <TableHead className="text-right font-semibold">Valor Unitario</TableHead>
                  <TableHead className="text-right font-semibold">Valor Total</TableHead>
                  <TableHead className="text-right font-semibold">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const totalValue = item.quantity_on_hand * item.unit_cost;
                  const category = categoryForItem(item);

                  return (
                    <TableRow key={item.id} className="border-border hover:bg-muted/50">
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.part_name || 'Sin nombre'}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.part_code || item.id}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{category}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium">{item.quantity_on_hand} u.</span>
                            {item.quantity_on_hand <= item.reorder_level && (
                              <Badge className="bg-[var(--secondary)]/20 text-[var(--secondary)]">
                                Bajo
                              </Badge>
                            )}
                          </div>
                          <Progress
                            value={getStockPercentage(item.quantity_on_hand, item.reorder_level)}
                            className="h-1.5"
                          />
                          <p className="text-xs text-muted-foreground">
                            Min: {item.reorder_level} u. Disponible: {item.quantity_available} u.
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.unit_cost)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(totalValue)}
                      </TableCell>
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
                <p className="text-sm text-muted-foreground">Cantidad en Stock</p>
                <p className="font-semibold">{selectedItem.quantity_on_hand} u.</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Disponible</p>
                <p className="font-semibold">{selectedItem.quantity_available} u.</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nivel Minimo</p>
                <p className="font-semibold">{selectedItem.reorder_level} u.</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cantidad de Reorden</p>
                <p className="font-semibold">{selectedItem.reorder_quantity} u.</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor Unitario</p>
                <p className="font-semibold">{formatCurrency(selectedItem.unit_cost)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="font-semibold">
                  {formatCurrency(selectedItem.quantity_on_hand * selectedItem.unit_cost)}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Ubicacion</p>
                <p className="font-semibold">
                  {selectedItem.bin?.bin_location || selectedItem.bin?.bin_code || 'Sin bin asignado'}
                </p>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <div className="mb-2">
                <p className="mb-2 text-sm text-muted-foreground">Estado del Stock</p>
                <Progress
                  value={getStockPercentage(selectedItem.quantity_on_hand, selectedItem.reorder_level)}
                  className="h-2"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedItem.quantity_on_hand <= selectedItem.reorder_level ? (
                  <span className="font-medium text-[var(--secondary)]">
                    Alerta: stock por debajo del nivel minimo
                  </span>
                ) : (
                  <span className="font-medium text-[var(--brand-verde)]">
                    Stock dentro del rango operacional esperado
                  </span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
