'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Package, Truck, Wrench, ChevronRight, Upload } from 'lucide-react';
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

// Icons per category type
const VEHICLE_GROUPS = ['8', '9', '12']; // Camionetas, Camiones, CBP

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
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Maquinaria y Vehículos</h1>
          <p className="text-muted-foreground">
            Flota operacional completa — haz click en cualquier equipo para ordenar repuestos o crear una OT
          </p>
        </div>
      </div>

      <Tabs defaultValue="lista" className="w-full">
        <TabsList className="w-full max-w-xs">
          <TabsTrigger value="lista" className="flex-1">
            <Truck className="mr-2 h-4 w-4" />
            Lista
          </TabsTrigger>
          <TabsTrigger value="importar" className="flex-1">
            <Upload className="mr-2 h-4 w-4" />
            Importar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="importar" className="mt-6">
          <MaquinariaImport onSuccess={() => mutate()} />
        </TabsContent>

        <TabsContent value="lista" className="mt-6 space-y-6">

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
            <p className="text-xs text-muted-foreground">Camionetas, Camiones</p>
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

      {/* Search + Category Filters */}
      <div className="space-y-3">
        <div className="relative max-w-lg">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, modelo o patente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category tags */}
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

      {/* Machine Cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-5 w-3/4 rounded bg-muted" />
                <div className="h-3 w-1/2 rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="h-4 w-full rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : machinery.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No se encontraron equipos ni vehículos
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {machinery.map((item) => (
            <Card
              key={item.code}
              className="flex flex-col transition-all hover:border-primary/50 hover:shadow-md"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="truncate text-base leading-tight">{item.model || item.name}</CardTitle>
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.code}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className="shrink-0 text-xs"
                  >
                    {item.category}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="flex-1 space-y-2 text-sm">
                {item.plate && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Patente</span>
                    <span className="font-mono font-semibold">{item.plate}</span>
                  </div>
                )}
                {item.year && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Año</span>
                    <span className="font-medium">{item.year}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Estado</span>
                  <Badge
                    className={
                      item.status === 'Activo'
                        ? 'bg-green-100 text-green-700 border-green-200'
                        : 'bg-red-100 text-red-700 border-red-200'
                    }
                    variant="outline"
                  >
                    {item.status}
                  </Badge>
                </div>
              </CardContent>

              <div className="grid grid-cols-2 gap-2 border-t border-border p-3">
                <Button variant="ghost" size="sm" className="justify-start text-xs" asChild>
                  <Link href={`/dashboard/work-orders?cost_center=${item.code}`}>
                    <Wrench className="mr-1 h-3.5 w-3.5" />
                    Crear OT
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" className="justify-start text-xs" asChild>
                  <Link href={`/dashboard/compras?ref=${encodeURIComponent(item.name)}`}>
                    <Package className="mr-1 h-3.5 w-3.5" />
                    Repuestos
                    <ChevronRight className="ml-auto h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
