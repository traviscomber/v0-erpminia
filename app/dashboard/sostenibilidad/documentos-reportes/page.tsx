'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Clock,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import {
  Bar,
  Cell,
  CartesianGrid,
  Legend,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const COLORS = ['#22c55e', '#f97316', '#ef4444', '#6b7280'];

type DocumentStep = {
  status?: string;
  approvedAt?: string;
};

type DashboardDocument = {
  id: string;
  title: string;
  status?: string;
  createdAt?: string;
  expiryDate?: string;
  steps?: DocumentStep[];
};

type DocumentsPayload = {
  documents?: DashboardDocument[];
  data?: DashboardDocument[];
};

const fetcher = async (url: string) => {
  const response = await fetch(url);
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || 'Request failed');
  }
  return payload;
};

function monthLabel(dateValue?: string) {
  if (!dateValue) return 'Sin fecha';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return date.toLocaleDateString('es-CL', { month: 'short' }).replace('.', '');
}

function approvalDays(document: DashboardDocument) {
  const createdAt = document.createdAt ? new Date(document.createdAt) : null;
  const approvedAt = document.steps
    ?.filter((step) => step.status === 'approved' && step.approvedAt)
    .map((step) => new Date(step.approvedAt as string).getTime())
    .sort((left, right) => right - left)[0];

  if (!createdAt || Number.isNaN(createdAt.getTime()) || !approvedAt) return null;

  return Math.max(0, Math.round(((approvedAt - createdAt.getTime()) / (1000 * 60 * 60 * 24)) * 10) / 10);
}

export default function DocumentosReportesPage() {
  const [activeTab, setActiveTab] = useState('overview');

  const { data: documentsData, error: documentsError } = useSWR<DocumentsPayload>(
    '/api/documents?limit=1000',
    fetcher,
    { revalidateOnFocus: false }
  );

  const documents = documentsData?.documents || documentsData?.data || [];
  const totalDocuments = documents.length;
  const approvedDocuments = documents.filter((document) => document.status === 'approved').length;
  const pendingDocuments = documents.filter((document) =>
    ['draft', 'submitted', 'under_review'].includes(String(document.status || ''))
  ).length;
  const expiredDocuments = documents.filter((document) => document.status === 'expired').length;

  const rejectionCount = useMemo(
    () => documents.filter((document) => document.status === 'rejected').length,
    [documents]
  );

  const averageApprovalDays = useMemo(() => {
    const values = documents
      .map(approvalDays)
      .filter((value): value is number => typeof value === 'number');

    if (values.length === 0) return 0;
    return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
  }, [documents]);

  const documentStats = useMemo(
    () => [
      { status: 'Aprobado', count: approvedDocuments },
      { status: 'Pendiente', count: pendingDocuments },
      { status: 'Rechazado', count: rejectionCount },
      { status: 'Vencido', count: expiredDocuments },
    ].map((item) => ({
      ...item,
      percentage: totalDocuments ? Math.round((item.count / totalDocuments) * 100) : 0,
    })),
    [approvedDocuments, expiredDocuments, pendingDocuments, rejectionCount, totalDocuments]
  );

  const approvalTimeline = useMemo(() => {
    const monthMap = new Map<
      string,
      { month: string; avgDays: number; count: number; totalDays: number }
    >();

    for (const document of documents) {
      const month = monthLabel(document.createdAt);
      const current = monthMap.get(month) || {
        month,
        avgDays: 0,
        count: 0,
        totalDays: 0,
      };

      const days = approvalDays(document);
      if (typeof days === 'number') {
        current.totalDays += days;
        current.count += 1;
      }

      monthMap.set(month, current);
    }

    return Array.from(monthMap.values())
      .map((item) => ({
        month: item.month,
        avgDays: item.count ? Math.round((item.totalDays / item.count) * 10) / 10 : 0,
        count: item.count,
      }))
      .slice(-6);
  }, [documents]);

  const overdueDocuments = useMemo(() => {
    const now = new Date();

    return documents
      .filter((document) =>
        ['draft', 'submitted', 'under_review'].includes(String(document.status || ''))
      )
      .map((document) => {
        const createdAt = document.createdAt ? new Date(document.createdAt) : null;
        const daysOpen =
          createdAt && !Number.isNaN(createdAt.getTime())
            ? Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
            : 0;

        return {
          id: document.id,
          title: document.title,
          daysOverdue: Math.max(daysOpen - 7, 0),
          approvalLevel: document.steps?.find((step) => step.status === 'pending')
            ? 'Pendiente'
            : 'En revisión',
        };
      })
      .filter((document) => document.daysOverdue > 0)
      .sort((left, right) => right.daysOverdue - left.daysOverdue)
      .slice(0, 10);
  }, [documents]);

  const hasError = Boolean(documentsError);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reportería documental</h1>
          <p className="mt-2 text-muted-foreground">
            Análisis operativo del flujo de aprobación documental, tiempos de respuesta y vencimientos.
          </p>
        </div>
        <Badge variant="outline" className="gap-2">
          <BarChart3 className="h-4 w-4" />
          Datos en vivo
        </Badge>
      </div>

      {hasError && (
        <Card className="border-destructive/30">
          <CardContent className="flex items-center gap-3 pt-6 text-sm">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span>No fue posible cargar toda la reportería documental.</span>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-secondary" />
              Total aprobados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{approvedDocuments}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {totalDocuments ? Math.round((approvedDocuments / totalDocuments) * 100) : 0}% del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="h-4 w-4 text-primary" />
              Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingDocuments}</div>
            <p className="mt-1 text-xs text-muted-foreground">Documentos en revisión</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <XCircle className="h-4 w-4 text-destructive" />
              Rechazados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{rejectionCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {totalDocuments ? Math.round((rejectionCount / totalDocuments) * 100) : 0}% del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-secondary" />
              Tiempo promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{averageApprovalDays}</div>
            <p className="mt-1 text-xs text-muted-foreground">días de aprobación</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="timeline">Tendencia</TabsTrigger>
          <TabsTrigger value="overdue">Vencidos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribución por estado</CardTitle>
                <CardDescription>Documentos por estado dentro del flujo de aprobación</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={documentStats}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ status, percentage }) => `${status} ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="status"
                    >
                      {documentStats.map((entry, index) => (
                        <Cell key={`${entry.status}-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Desglose por estado</CardTitle>
                <CardDescription>Consolidado del flujo documental</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {documentStats.map((item, index) => (
                    <div
                      key={item.status}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: COLORS[index] }}
                        />
                        <span className="text-sm font-medium">{item.status}</span>
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
              <CardTitle>Tiempo promedio de aprobación</CardTitle>
              <CardDescription>Tendencia mensual de documentos procesados</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={approvalTimeline}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" label={{ value: 'Días', angle: -90, position: 'insideLeft' }} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    label={{ value: 'Cantidad', angle: 90, position: 'insideRight' }}
                  />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="avgDays"
                    stroke="#f97316"
                    name="Promedio (días)"
                    strokeWidth={2}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="count"
                    fill="#22c55e"
                    name="Documentos procesados"
                    opacity={0.3}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overdue">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Documentos vencidos en aprobación
              </CardTitle>
              <CardDescription>
                Documentos pendientes con más de 7 días abiertos en revisión
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {overdueDocuments.length > 0 ? (
                  overdueDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 p-3"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">{doc.approvalLevel}</p>
                      </div>
                      <Badge variant="destructive">{doc.daysOverdue} días</Badge>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center">
                    <CheckCircle2 className="mx-auto mb-2 h-12 w-12 text-secondary" />
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
