'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import useSWR from 'swr';
import { ExportButtons } from '@/components/sostenibilidad/export-buttons';
import { SustainabilityKPIDashboard } from '@/components/sostenibilidad/kpi-dashboard';

const fetcher = (url: string) => fetch(url).then(r => r.json());

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

  const { data: inspecciones = [] } = useSWR(
    '/api/sostenibilidad/inspecciones?tipo=internas',
    fetcher
  );

  const inspeccionesList = (inspecciones.data || []) as any[];

  // Agrupar datos por período
  const generateReportData = () => {
    const reportData: ReportData[] = [];
    
    if (periodoTipo === 'mes') {
      const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      for (let i = 0; i < meses.length; i++) {
        const mesInspecciones = inspeccionesList.filter((insp: any) => {
          const date = new Date(insp.fecha_planificada);
          return date.getMonth() === i && date.getFullYear().toString() === anio;
        });
        
        reportData.push({
          periodo: meses[i],
          inspecciones: mesInspecciones.length,
          hallazgos: mesInspecciones.reduce((sum, i) => sum + (i.hallazgos_count || 0), 0),
          cumplimiento: mesInspecciones.filter(i => i.estado === 'realizada').length,
        });
      }
    } else if (periodoTipo === 'trimestre') {
      const trimestres = ['Q1', 'Q2', 'Q3', 'Q4'];
      const mesRanges = [[0, 2], [3, 5], [6, 8], [9, 11]];
      
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
          hallazgos: trimInspecciones.reduce((sum, i) => sum + (i.hallazgos_count || 0), 0),
          cumplimiento: trimInspecciones.filter(i => i.estado === 'realizada').length,
        });
      });
    }

    return reportData;
  };

  const reportData = generateReportData();

  // Datos por estado
  const estadoData = [
    {
      name: 'Planificadas',
      value: inspeccionesList.filter(i => i.estado === 'planificada').length,
    },
    {
      name: 'Realizadas',
      value: inspeccionesList.filter(i => i.estado === 'realizada').length,
    },
    {
      name: 'Cerradas',
      value: inspeccionesList.filter(i => i.estado === 'cerrada').length,
    },
  ];

  // Datos por faena
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Reportes de Sostenibilidad</h1>
        <p className="text-muted-foreground">Análisis comparativo por período de inspecciones, hallazgos y KPIs</p>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="kpi" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="kpi">Dashboard KPI</TabsTrigger>
          <TabsTrigger value="detailed">Análisis Detallado</TabsTrigger>
        </TabsList>

        {/* KPI Dashboard Tab */}
        <TabsContent value="kpi" className="space-y-6">
          <SustainabilityKPIDashboard />
        </TabsContent>

        {/* Detailed Analysis Tab */}
        <TabsContent value="detailed" className="space-y-6">
      {/* Controles de período */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Configurar Período</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Tipo de Período</label>
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
              <label className="block text-sm font-medium mb-2">Año</label>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Inspecciones</CardTitle>
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
              {inspeccionesList.filter(i => i.estado === 'realizada').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Hallazgos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">
              {inspeccionesList.reduce((sum, i) => sum + (i.hallazgos_count || 0), 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">% Cumplimiento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {inspeccionesList.length > 0 
                ? Math.round((inspeccionesList.filter(i => i.estado === 'realizada').length / inspeccionesList.length) * 100)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Gráfico de Línea - Tendencia */}
        <Card>
          <CardHeader>
            <CardTitle>Tendencia de Inspecciones</CardTitle>
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
                <Line
                  type="monotone"
                  dataKey="inspecciones"
                  stroke="#f59e0b"
                  name="Inspecciones"
                />
                <Line
                  type="monotone"
                  dataKey="cumplimiento"
                  stroke="#10b981"
                  name="Completadas"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Barras - Hallazgos */}
        <Card>
          <CardHeader>
            <CardTitle>Hallazgos por Período</CardTitle>
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

      {/* Pie Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Estado Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Estado</CardTitle>
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
                  <Cell fill="#f59e0b" />
                  <Cell fill="#10b981" />
                  <Cell fill="#6b7280" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Faena Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Inspecciones por Faena</CardTitle>
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
