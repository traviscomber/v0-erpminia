'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Bar, BarChart, Cell, CartesianGrid, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExportButtons } from '@/components/sostenibilidad/export-buttons';
import { SustainabilityKPIDashboard } from '@/components/sostenibilidad/kpi-dashboard';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    return null;
  }

  return payload;
};

interface ReportData {
  periodo: string;
  inspecciones: number;
  hallazgos: number;
  cumplimiento: number;
}

const estadoColors = {
  planificada: '#f59e0b',
  realizada: '#10b981',
  cerrada: '#6b7280',
};

export default function ReportesPage() {
  const [periodoTipo, setPeriodoTipo] = useState('mes');
  const [anio, setAnio] = useState(new Date().getFullYear().toString());

  const { data: inspecciones = [] } = useSWR('/api/sostenibilidad/inspecciones?tipo=internas', fetcher);
  const inspeccionesList = (inspecciones.data || []) as any[];

  const generateReportData = () => {
    const reportData: ReportData[] = [];

    if (periodoTipo === 'mes') {
      const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      for (let i = 0; i < meses.length; i += 1) {
        const mesInspecciones = inspeccionesList.filter((insp: any) => {
          const date = new Date(insp.fecha_planificada);
          return date.getMonth() === i && date.getFullYear().toString() === anio;
        });

        reportData.push({
          periodo: meses[i],
          inspecciones: mesInspecciones.length,
          hallazgos: mesInspecciones.reduce((sum, item) => sum + (item.hallazgos_count || 0), 0),
          cumplimiento: mesInspecciones.filter((item) => item.estado === 'realizada').length,
        });
      }
    } else if (periodoTipo === 'trimestre') {
      const trimestres = ['Q1', 'Q2', 'Q3', 'Q4'];
      const mesRanges = [
        [0, 2],
        [3, 5],
        [6, 8],
        [9, 11],
      ];

      trimestres.forEach((trim, idx) => {
        const [start, end] = mesRanges[idx];
        const trimInspecciones = inspeccionesList.filter((insp: any) => {
          const date = new Date(insp.fecha_planificada);
          const month = date.getMonth();
          return month >= start && month <= end && date.getFullYear().toString() === anio;
        });

        reportData.push({
          periodo: trim,
          inspecciones: trimInspecciones.length,
          hallazgos: trimInspecciones.reduce((sum, item) => sum + (item.hallazgos_count || 0), 0),
          cumplimiento: trimInspecciones.filter((item) => item.estado === 'realizada').length,
        });
      });
    }

    return reportData;
  };

  const reportData = generateReportData();

  const estadoData = [
    { name: 'Planificadas', value: inspeccionesList.filter((item) => item.estado === 'planificada').length },
    { name: 'Realizadas', value: inspeccionesList.filter((item) => item.estado === 'realizada').length },
    { name: 'Cerradas', value: inspeccionesList.filter((item) => item.estado === 'cerrada').length },
  ];

  const faenaData = Object.entries(
    inspeccionesList.reduce((acc: any, insp) => {
      const faena = insp.faena || insp.area_faena || 'Sin asignar';
      acc[faena] = (acc[faena] || 0) + 1;
      return acc;
    }, {})
  ).map(([faena, count]) => ({
    name: faena,
    inspecciones: count,
  }));

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-foreground">Reportes de sostenibilidad</h1>
          <p className="text-muted-foreground">
            Análisis comparativo por período de inspecciones, hallazgos y KPIs.
          </p>
        </div>
      </div>

      <Card className="mb-8 rounded-xl border shadow-none">
        <CardHeader>
          <CardTitle className="text-sm">Actualización rápida por Excel</CardTitle>
          <CardDescription>Enlaces directos para cargar o actualizar las bases operativas más usadas.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Button asChild variant="outline" className="justify-between">
            <Link href="/dashboard/sostenibilidad/prevencion-riesgos/inspecciones/importar">Inspecciones</Link>
          </Button>
          <Button asChild variant="outline" className="justify-between">
            <Link href="/dashboard/sostenibilidad/prevencion-riesgos/inspecciones-externas/importar">Inspecciones externas</Link>
          </Button>
          <Button asChild variant="outline" className="justify-between">
            <Link href="/dashboard/sostenibilidad/prevencion-riesgos/epp/importar">EPP</Link>
          </Button>
          <Button asChild variant="outline" className="justify-between">
            <Link href="/dashboard/sostenibilidad/prevencion-riesgos/capacitaciones/importar">Capacitaciones</Link>
          </Button>
          <Button asChild variant="outline" className="justify-between">
            <Link href="/dashboard/sostenibilidad/no-conformidades/importar">No conformidades</Link>
          </Button>
          <Button asChild variant="outline" className="justify-between">
            <Link href="/dashboard/sostenibilidad/prevencion-riesgos/acciones-correctivas/importar">Acciones correctivas</Link>
          </Button>
          <Button asChild variant="outline" className="justify-between">
            <Link href="/dashboard/sostenibilidad/medio-ambiente/importar">Medio ambiente</Link>
          </Button>
          <Button asChild variant="outline" className="justify-between">
            <Link href="/dashboard/sostenibilidad/comunidades/importar">Comunidades</Link>
          </Button>
          <Button asChild variant="outline" className="justify-between">
            <Link href="/dashboard/sostenibilidad/documentos-flujo/importar">Flujo documental</Link>
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="kpi" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="kpi">Panel de KPI</TabsTrigger>
          <TabsTrigger value="detailed">Análisis detallado</TabsTrigger>
        </TabsList>

        <TabsContent value="kpi" className="space-y-6">
          <SustainabilityKPIDashboard />
        </TabsContent>

        <TabsContent value="detailed" className="space-y-6">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Configurar periodo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 md:flex-row md:items-end">
                <div className="flex-1">
                  <label className="mb-2 block text-sm font-medium">Tipo de periodo</label>
                  <Select value={periodoTipo} onValueChange={setPeriodoTipo}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mes">Mensual</SelectItem>
                      <SelectItem value="trimestre">Trimestral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="mb-2 block text-sm font-medium">Año</label>
                  <Input
                    type="number"
                    value={anio}
                    onChange={(e) => setAnio(e.target.value)}
                    min={2020}
                    max={2099}
                  />
                </div>
                <div>
                  <ExportButtons
                    data={reportData}
                    fileName={`Reporte_${periodoTipo}_${anio}`}
                    columns={[
                      { key: 'periodo', label: 'Período' },
                      { key: 'inspecciones', label: 'Inspecciones' },
                      { key: 'hallazgos', label: 'Hallazgos' },
                      { key: 'cumplimiento', label: 'Cumplimiento' },
                    ]}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total de inspecciones</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{inspeccionesList.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Realizadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-secondary">
                  {inspeccionesList.filter((item) => item.estado === 'realizada').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total de hallazgos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-destructive">
                  {inspeccionesList.reduce((sum, item) => sum + (item.hallazgos_count || 0), 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">% de cumplimiento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  {inspeccionesList.length > 0
                    ? Math.round(
                        (inspeccionesList.filter((item) => item.estado === 'realizada').length /
                          inspeccionesList.length) *
                          100
                      )
                    : 0}
                  %
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Tendencia de inspecciones</CardTitle>
                <CardDescription>Inspecciones por {periodoTipo === 'mes' ? 'mes' : 'trimestre'}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={reportData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="periodo" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="inspecciones" stroke="#f59e0b" name="Inspecciones" />
                    <Line type="monotone" dataKey="cumplimiento" stroke="#10b981" name="Completadas" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Hallazgos por período</CardTitle>
                <CardDescription>Cantidad de hallazgos encontrados</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reportData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="periodo" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="hallazgos" fill="#ef4444" name="Hallazgos" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribución por estado</CardTitle>
                <CardDescription>Total de inspecciones por estado</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={estadoData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill={estadoColors.planificada} />
                      <Cell fill={estadoColors.realizada} />
                      <Cell fill={estadoColors.cerrada} />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inspecciones por faena</CardTitle>
                <CardDescription>Distribución de inspecciones por zona operativa</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={faenaData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="inspecciones" fill="#f59e0b" name="Inspecciones" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
