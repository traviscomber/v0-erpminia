'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Eye,
  FileText,
  Plus,
  Search,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentUpload } from '@/components/sostenibilidad/document-upload';

type ApprovalStep = {
  id?: string;
  approval_level: number;
  approval_level_name: string;
  required_role: string;
  status: string;
  assigned_to_name?: string;
  approved_by_name?: string;
  comments?: string;
  rejection_reason?: string;
  approved_at?: string;
};

type DocumentoFlujo = {
  id: string;
  title?: string;
  documento_nombre?: string;
  description?: string;
  descripcion?: string;
  archivo_url?: string;
  status?: string;
  estado?: string;
  creator_name?: string;
  creador_nombre?: string;
  created_at?: string;
  document_approvals?: ApprovalStep[];
};

type ApiResponse = {
  success?: boolean;
  data?: DocumentoFlujo[];
  total?: number;
  error?: string;
};

const estadoSteps = [
  'borrador',
  'pendiente_validador1',
  'aprobado_validador1',
  'pendiente_validador2',
  'aprobado_final',
];

const fetcher = async (url: string): Promise<ApiResponse> => {
  const response = await fetch(url);
  const payload = (await response.json().catch(() => null)) as ApiResponse | null;
  if (!response.ok) {
    throw new Error(payload?.error || 'No fue posible cargar el flujo documental');
  }
  return payload || {};
};

function normalizeStatus(documento: DocumentoFlujo) {
  return String(documento.status || documento.estado || 'borrador').toLowerCase();
}

function getFlowBucket(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes('reject')) return 'rechazado';
  if (normalized.includes('approved') || normalized.includes('aprobado')) return 'aprobado';
  if (
    normalized.includes('pending') ||
    normalized.includes('pendiente') ||
    normalized.includes('submitted') ||
    normalized.includes('under_review') ||
    normalized.includes('review')
  ) {
    return 'pendiente';
  }
  return 'borrador';
}

function getStatusMeta(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes('reject')) {
    return { label: 'Rechazado', className: 'bg-destructive/10 text-destructive', icon: AlertCircle };
  }
  if (normalized.includes('approved') || normalized.includes('aprobado')) {
    return { label: 'Aprobado', className: 'bg-secondary/10 text-secondary', icon: CheckCircle };
  }
  if (normalized.includes('pending') || normalized.includes('pendiente') || normalized.includes('review')) {
    return { label: 'En revisión', className: 'bg-primary/10 text-primary', icon: Clock };
  }
  return { label: 'Borrador', className: 'bg-muted text-muted-foreground', icon: FileText };
}

function formatApprovalStep(step?: ApprovalStep, levelFallback?: number) {
  if (!step) {
    return {
      title: levelFallback === 2 ? 'Gerente General' : 'Jefe de Sostenibilidad',
      subtitle: 'Pendiente de revisión',
      badge: 'Pendiente',
      tone: 'text-muted-foreground',
    };
  }

  const pending = step.status === 'pending';
  const approved = step.status === 'approved';
  const rejected = step.status === 'rejected';

  return {
    title: step.approval_level_name,
    subtitle: pending
      ? `Asignado a ${step.assigned_to_name || step.required_role}`
      : approved
        ? `Aprobado por ${step.approved_by_name || 'el validador'}`
        : `Rechazado${step.approved_by_name ? ` por ${step.approved_by_name}` : ''}`,
    badge: pending ? 'Pendiente' : approved ? 'Aprobado' : rejected ? 'Rechazado' : step.status,
    tone: pending ? 'text-primary' : approved ? 'text-secondary' : 'text-destructive',
  };
}

export default function FlujoDocumentalPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadFileUrl, setUploadFileUrl] = useState('');
  const [uploadFileName, setUploadFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    documento_nombre: '',
    descripcion: '',
    archivo_url: '',
  });

  const { data, error, isLoading, mutate } = useSWR<ApiResponse>(
    '/api/sostenibilidad/documentos-flujo?limit=200',
    fetcher,
    { revalidateOnFocus: false }
  );

  const documentos = data?.data || [];

  const filteredDocs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return documentos.filter((doc) => {
      const title = String(doc.documento_nombre || doc.title || '');
      const id = String(doc.id || '');
      const creator = String(doc.creador_nombre || doc.creator_name || '');

      const matchesSearch =
        !term ||
        title.toLowerCase().includes(term) ||
        id.toLowerCase().includes(term) ||
        creator.toLowerCase().includes(term);

      return matchesSearch;
    });
  }, [documentos, searchTerm]);

  const summary = useMemo(() => {
    const pending = documentos.filter((doc) => getFlowBucket(normalizeStatus(doc)) === 'pendiente').length;
    const approved = documentos.filter((doc) => getFlowBucket(normalizeStatus(doc)) === 'aprobado').length;
    const rejected = documentos.filter((doc) => getFlowBucket(normalizeStatus(doc)) === 'rechazado').length;
    const drafts = documentos.filter((doc) => getFlowBucket(normalizeStatus(doc)) === 'borrador').length;

    return {
      total: documentos.length,
      drafts,
      pending,
      approved,
      rejected,
    };
  }, [documentos]);

  const handleUploadSuccess = (fileUrl: string, fileName: string) => {
    setUploadFileUrl(fileUrl);
    setUploadFileName(fileName);
    setFormData((prev) => ({
      ...prev,
      archivo_url: fileUrl,
      documento_nombre: prev.documento_nombre || fileName.replace(/\.[^.]+$/, ''),
    }));
    toast.success('Archivo cargado. Completa el nombre y la descripción para continuar.');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formData.documento_nombre.trim() || !formData.archivo_url.trim()) {
      toast.error('Falta completar el nombre del documento o el archivo cargado.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/sostenibilidad/documentos-flujo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.documento_nombre,
          description: formData.descripcion,
          file_url: formData.archivo_url,
          category: 'sostenibilidad',
          document_type: 'document',
        }),
      });

      const payload = (await response.json().catch(() => null)) as ApiResponse | null;
      if (!response.ok) {
        throw new Error(payload?.error || 'No fue posible crear el documento');
      }

      toast.success('Documento creado y enviado al flujo de aprobación.');
      setIsModalOpen(false);
      setFormData({ documento_nombre: '', descripcion: '', archivo_url: '' });
      setUploadFileUrl('');
      setUploadFileName('');
      mutate();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Error al crear documento';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-foreground">Flujo de aprobación de documentos</h1>
          <p className="text-muted-foreground">
            Workflow de dos validadores con trazabilidad desde borrador hasta aprobación final.
          </p>
        </div>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo documento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nuevo documento</DialogTitle>
              <DialogDescription>
                Carga un archivo y completa los datos para enviarlo al flujo de aprobación.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-base font-semibold">1. Subir archivo</Label>
                <DocumentUpload
                  onUploadSuccess={handleUploadSuccess}
                  maxSizeMB={10}
                  acceptedTypes={['.pdf', '.doc', '.docx', '.xlsx', '.xls', '.txt']}
                />
              </div>

              <div className="space-y-4 border-t pt-6">
                <Label className="text-base font-semibold">2. Datos del documento</Label>

                <div className="space-y-2">
                  <Label htmlFor="documento_nombre">Nombre del documento</Label>
                  <Input
                    id="documento_nombre"
                    value={formData.documento_nombre}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, documento_nombre: event.target.value }))
                    }
                    placeholder="Procedimiento de Seguridad en Alturas"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descripcion">Descripción</Label>
                  <textarea
                    id="descripcion"
                    value={formData.descripcion}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, descripcion: event.target.value }))
                    }
                    placeholder="Descripción breve del documento"
                    className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                {uploadFileUrl && (
                  <div className="rounded-md border border-secondary/40 bg-secondary/10 p-3">
                    <p className="text-sm text-secondary">Archivo cargado correctamente</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {uploadFileName || uploadFileUrl.split('/').pop()}
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsModalOpen(false);
                      setFormData({ documento_nombre: '', descripcion: '', archivo_url: '' });
                      setUploadFileUrl('');
                      setUploadFileName('');
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={!formData.archivo_url || isSubmitting}>
                    {isSubmitting ? 'Creando...' : 'Crear documento'}
                  </Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Card className="mb-6 border-destructive/30">
          <CardContent className="flex items-center gap-3 pt-6 text-sm">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span>No fue posible cargar el flujo documental.</span>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Borradores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.drafts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">En revisión</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Aprobados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.approved}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-sm">Fases de aprobación</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 overflow-x-auto pb-4">
            {estadoSteps.map((paso, idx) => (
              <div key={paso} className="flex items-center gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                      idx === 0 ? 'bg-[var(--brand-naranja)] text-white' : 'bg-white/10 text-muted-foreground'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <span className="mt-1 max-w-20 text-center text-xs capitalize text-muted-foreground">
                    {paso.replace(/_/g, ' ')}
                  </span>
                </div>
                {idx < estadoSteps.length - 1 && <div className="h-0.5 w-8 bg-white/10" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="todas" className="mb-8">
        <TabsList>
          <TabsTrigger value="todas">Todos ({summary.total})</TabsTrigger>
          <TabsTrigger value="borrador">Borradores ({summary.drafts})</TabsTrigger>
          <TabsTrigger value="pendiente">En revisión ({summary.pending})</TabsTrigger>
          <TabsTrigger value="aprobado">Aprobados ({summary.approved})</TabsTrigger>
          <TabsTrigger value="rechazado">Rechazados ({summary.rejected})</TabsTrigger>
        </TabsList>

        <TabsContent value="todas" className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Buscar documento..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="flex-1"
            />
            <Button variant="outline" size="icon" aria-label="Buscar documento">
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {isLoading ? (
            <Card className="p-8 text-center text-muted-foreground">Cargando documentos...</Card>
          ) : filteredDocs.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">No hay documentos</Card>
          ) : (
            <div className="space-y-4">
              {filteredDocs.map((doc) => {
                const status = getStatusMeta(normalizeStatus(doc));
                const steps = doc.document_approvals || [];
                const step1 = formatApprovalStep(steps.find((step) => step.approval_level === 1), 1);
                const step2 = formatApprovalStep(steps.find((step) => step.approval_level === 2), 2);
                const StatusIcon = status.icon;

                return (
                  <Card key={doc.id} className="border-l-4 border-l-[var(--brand-naranja)]">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="mb-2 flex items-center gap-2">
                            <StatusIcon className="h-4 w-4" />
                            <h3 className="text-lg font-bold">{doc.documento_nombre || doc.title}</h3>
                            <Badge className={status.className}>{status.label}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {doc.descripcion || doc.description || 'Sin descripción'}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {doc.archivo_url && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={doc.archivo_url} target="_blank" rel="noreferrer">
                                <Download className="mr-1 h-4 w-4" />
                                Descargar
                              </a>
                            </Button>
                          )}
                          {doc.archivo_url && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={doc.archivo_url} target="_blank" rel="noreferrer">
                                <Eye className="mr-1 h-4 w-4" />
                                Ver
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="rounded-lg border border-white/10 p-4">
                          <h4 className="mb-3 flex items-center gap-2 font-bold text-sm">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                              1
                            </div>
                            {step1.title}
                          </h4>
                          <p className={`text-sm ${step1.tone}`}>{step1.subtitle}</p>
                          <div className="mt-3">
                            <Badge variant="outline">{step1.badge}</Badge>
                          </div>
                        </div>

                        <div className="rounded-lg border border-white/10 p-4">
                          <h4 className="mb-3 flex items-center gap-2 font-bold text-sm">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs text-secondary-foreground">
                              2
                            </div>
                            {step2.title}
                          </h4>
                          <p className={`text-sm ${step2.tone}`}>{step2.subtitle}</p>
                          <div className="mt-3">
                            <Badge variant="outline">{step2.badge}</Badge>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-white/10 pt-4 text-xs text-muted-foreground">
                        <span>Creador: {doc.creador_nombre || doc.creator_name || 'Sin dato'}</span>
                        <span>
                          {doc.created_at ? new Date(doc.created_at).toLocaleDateString('es-CL') : 'Sin fecha'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="borrador">
          <DocumentStatusList
            documents={filteredDocs.filter((doc) => getFlowBucket(normalizeStatus(doc)) === 'borrador')}
          />
        </TabsContent>

        <TabsContent value="pendiente">
          <DocumentStatusList
            documents={filteredDocs.filter((doc) => getFlowBucket(normalizeStatus(doc)) === 'pendiente')}
          />
        </TabsContent>

        <TabsContent value="aprobado">
          <DocumentStatusList
            documents={filteredDocs.filter((doc) => getFlowBucket(normalizeStatus(doc)) === 'aprobado')}
          />
        </TabsContent>

        <TabsContent value="rechazado">
          <DocumentStatusList
            documents={filteredDocs.filter((doc) => getFlowBucket(normalizeStatus(doc)) === 'rechazado')}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DocumentStatusList({ documents }: { documents: DocumentoFlujo[] }) {
  if (documents.length === 0) {
    return <Card className="p-8 text-center text-muted-foreground">No hay documentos con este estado.</Card>;
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => {
        const status = getStatusMeta(normalizeStatus(doc));

        return (
          <Card key={doc.id}>
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-semibold">{doc.documento_nombre || doc.title}</p>
                <p className="text-sm text-muted-foreground">{doc.creador_nombre || doc.creator_name}</p>
              </div>
              <Badge className={status.className}>{status.label}</Badge>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
