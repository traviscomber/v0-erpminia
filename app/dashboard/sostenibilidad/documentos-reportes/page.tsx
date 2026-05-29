'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertCircle, TrendingUp, Clock, CheckCircle2, XCircle } from 'lucide-react';

// Mock data for reporting
const mockDocumentStats = [
  { status: 'Aprobado', count: 45, percentage: 60 },
  { status: 'Pendiente', count: 20, percentage: 27 },
  { status: 'Rechazado', count: 8, percentage: 11 },
  { status: 'Borrador', count: 2, percentage: 2 },
];

const mockApprovalTimeData = [
  { month: 'Enero', avgDays: 3.2, count: 12 },
  { month: 'Febrero', avgDays: 2.8, count: 15 },
  { month: 'Marzo', avgDays: 3.5, count: 18 },
  { month: 'Abril', avgDays: 2.1, count: 20 },
  { month: 'Mayo', avgDays: 2.9, count: 16 },
  { month: 'Junio', avgDays: 2.5, count: 14 },
];

const mockOverdueDocuments = [
  { id: 1, title: 'Procedimiento Seguridad en Alturas', daysOverdue: 5, approvalLevel: 2 },
  { id: 2, title: 'Plan de Respuesta a Emergencias', daysOverdue: 2, approvalLevel: 1 },
];

const COLORS = ['#22c55e', '#f97316', '#ef4444', '#6b7280'];

export default function DocumentosReportesPage() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reportería de Documentos</h1>
        <p className="text-muted-foreground mt-2">
          Análisis y seguimiento del flujo de aprobación de documentos
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-secondary" />
              Total Aprobados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">45</div>
            <p className="text-xs text-muted-foreground mt-1">60% del total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">20</div>
            <p className="text-xs text-muted-foreground mt-1">En revisión</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <XCircle className="w-4 h-4 text-destructive" />
              Rechazados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">8</div>
            <p className="text-xs text-muted-foreground mt-1">11% del total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-secondary" />
              Tiempo Promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">2.8</div>
            <p className="text-xs text-muted-foreground mt-1">días de aprobación</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="overdue">Vencidos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Distribución por Estado</CardTitle>
                <CardDescription>Documentos por estado de aprobación</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={mockDocumentStats}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {mockDocumentStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Desglose por Estado</CardTitle>
                <CardDescription>Estadísticas detalladas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockDocumentStats.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[idx] }}
                        />
                        <span className="font-medium text-sm">{item.status}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{item.count}</span>
                        <Badge variant="outline">{item.percentage}%</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Tiempo Promedio de Aprobación</CardTitle>
              <CardDescription>Análisis de tendencia mensual</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={mockApprovalTimeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" label={{ value: 'Días', angle: -90, position: 'insideLeft' }} />
                  <YAxis yAxisId="right" orientation="right" label={{ value: 'Cantidad', angle: 90, position: 'insideRight' }} />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="avgDays" stroke="#f97316" name="Promedio (días)" strokeWidth={2} />
                  <Bar yAxisId="right" dataKey="count" fill="#22c55e" name="Documentos procesados" opacity={0.3} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overdue">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-destructive" />
                Documentos Vencidos en Aprobación
              </CardTitle>
              <CardDescription>Documentos que exceden el tiempo máximo de revisión</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockOverdueDocuments.length > 0 ? (
                  mockOverdueDocuments.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border border-destructive/20 rounded-lg bg-destructive/5">
                      <div className="flex-1">
                        <p className="font-medium">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">
                          En nivel {doc.approvalLevel}
                        </p>
                      </div>
                      <Badge variant="destructive">{doc.daysOverdue} días</Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-12 h-12 mx-auto text-secondary mb-2" />
                    <p className="text-muted-foreground">No hay documentos vencidos</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
