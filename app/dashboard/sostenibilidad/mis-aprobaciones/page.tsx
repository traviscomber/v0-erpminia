'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, FileText, Hourglass, ShieldCheck } from 'lucide-react';

type ApprovalStep = {
  approval_level?: number | null;
  approval_level_name?: string | null;
  status?: string | null;
  required_role?: string | null;
};

type SustainabilityDocument = {
  id: string;
  title?: string | null;
  documento_nombre?: string | null;
  description?: string | null;
  descripcion?: string | null;
  status?: string | null;
  estado?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
  document_approvals?: ApprovalStep[];
};

type DocumentsResponse = {
  data?: SustainabilityDocument[];
};

const fetcher = async (url: string): Promise<DocumentsResponse> => {
  const response = await fetch(url);
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || 'No se pudieron cargar las aprobaciones');
  return data;
};

function normalizeStatus(status?: string | null) {
  const value = String(status || '').toLowerCase();
  if (['approved', 'aprobado', 'completed', 'completado'].includes(value)) return 'approved';
  if (['rejected', 'rechazado'].includes(value)) return 'rejected';
  if (['under_review', 'review', 'pending_review'].includes(value)) return 'under_review';
  return 'pending';
}

function getDocumentTitle(doc: SustainabilityDocument) {
  return doc.title || doc.documento_nombre || 'Documento sin título';
}

function getDocumentDescription(doc: SustainabilityDocument) {
  return doc.description || doc.descripcion || 'Sin descripción disponible';
}

function getCreatedDateLabel(doc: SustainabilityDocument) {
  const rawDate = doc.created_at || doc.createdAt;
  if (!rawDate) return 'Sin fecha';

  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return 'Sin fecha';

  return parsed.toLocaleDateString('es-CL');
}

export default function MisAprobacionesPage() {
  const { data, isLoading } = useSWR('/api/sostenibilidad/documentos-flujo?limit=100', fetcher);

  const documents = data?.data || [];

  const pendingApprovals = useMemo(
    () =>
      documents.filter((doc) => {
        const status = normalizeStatus(doc.status || doc.estado);
        return status === 'pending' || status === 'under_review';
      }),
    [documents]
  );

  const approvedDocuments = useMemo(
    () => documents.filter((doc) => normalizeStatus(doc.status || doc.estado) === 'approved'),
    [documents]
  );

  const rejectedDocuments = useMemo(
    () => documents.filter((doc) => normalizeStatus(doc.status || doc.estado) === 'rejected'),
    [documents]
  );

  const totalApprovalSteps = useMemo(
    () => documents.reduce((sum, doc) => sum + (doc.document_approvals?.length || 0), 0),
    [documents]
  );

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="mb-2 text-4xl font-bold text-foreground">Mis Aprobaciones</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
          Seguimiento real del flujo documental de sostenibilidad y sus validaciones pendientes.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline">Pendientes {pendingApprovals.length}</Badge>
            <Badge variant="outline">Aprobados {approvedDocuments.length}</Badge>
            <Badge variant="outline">Rechazados {rejectedDocuments.length}</Badge>
            <Badge className="bg-secondary/10 text-secondary border-secondary/30">
              Etapas {totalApprovalSteps}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Hourglass className="h-4 w-4 text-primary" />
              Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingApprovals.length}</div>
            <p className="text-xs text-muted-foreground">Documentos en espera de revisión</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4 text-secondary" />
              Aprobados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-secondary">{approvedDocuments.length}</div>
            <p className="text-xs text-muted-foreground">Documentos cerrados correctamente</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="h-4 w-4 text-destructive" />
              Rechazados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{rejectedDocuments.length}</div>
            <p className="text-xs text-muted-foreground">Documentos devueltos al flujo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4 text-primary" />
              Etapas activas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalApprovalSteps}</div>
            <p className="text-xs text-muted-foreground">Pasos de revisión en curso</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Documentos pendientes de aprobación</CardTitle>
          <CardDescription>Consulta el estado del flujo y el avance por etapa.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : pendingApprovals.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No hay aprobaciones pendientes.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingApprovals.map((doc) => {
                const docTitle = getDocumentTitle(doc);
                const docDescription = getDocumentDescription(doc);
                const approvals = doc.document_approvals || [];
                const pendingSteps = approvals.filter((step) => normalizeStatus(step.status) === 'pending');

                return (
                  <div key={doc.id} className="rounded-xl border border-border bg-card p-4 space-y-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <h3 className="font-semibold text-lg">{docTitle}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">{docDescription}</p>
                        <p className="text-xs text-muted-foreground">Creado: {getCreatedDateLabel(doc)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">Pendientes: {pendingSteps.length}</Badge>
                        <Badge className="bg-primary/10 text-primary border-primary/30">
                          Flujo activo
                        </Badge>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      {approvals.map((step, index) => {
                        const stepStatus = normalizeStatus(step.status);
                        return (
                          <div
                            key={`${doc.id}-${step.approval_level || index}`}
                            className="rounded-lg border border-border/70 bg-muted/20 p-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium text-sm">
                                {step.approval_level_name || `Etapa ${step.approval_level || index + 1}`}
                              </p>
                              <Badge
                                variant={stepStatus === 'approved' ? 'default' : 'outline'}
                                className={
                                  stepStatus === 'approved'
                                    ? 'bg-secondary/10 text-secondary border-secondary/30'
                                    : stepStatus === 'rejected'
                                      ? 'bg-destructive/10 text-destructive border-destructive/30'
                                      : 'bg-primary/10 text-primary border-primary/30'
                                }
                              >
                                {stepStatus === 'approved'
                                  ? 'Aprobado'
                                  : stepStatus === 'rejected'
                                    ? 'Rechazado'
                                    : 'Pendiente'}
                              </Badge>
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">
                              Rol requerido: {step.required_role || 'No definido'}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resumen del flujo</CardTitle>
          <CardDescription>Estado consolidado del módulo documental de sostenibilidad.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Documentos cerrados</p>
            <p className="text-2xl font-bold">{approvedDocuments.length}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Documentos rechazados</p>
            <p className="text-2xl font-bold text-destructive">{rejectedDocuments.length}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Revisión activa</p>
            <p className="text-2xl font-bold text-primary">{pendingApprovals.length}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
