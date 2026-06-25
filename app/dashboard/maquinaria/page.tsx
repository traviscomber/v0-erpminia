'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Truck, Wrench, Upload, Package, ExternalLink, Download } from 'lucide-react';
import Link from 'next/link';
import { MaquinariaImport } from '@/components/maquinaria/machinery-import';

interface Machine {
  id: string;
  code: string;
  name: string;
  model: string;
  plate: string | null;
  year: number | null;
  category_code: string;
  category: string;
  status: string;
}

interface Category {
  code: string;
  name: string;
  count: number;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error cargando maquinaria');
  return res.json();
};

const VEHICLE_GROUPS = ['8', '9', '12'];

export default function MaquinariaPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const params = new URLSearchParams({ search: debouncedSearch, category: selectedCategory });
  const { data, error, isLoading, mutate } = useSWR(`/api/maquinaria/machinery?${params}`, fetcher);

  const machinery: Machine[] = data?.machinery || [];
  const categories: Category[] = data?.categories || [];
  const total: number = data?.total || 0;

  const vehicleCount = machinery.filter((m) => VEHICLE_GROUPS.includes(m.category_code)).length;
  const equipmentCount = machinery.filter((m) => !VEHICLE_GROUPS.includes(m.category_code)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Maquinaria y Vehículos</h1>
          <p className="text-muted-foreground">
            Flota operacional completa extraída desde centros de costo
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => window.open('/api/maquinaria/export', '_blank')}
        >
          <Download className="mr-2 h-4 w-4" />
          Descargar Excel Maestro
        </Button>
      </div>

      <Tabs defaultValue="lista" className="w-full">
        <TabsList>
          <TabsTrigger value="lista">
            <Truck className="mr-2 h-4 w-4" />
            Lista
          </TabsTrigger>
          <TabsTrigger value="importar">
            <Upload className="mr-2 h-4 w-4" />
            Importar / Actualizar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="importar" className="mt-6">
          <MaquinariaImport onSuccess={() => mutate()} />
        </TabsContent>

        <TabsContent value="lista" className="mt-6 space-y-5">

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Activos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{total}</div>
                <p className="text-xs text-muted-foreground">{categories.length} categorías</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Truck className="h-4 w-4" /> Vehículos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{vehicleCount}</div>
                <p className="text-xs text-muted-foreground">Camionetas y Camiones</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Wrench className="h-4 w-4" /> Equipos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{equipmentCount}</div>
                <p className="text-xs text-muted-foreground">Sondajes, Compresores, etc.</p>
              </CardContent>
            </Card>
          </div>

          {/* Search + Category Tags */}
          <div className="space-y-3">
            <div className="relative max-w-lg">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, patente, modelo o código..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={selectedCategory === '' ? 'default' : 'outline'}
                onClick={() => setSelectedCategory('')}
              >
                Todos ({total})
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat.code}
                  size="sm"
                  variant={selectedCategory === cat.code ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(selectedCategory === cat.code ? '' : cat.code)}
                >
                  {cat.name}
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {cat.count}
                  </Badge>
                </Button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {error.message}
            </div>
          )}

          {/* Table */}
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-24">Código</TableHead>
                  <TableHead>Nombre / Modelo</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="w-28">Patente / Serie</TableHead>
                  <TableHead className="w-16">Año</TableHead>
                  <TableHead className="w-24">Estado</TableHead>
                  <TableHead className="w-36 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 w-full animate-pulse rounded bg-muted" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : machinery.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                      No se encontraron equipos ni vehículos
                    </TableCell>
                  </TableRow>
                ) : (
                  machinery.map((item) => (
                    <TableRow key={item.code} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {item.code}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{item.model || item.name}</div>
                        {item.model && item.model !== item.name && (
                          <div className="text-xs text-muted-foreground truncate max-w-xs">{item.name}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs whitespace-nowrap">
                          {item.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm font-semibold">
                        {item.plate ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.year ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            item.status === 'Activo'
                              ? 'border-green-200 bg-green-50 text-green-700'
                              : 'border-red-200 bg-red-50 text-red-700'
                          }
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
                            <Link href={`/dashboard/work-orders?cost_center=${item.code}`}>
                              <Wrench className="h-3 w-3" />
                              OT
                            </Link>
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
                            <Link href={`/dashboard/compras?ref=${encodeURIComponent(item.model || item.name)}`}>
                              <Package className="h-3 w-3" />
                              <ExternalLink className="h-3 w-3 ml-0.5" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <p className="text-xs text-muted-foreground">
            {machinery.length} de {total} equipos mostrados
            {selectedCategory && ` · Filtro activo: ${categories.find(c => c.code === selectedCategory)?.name}`}
          </p>

        </TabsContent>
      </Tabs>
    </div>
  );
}
