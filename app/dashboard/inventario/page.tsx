'use client';

import { useState } from 'react';
import { Plus, Search, Filter, Eye, Edit2, Trash2, AlertCircle } from 'lucide-react';
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
import { mockInventoryItems } from '@/lib/data';
import { Progress } from '@/components/ui/progress';

export default function InventarioPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<typeof mockInventoryItems[0] | null>(null);

  const filteredItems = mockInventoryItems.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getLowStockItems = () => {
    return filteredItems.filter((item) => item.quantity <= item.minLevel).length;
  };

  const getTotalInventoryValue = () => {
    return filteredItems.reduce((sum, item) => sum + item.totalValue, 0);
  };

  const getStockPercentage = (quantity: number, minLevel: number) => {
    return Math.min((quantity / (minLevel * 3)) * 100, 100);
  };

  // ABC Analysis - Pareto
  const abcAnalysis = () => {
    const sorted = [...filteredItems].sort((a, b) => b.totalValue - a.totalValue);
    const totalValue = getTotalInventoryValue();
    let accumulated = 0;
    return sorted.map((item) => {
      accumulated += item.totalValue;
      const percentage = (accumulated / totalValue) * 100;
      let category = 'C';
      if (percentage <= 80) category = 'A';
      else if (percentage <= 95) category = 'B';
      return { ...item, abcCategory: category, accumulatedValue: percentage };
    });
  };

  const abc = abcAnalysis();
  const abcA = abc.filter(i => i.abcCategory === 'A').length;
  const abcB = abc.filter(i => i.abcCategory === 'B').length;
  const abcC = abc.filter(i => i.abcCategory === 'C').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Control de Inventario</h1>
        <p className="text-muted-foreground mt-3">
          Análisis consolidado: valuación, rotación, ABC y alertas de reorden
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Valor Total Inventario</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(getTotalInventoryValue())}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{filteredItems.length} artículos</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Análisis ABC - Artículos A</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-rojo)]">{abcA}</div>
            <p className="text-xs text-muted-foreground mt-1">80% del valor (críticos)</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-[var(--secondary)]/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[var(--secondary)]" />
              Stock Bajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--secondary)]">{getLowStockItems()}</div>
            <p className="text-xs text-muted-foreground mt-1">requieren reorden</p>
          </CardContent>
        </Card>
      </div>

      {/* Control Section */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>Artículos de Inventario</CardTitle>
            <Button className="w-full md:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Artículo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, ID o categoría..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-input"
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              Filtros
            </Button>
          </div>

          {/* Table */}
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="border-border">
                  <TableHead className="font-semibold">Artículo</TableHead>
                  <TableHead className="font-semibold">Categoría</TableHead>
                  <TableHead className="font-semibold text-center">Stock</TableHead>
                  <TableHead className="font-semibold text-right">Valor Unitario</TableHead>
                  <TableHead className="font-semibold text-right">Valor Total</TableHead>
                  <TableHead className="text-right font-semibold">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id} className="border-border hover:bg-muted/50">
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.id}</p>
                      </div>
                    </TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium">
                            {item.quantity} {item.unit}
                          </span>
                          {item.quantity <= item.minLevel && (
                            <Badge className="bg-[var(--secondary)]/20 text-[var(--secondary)]">Bajo</Badge>
                          )}
                        </div>
                        <Progress
                          value={getStockPercentage(item.quantity, item.minLevel)}
                          className="h-1.5"
                        />
                        <p className="text-xs text-muted-foreground">
                          Mín: {item.minLevel} {item.unit}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.unitCost)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.totalValue)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedItem(item)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedItem && (
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Detalles: {selectedItem.name}</CardTitle>
              <CardDescription>Información completa del artículo</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedItem(null)}
            >
              Cerrar
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Código</p>
                <p className="font-semibold">{selectedItem.id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Categoría</p>
                <p className="font-semibold">{selectedItem.category}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cantidad en Stock</p>
                <p className="font-semibold">
                  {selectedItem.quantity} {selectedItem.unit}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nivel Mínimo</p>
                <p className="font-semibold">
                  {selectedItem.minLevel} {selectedItem.unit}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor Unitario</p>
                <p className="font-semibold">{formatCurrency(selectedItem.unitCost)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="font-semibold">{formatCurrency(selectedItem.totalValue)}</p>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <div className="mb-2">
                <p className="text-sm text-muted-foreground mb-2">Estado del Stock</p>
                <Progress
                  value={getStockPercentage(selectedItem.quantity, selectedItem.minLevel)}
                  className="h-2"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedItem.status === 'Bajo Stock' ? (
                  <span className="text-[var(--secondary)] font-medium">
                    Alerta: Stock por debajo del nivel mínimo
                  </span>
                ) : (
                  <span className="text-[var(--brand-verde)] font-medium">Stock en nivel normal</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
