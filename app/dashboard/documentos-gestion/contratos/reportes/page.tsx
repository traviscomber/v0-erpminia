'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Filter } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ContratosReportesPage() {
  const [periodo, setPeriodo] = useState('mes'); // mes, trimestre, anual

  const { data: reportData } = useSWR(`/api/contratos/reportes?periodo=${periodo}`, fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 300000, // 5 minutos
  });

  const reportes = reportData || {};

  const pagosPortratista = reportes.pagos_por_tratista || [];
  const garantiasActivas = reportes.garantias_activas || [];
  const regaliasPorPropiedad = reportes.regalias_por_propiedad || [];
  const estadoPagos = reportes.estado_pagos || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reportería de Contratos</h1>
          <p className="text-muted-foreground">Análisis y seguimiento de pagos, garantías y regalías</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            {['mes', 'trimestre', 'anual'].map((p: any) => (
              <Button
                key={p}
                variant={periodo === p ? 'default' : 'outline'}
                onClick={() => setPeriodo(p)}
                size="sm"
              >
                {p === 'mes' ? 'Este Mes' : p === 'trimestre' ? 'Este Trimestre' : 'Este Año'}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Reports Grid */}
      <Tabs defaultValue="pagos">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pagos">Pagos</TabsTrigger>
          <TabsTrigger value="garantias">Garantías</TabsTrigger>
          <TabsTrigger value="regalias">Regalías</TabsTrigger>
          <TabsTrigger value="estado">Estado</TabsTrigger>
        </TabsList>

        {/* Pagos Tab */}
        <TabsContent value="pagos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pagos por Contratista</CardTitle>
            </CardHeader>
            <CardContent>
              {pagosPortratista.length > 0 ? (
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pagosPortratista}>
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
                <p className="text-center text-muted-foreground py-8">
                  No hay datos suficientes para mostrar este reporte.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Garantias Tab */}
        <TabsContent value="garantias" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Estado de Garantías Retenidas</CardTitle>
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
                <p className="text-center text-muted-foreground py-8">Sin garantías activas</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Regalias Tab */}
        <TabsContent value="regalias" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Regalías por Propiedad</CardTitle>
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
                  <p className="text-center text-muted-foreground py-8">
                    No hay datos de regalías para el período seleccionado.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Estado Tab */}
        <TabsContent value="estado" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {estadoPagos.map((estado: any, idx: number) => (
              <Card key={idx}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{estado.estado}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{estado.cantidad}</div>
                  <p className="text-xs text-muted-foreground mt-1">
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


