'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Search, Users, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const estadoColores = {
  programada: 'bg-[var(--secondary)]/10 text-blue-800',
  realizada: 'bg-[var(--brand-verde)]/10 text-[var(--brand-verde)]',
  cancelada: 'bg-[var(--brand-rojo)]/10 text-[var(--brand-rojo)]',
};

export default function HSECapacitacionesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [estado, setEstado] = useState('');

  const { data: capData } = useSWR(
    `/api/hse/capacitaciones?estado=${estado}`,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 300000 } // 5 minutos
  );

  const capacitaciones = capData?.capacitaciones || [];
  const filtradas = capacitaciones.filter((c: any) =>
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const proximasCapacitaciones = filtradas.filter((c: any) => {
    const fecha = new Date(c.fecha_programada);
    const hoy = new Date();
    return fecha >= hoy && c.estado === 'programada';
  });

  // Stats by type
  const statsPorTipo = filtradas.reduce((acc: any, c: any) => {
    if (!acc[c.tipo]) acc[c.tipo] = 0;
    acc[c.tipo] += 1;
    return acc;
  }, {});

  const chartData = Object.entries(statsPorTipo).map(([tipo, cantidad]) => ({
    tipo,
    cantidad,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendario de Capacitaciones</h1>
          <p className="text-muted-foreground">Gestión de cursos, instructores y registro de asistentes</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-1" />
          Nueva Capacitación
        </Button>
      </div>

      {/* Próximas */}
      {proximasCapacitaciones.length > 0 && (
        <div className="bg-[var(--secondary)]/5 border border-[var(--secondary)]/30 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-3">Próximas Capacitaciones</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {proximasCapacitaciones.slice(0, 3).map((cap: any) => (
              <div key={cap.id} className="bg-white rounded p-3 border border-blue-100">
                <p className="font-semibold text-sm">{cap.nombre}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(cap.fecha_programada).toLocaleDateString('es-CL', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </p>
                <p className="text-xs text-[var(--secondary)] mt-1">{cap.duracion_horas}h</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Capacitaciones</CardTitle>
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
            <div className="text-2xl font-bold text-[var(--secondary)]">
              {capacitaciones.filter((c: any) => c.estado === 'programada').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Realizadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-verde)]">
              {capacitaciones.filter((c: any) => c.estado === 'realizada').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Horas Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {capacitaciones.reduce((sum: number, c: any) => sum + c.duracion_horas, 0)}h
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Capacitaciones por Tipo</CardTitle>
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

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar capacitación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={estado === '' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setEstado('')}
            >
              Todas
            </Button>
            {['programada', 'realizada', 'cancelada'].map((est: any) => (
              <Button
                key={est}
                variant={estado === est ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEstado(est)}
              >
                {est}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Capacitaciones List */}
      <div className="space-y-2">
        {filtradas.map((cap: any) => (
          <Card key={cap.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold">{cap.nombre}</h3>
                  <p className="text-sm text-muted-foreground">{cap.proveedor || 'Interno'}</p>

                  <div className="flex gap-2 mt-2 flex-wrap">
                    <Badge className={estadoColores[cap.estado as keyof typeof estadoColores]}>
                      {cap.estado}
                    </Badge>
                    <Badge variant="outline">{cap.tipo}</Badge>
                  </div>

                  <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(cap.fecha_programada).toLocaleDateString('es-CL')}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {cap.duracion_horas}h
                    </div>
                    {cap.hse_capacitaciones_asistentes && (
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {cap.hse_capacitaciones_asistentes.length} asistentes
                      </div>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Ver Detalles
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
