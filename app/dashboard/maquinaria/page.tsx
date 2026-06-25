'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Wrench, Truck, Search, ShoppingCart, ChevronRight } from 'lucide-react';

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error fetching machines');
  return data;
};

interface Machine {
  id: string;
  code: string;
  family: string;
  models: string[];
  count: number;
  status?: string;
}

interface CostCenter {
  code: string;
  name: string;
  family: string;
}

export default function MaquinariaPage() {
  const [search, setSearch] = useState('');
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);
  
  const { data, error, isLoading } = useSWR('/api/maintenance/cost-center-machines', fetcher);
  
  const machines = (data?.machines || []) as Machine[];
  const families = Array.from(new Set(machines.map(m => m.family))).sort();
  
  const filtered = machines.filter(m => {
    const matchSearch = search === '' || 
      m.family.toLowerCase().includes(search.toLowerCase()) ||
      m.models?.some(model => model.toLowerCase().includes(search.toLowerCase()));
    const matchFamily = !selectedFamily || m.family === selectedFamily;
    return matchSearch && matchFamily;
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Cargando máquinas...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <div>
            <h3 className="font-semibold text-destructive">Error cargando maquinaria</h3>
            <p className="text-sm text-muted-foreground">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Maquinaria y Vehículos</h1>
        <p className="text-muted-foreground">Gestiona tu flota de máquinas y vehículos. Ordena repuestos directamente desde aquí.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Truck className="h-5 w-5 text-primary" />
              Total de máquinas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{machines.reduce((sum, m) => sum + m.count, 0).toLocaleString()}</div>
            <p className="text-sm text-muted-foreground">{families.length} familias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Wrench className="h-5 w-5 text-amber-500" />
              Disponibles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{machines.filter(m => m.status === 'disponible').reduce((sum, m) => sum + m.count, 0)}</div>
            <p className="text-sm text-muted-foreground">En operación</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <ShoppingCart className="h-5 w-5 text-blue-500" />
              Ordenar repuestos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/compras">
              <Button variant="outline" className="w-full" size="sm">
                Ir a Compras
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar máquina, familia o modelo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        {families.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant={!selectedFamily ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedFamily(null)}
            >
              Todas ({machines.length})
            </Button>
            {families.map(family => (
              <Button
                key={family}
                variant={selectedFamily === family ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFamily(family)}
              >
                {family} ({machines.filter(m => m.family === family).reduce((sum, m) => sum + m.count, 0)})
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Machines Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.length > 0 ? (
          filtered.map(machine => (
            <Card key={machine.code} className="flex flex-col hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{machine.family}</CardTitle>
                    <CardDescription className="mt-1">{machine.code}</CardDescription>
                  </div>
                  <Badge variant="secondary">{machine.count}</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                {machine.models && machine.models.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Modelos:</p>
                    <div className="space-y-1">
                      {machine.models.slice(0, 3).map((model, i) => (
                        <div key={i} className="text-sm text-foreground">• {model}</div>
                      ))}
                      {machine.models.length > 3 && (
                        <div className="text-xs text-muted-foreground">+{machine.models.length - 3} más</div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
              <div className="border-t border-border p-3">
                <Link href={`/dashboard/compras?machine=${machine.family}`}>
                  <Button variant="ghost" size="sm" className="w-full justify-between">
                    Ordenar repuestos
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-full rounded-lg border border-dashed border-muted-foreground/20 p-8 text-center">
            <p className="text-muted-foreground">No se encontraron máquinas</p>
          </div>
        )}
      </div>
    </div>
  );
}
