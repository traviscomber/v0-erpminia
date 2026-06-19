'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download } from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ContratosReportesPage() {
  const [periodo, setPeriodo] = useState('mes');

  const { data: reportData } = useSWR(`/api/contratos/reportes?periodo=${periodo}`, fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 300000,
  });

  const reportes = reportData || {};
  const pagosPorContratista = reportes.pagos_por_tratista || [];
  const garantiasActivas = reportes.garantias_activas || [];
  const regaliasPorPropiedad = reportes.regalias_por_propiedad || [];
  const estadoPagos = reportes.estado_pagos || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reporteria de Contratos</h1>
          <p className="text-muted-foreground">Analisis y seguimiento de pagos, garantias y regalias</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-1 h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            {['mes', 'trimestre', 'anual'].map((p: string) => (
              <Button
                key={p}
                variant={periodo === p ? 'default' : 'outline'}
                onClick={() => setPeriodo(p)}
                size="sm"
              >
                {p === 'mes' ? 'Este mes' : p === 'trimestre' ? 'Este trimestre' : 'Este anio'}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="pagos">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pagos">Pagos</TabsTrigger>
          <TabsTrigger value="garantias">Garantias</TabsTrigger>
          <TabsTrigger value="regalias">Regalias</TabsTrigger>
          <TabsTrigger value="estado">Estado</TabsTrigger>
        </TabsList>

        <TabsContent value="pagos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pagos por Contratista</CardTitle>
            </CardHeader>
            <CardContent>
              {pagosPorContratista.length > 0 ? (
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pagosPorContratista}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip formatter={(value: any) => `CLP ${(Number(value) / 1000000).toFixed(1)}M`} />
                      <Legend />
                      <Bar dataKey="monto_pagado" fill="#10b981" name="Pagado" />
                      <Bar dataKey="monto_pendiente" fill="#f59e0b" name="Pendiente" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-8 text-center text-muted-foreground">No hay datos suficientes para mostrar este reporte.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="garantias" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Estado de Garantias Retenidas</CardTitle>
            </CardHeader>
            <CardContent>
              {garantiasActivas.length > 0 ? (
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={garantiasActivas}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="cantidad"
                      >
                        {garantiasActivas.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-8 text-center text-muted-foreground">Sin garantias activas</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regalias" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Regalias por Propiedad</CardTitle>
            </CardHeader>
            <CardContent>
              {regaliasPorPropiedad.length > 0 ? (
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={regaliasPorPropiedad}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" />
                      <YAxis />
                      <Tooltip formatter={(value: any) => `CLP ${(Number(value) / 1000000).toFixed(1)}M`} />
                      <Legend />
                      <Line type="monotone" dataKey="propiedad_1" stroke="#0ea5e9" name="Propiedad 1" />
                      <Line type="monotone" dataKey="propiedad_2" stroke="#10b981" name="Propiedad 2" />
                      <Line type="monotone" dataKey="propiedad_3" stroke="#f59e0b" name="Propiedad 3" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-8 text-center text-muted-foreground">No hay datos de regalias para el periodo seleccionado.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="estado" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {estadoPagos.map((estado: any, idx: number) => (
              <Card key={idx}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{estado.estado}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{estado.cantidad}</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    CLP {(estado.monto_total / 1000000).toFixed(1)}M
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
