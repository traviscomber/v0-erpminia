'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Search, Package, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface Machinery {
  id: string;
  code: string;
  name: string;
  type: string;
  model?: string;
  year?: number;
  status: string;
  criticality?: string;
  category: 'Equipo' | 'Vehículo';
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export default function MaquinariaPage() {
  const [machinery, setMachinery] = useState<Machinery[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 0,
    pageSize: 50,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | 'Equipo' | 'Vehículo'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchMachinery = async (page: number = 0) => {
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '50',
        search: search,
      });
      const res = await fetch(`/api/maquinaria/machinery?${params}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const filtered =
        category === 'all' ? data.machinery : data.machinery.filter((m: Machinery) => m.category === category);
      setMachinery(filtered);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando maquinaria');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchMachinery(0), 300);
    return () => clearTimeout(timer);
  }, [search, category]);

  const statusColor = (status: string) => {
    if (status.toLowerCase().includes('activo') || status.toLowerCase().includes('disponible'))
      return 'bg-green-100 text-green-700';
    if (status.toLowerCase().includes('mantenimiento')) return 'bg-yellow-100 text-yellow-700';
    if (status.toLowerCase().includes('inactivo') || status.toLowerCase().includes('fuera'))
      return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Maquinaria y Vehículos</h1>
        <p className="text-muted-foreground">Gestión de equipos y vehículos operacionales</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Equipos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pagination.total}</div>
            <p className="text-xs text-muted-foreground">Máquinas y vehículos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {machinery.filter((m) => m.status.toLowerCase().includes('activo') || m.status.toLowerCase().includes('disponible')).length}
            </div>
            <p className="text-xs text-muted-foreground">En operación</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              En Mantenimiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {machinery.filter((m) => m.status.toLowerCase().includes('mantenimiento')).length}
            </div>
            <p className="text-xs text-muted-foreground">Requieren atención</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex-1 flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, nombre o modelo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
        </div>
        <Select value={category} onValueChange={(v) => setCategory(v as any)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="Equipo">Equipos</SelectItem>
            <SelectItem value="Vehículo">Vehículos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 text-red-700">{error}</CardContent>
        </Card>
      )}

      {/* Machinery Grid */}
      {isLoading ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">Cargando...</CardContent>
        </Card>
      ) : machinery.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No se encontraron máquinas o vehículos
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {machinery.map((item) => (
              <Card
                key={item.id}
                className="flex flex-col hover:shadow-lg transition-shadow"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{item.code}</p>
                    </div>
                    <Badge className={statusColor(item.status)}>{item.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Tipo</p>
                    <p className="text-sm font-medium">{item.type}</p>
                  </div>
                  {item.model && (
                    <div>
                      <p className="text-xs text-muted-foreground">Modelo</p>
                      <p className="text-sm font-medium">{item.model}</p>
                    </div>
                  )}
                  {item.year && (
                    <div>
                      <p className="text-xs text-muted-foreground">Año</p>
                      <p className="text-sm font-medium">{item.year}</p>
                    </div>
                  )}
                  {item.criticality && (
                    <div>
                      <p className="text-xs text-muted-foreground">Criticidad</p>
                      <Badge variant="outline">{item.criticality}</Badge>
                    </div>
                  )}
                </CardContent>
                <div className="border-t border-border p-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    asChild
                  >
                    <Link href={`/dashboard/compras?machinery_id=${item.id}`}>
                      <Package className="w-4 h-4 mr-1" />
                      Ordenar Repuestos
                    </Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Página {pagination.page + 1} de {pagination.totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchMachinery(Math.max(0, pagination.page - 1))}
                  disabled={pagination.page === 0}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchMachinery(Math.min(pagination.totalPages - 1, pagination.page + 1))}
                  disabled={pagination.page >= pagination.totalPages - 1}
                >
                  Siguiente <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
