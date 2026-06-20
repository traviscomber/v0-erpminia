'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertCircle, CheckCircle2, Clock, TrendingUp, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type DocumentStep = {
  status: string;
  approvedAt: string;
};

type DashboardDocument = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  expiryDate: string;
  steps: DocumentStep[];
};

const fetcher = async (url: string) => {
  const response = await fetch(url);
  const payload = await response.json().catch(() => null);
  if (!response.ok) return null;
  return payload;
};

function approvalDays(document: DashboardDocument) {
  const createdAt = document.createdAt ? new Date(document.createdAt) : null;
  const approvedAt = document.steps
    .filter((step) => step.status === 'approved' && step.approvedAt)
    .map((step) => new Date(step.approvedAt).getTime())
    .sort((a, b) => b - a)[0];

  if (!createdAt || Number.isNaN(createdAt.getTime()) || !approvedAt) return null;
  return Math.max(0, Math.round(((approvedAt - createdAt.getTime()) / (1000 * 60 * 60 * 24)) * 10) / 10);
}

export default function DocumentosReportesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: statsData, error: statsError } = useSWR('/api/documents/stats', fetcher, {
    revalidateOnFocus: false,
  });
  const { data: documentsData, error: documentsError } = useSWR('/api/documents/list?limit=200', fetcher, {
    revalidateOnFocus: false,
  });

  const documents = (documentsData?.documents || []) as DashboardDocument[];
  const filteredDocuments = documents.filter((doc) =>
    (doc.title || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalDocuments = statsData?.total ?? documents.length;
  const approvedDocuments = statsData?.approved ?? 0;
  const pendingDocuments = statsData?.pending ?? 0;
  const expiredDocuments = statsData?.expired ?? 0;

  const rejectedDocuments = useMemo(() => documents.filter((doc) => doc.status === 'rejected').length, [documents]);

  const averageApprovalDays = useMemo(() => {
    const values = documents.map(approvalDays).filter((value): value is number => typeof value === 'number');
    if (values.length === 0) return 0;
    return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
  }, [documents]);

  const overdueDocuments = useMemo(() => {
    const now = new Date();
    return documents
      .filter((document) => ['draft', 'submitted', 'under_review', 'pending'].includes(String(document.status || '')))
      .map((document) => {
        const createdAt = document.createdAt ? new Date(document.createdAt) : null;
        const daysOpen =
          createdAt && !Number.isNaN(createdAt.getTime())
            ? Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
            : 0;

        return {
          id: document.id,
          title: document.title,
          daysOpen,
          daysOverdue: Math.max(daysOpen - 7, 0),
        };
      })
      .filter((document) => document.daysOverdue > 0)
      .sort((left, right) => right.daysOverdue - left.daysOverdue)
      .slice(0, 10);
  }, [documents]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reporte de documentos</h1>
        <p className="mt-2 text-muted-foreground">Análisis y seguimiento del flujo de aprobación documental</p>
      </div>

      {(statsError || documentsError) && (
        <Card className="border-destructive/30">
          <CardContent className="flex items-center gap-3 pt-6 text-sm">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span>No fue posible cargar el reporte documental.</span>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-secondary" />
              Aprobados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{approvedDocuments}</div>
            <p className="mt-1 text-xs text-muted-foreground">{totalDocuments ? Math.round((approvedDocuments / totalDocuments) * 100) : 0}% del total</p>
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
            <p className="mt-1 text-xs text-muted-foreground">En revisión</p>
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
            <div className="text-3xl font-bold">{rejectedDocuments}</div>
            <p className="mt-1 text-xs text-muted-foreground">{totalDocuments ? Math.round((rejectedDocuments / totalDocuments) * 100) : 0}% del total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-secondary" />
              Promedio aprobación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{averageApprovalDays}</div>
            <p className="mt-1 text-xs text-muted-foreground">Días</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Documentos recientes</CardTitle>
          <CardDescription>Listado resumido de documentos cargados en el sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar documento..."
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />

          <div className="space-y-2">
            {filteredDocuments.slice(0, 8).map((doc) => (
              <div key={doc.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('es-CL') : 'Sin fecha'}</p>
                </div>
                <Badge variant="outline">{doc.status}</Badge>
              </div>
            ))}
            {filteredDocuments.length === 0 && (
              <p className="py-6 text-center text-muted-foreground">No hay documentos para mostrar.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documentos vencidos</CardTitle>
          <CardDescription>Documentos pendientes con más de 7 días abiertos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {overdueDocuments.length > 0 ? (
            overdueDocuments.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                <div className="flex-1">
                  <p className="font-medium">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">{doc.daysOpen} días abiertos</p>
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
        </CardContent>
      </Card>
    </div>
  );
}
