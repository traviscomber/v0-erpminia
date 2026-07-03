'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Calendar, Plus, Search, Users, Clock, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { HSECapacitacionesImport } from '@/components/hse/hse-capacitaciones-import';

type CapacitacionItem = {
  id?: string | number | null;
  nombre?: string | null;
  tipo?: string | null;
  tema?: string | null;
  proveedor?: string | null;
  estado?: string | null;
  fecha_programada?: string | null;
  duracion_horas?: number | string | null;
  asistentes_count?: number | string | null;
  cargos_aplica?: string | null;
};

type CapacitacionesApiResponse = {
  capacitaciones: CapacitacionItem[];
  total: number;
  warning?: string;
};

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as CapacitacionesApiResponse;
};

const estadoColores: Record<string, string> = {
  programada: 'bg-[var(--secondary)]/10 text-blue-800',
  realizada: 'bg-[var(--brand-verde)]/10 text-[var(--brand-verde)]',
  cancelada: 'bg-[var(--brand-rojo)]/10 text-[var(--brand-rojo)]',
};

export default function HSECapacitacionesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [estado, setEstado] = useState('');

  const { data, error, isLoading, mutate } = useSWR(
    `/api/hse/capacitaciones${estado ? `?estado=${encodeURIComponent(estado)}` : ''}`,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 300000 }
  );

  const handleReload = () => {
    void mutate();
  };

  const capacitaciones = data?.capacitaciones || [];
  const filtradas = useMemo(
    () =>
      capacitaciones.filter((c) =>
        `${c.nombre} ${c.tipo} ${c.proveedor || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [capacitaciones, searchTerm]
  );

  const proximasCapacitaciones = filtradas.filter((c) => {
    const fecha = new Date(c.fecha_programada || 0);
    return fecha >= new Date() && c.estado === 'programada';
  });

  const chartData = Object.entries(
    filtradas.reduce((acc: Record<string, number>, item) => {
      const key = String(item.tipo || 'Sin tipo');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([tipo, cantidad]) => ({ tipo, cantidad: Number(cantidad) }));

  if (error) {
    return <div className="text-red-500">Error al cargar capacitaciones HSE.</div>;
  }

  if (isLoading) {
    return <div className="text-gray-500">Cargando capacitaciones HSE...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendario de capacitaciones HSE</h1>
          <p className="text-muted-foreground">Programacion, avance y trazabilidad de actividades de formacion.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/hse/capacitaciones/importar">
              <Download className="mr-2 h-4 w-4" />
              Plantilla Excel
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/hse/capacitaciones/importar">
              <ArrowRight className="mr-2 h-4 w-4" />
              Importar Excel
            </Link>
          </Button>
          <Button>
            <Plus className="mr-1 h-4 w-4" />
            Nueva capacitacion
          </Button>
        </div>
      </div>

      <HSECapacitacionesImport onSuccess={handleReload} />

      {proximasCapacitaciones.length > 0 && (
        <div className="rounded-lg border border-[var(--secondary)]/30 bg-[var(--secondary)]/5 p-4">
          <h3 className="mb-3 font-semibold text-blue-900">Proximas capacitaciones</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {proximasCapacitaciones.slice(0, 3).map((cap) => (
              <div key={cap.id} className="rounded border border-blue-100 bg-white p-3">
                <p className="text-sm font-semibold">{cap.nombre}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(cap.fecha_programada || 0).toLocaleDateString('es-CL', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </p>
                <p className="mt-1 text-xs text-[var(--secondary)]">{cap.duracion_horas}h</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total capacitaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{capacitaciones.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Programadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--secondary)]">{capacitaciones.filter((c) => c.estado === 'programada').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Realizadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-verde)]">{capacitaciones.filter((c) => c.estado === 'realizada').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Horas acumuladas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{capacitaciones.reduce((sum: number, c) => sum + (Number(c.duracion_horas) || 0), 0)}h</div>
          </CardContent>
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Capacitaciones por tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="tipo" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="cantidad" fill="#0ea5e9" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar capacitacion..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant={estado === '' ? 'default' : 'outline'} size="sm" onClick={() => setEstado('')}>
              Todas
            </Button>
            {['programada', 'realizada', 'cancelada'].map((est) => (
              <Button key={est} variant={estado === est ? 'default' : 'outline'} size="sm" onClick={() => setEstado(est)}>
                {est}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {filtradas.map((cap) => (
          <Card key={cap.id} className="cursor-pointer transition-shadow hover:shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold">{cap.nombre}</h3>
                  <p className="text-sm text-muted-foreground">{cap.proveedor || 'Interno'}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge className={estadoColores[cap.estado || 'programada'] || estadoColores.programada}>{cap.estado || 'programada'}</Badge>
                    <Badge variant="outline">{cap.tipo}</Badge>
                    {cap.cargos_aplica ? <Badge variant="outline">{cap.cargos_aplica}</Badge> : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(cap.fecha_programada || 0).toLocaleDateString('es-CL')}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {cap.duracion_horas}h
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {cap.asistentes_count || 0} asistentes
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm">Ver detalle</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtradas.length === 0 && (
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground">No hay capacitaciones para el filtro actual.</CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
