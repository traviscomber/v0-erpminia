'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import {
  BarChart,
  Bar,
  Cell,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) return null;
  return payload;
};

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const EMPTY_REPORT = {
  pagos_por_contratista: [],
  garantias_activas: [],
  regalias_por_propiedad: [],
  estado_pagos: [],
};

type ReportEntry = {
  name?: string | null;
  monto_pagado?: number | string | null;
  monto_pendiente?: number | string | null;
  cantidad?: number | string | null;
  estado?: string | null;
  monto_total?: number | string | null;
  mes?: string | null;
  propiedad_1?: number | string | null;
  propiedad_2?: number | string | null;
  propiedad_3?: number | string | null;
};

type ReportShape = {
  pagos_por_contratista?: ReportEntry[];
  garantias_activas?: ReportEntry[];
  regalias_por_propiedad?: ReportEntry[];
  estado_pagos?: ReportEntry[];
  ['garant\u00edas_activas']?: ReportEntry[];
  ['regal\u00edas_por_propiedad']?: ReportEntry[];
};

export default function ContratosReportesPage() {
  const [periodo, setPeriodo] = useState('mes');
  const [requestTimedOut, setRequestTimedOut] = useState(false);

  const { data: reportData, error, isLoading } = useSWR(`/api/contratos/reportes?periodo=${periodo}`, fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 300000,
  });

  useEffect(() => {
    setRequestTimedOut(false);
    const timer = window.setTimeout(() => {
      setRequestTimedOut(true);
    }, 12000);

    return () => window.clearTimeout(timer);
  }, [periodo]);

  const reportes = (reportData || EMPTY_REPORT) as ReportShape;
  const pagosPorContratista = reportes.pagos_por_contratista || [];
  const garantiasActivas = reportes.garantias_activas || reportes['garant\u00edas_activas'] || [];
  const regaliasPorPropiedad = reportes.regalias_por_propiedad || reportes['regal\u00edas_por_propiedad'] || [];
  const estadoPagos = reportes.estado_pagos || [];

  if (isLoading && !requestTimedOut) {
    return <div className="text-muted-foreground">Cargando reportes de contratos...</div>;
  }

  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="flex items-center gap-3 pt-6 text-sm">
          <AlertCircle className="h-4 w-4 text-destructive" />
          No fue posible cargar los reportes reales de contratos.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {requestTimedOut && !reportData && !error && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            La carga de reportes tardo mas de lo esperado. Se muestran los accesos y los estados disponibles
            mientras el modulo termina de responder.
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reportes de contratos</h1>
          <p className="text-muted-foreground">Seguimiento real de pagos, garantias y regalias, con lectura ejecutiva.</p>
        </div>

        <Button variant="outline" size="sm" className="w-fit">
          <Download className="mr-1 h-4 w-4" />
          Descargar PDF
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            {['mes', 'trimestre', 'anual'].map((p) => (
              <Button key={p} variant={periodo === p ? 'default' : 'outline'} onClick={() => setPeriodo(p)} size="sm">
                {p === 'mes' ? 'Mes actual' : p === 'trimestre' ? 'Trimestre actual' : 'Ano actual'}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="pagos" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pagos">Pagos</TabsTrigger>
          <TabsTrigger value="garantias">Garantias</TabsTrigger>
          <TabsTrigger value="regalias">Regalias</TabsTrigger>
          <TabsTrigger value="estado">Estado</TabsTrigger>
        </TabsList>

        <TabsContent value="pagos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pagos por contratista</CardTitle>
            </CardHeader>
            <CardContent>
              {pagosPorContratista.length > 0 ? (
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pagosPorContratista}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip formatter={(value: number) => `CLP ${(Number(value) / 1000000).toFixed(1)}M`} />
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
              <CardTitle>Estado de garantias retenidas</CardTitle>
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
                        {garantiasActivas.map((_, index: number) => (
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
              <CardTitle>Regalias por propiedad</CardTitle>
            </CardHeader>
            <CardContent>
              {regaliasPorPropiedad.length > 0 ? (
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={regaliasPorPropiedad}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => `CLP ${(Number(value) / 1000000).toFixed(1)}M`} />
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
            {estadoPagos.map((estado, idx: number) => (
              <Card key={idx}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{estado.estado}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{estado.cantidad}</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    CLP {(Number(estado.monto_total || 0) / 1000000).toFixed(1)}M
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
