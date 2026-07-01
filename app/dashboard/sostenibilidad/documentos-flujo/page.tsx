'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, FileText, CheckCircle, Clock, AlertCircle, MessageSquare, Download, Eye, Upload } from 'lucide-react';
import useSWR from 'swr';
import { DocumentUpload } from '@/components/sostenibilidad/document-upload';
import { DocumentSearch } from '@/components/documentos/document-search';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface DocumentoFlujo {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  estado: string;
  document_approvals: Array<{
    id: string;
    approval_level: number;
    approval_level_name: string;
    required_role: string;
    status: string;
    assigned_to_name: string;
    approved_by_name: string;
    comments: string;
    rejection_reason: string;
    approved_at: string;
  }>;
  creador_nombre: string;
  created_at: string;
}

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json());

const estadoSteps = [
  'borrador',
  'pendiente_validador1',
  'aprobado_validador1',
  'pendiente_validador2',
  'aprobado_final',
];

function getApprovalLevel(doc: DocumentoFlujo, level: number) {
  return doc.document_approvals.find((approval) => approval.approval_level === level);
}

function getDocumentoStage(doc: DocumentoFlujo) {
  const status = String(doc.status || doc.estado || '').toLowerCase();
  if (status.includes('draft') || status.includes('borrador')) return 'borrador';
  if (status.includes('approved') || status.includes('aprobado')) return 'aprobado_final';
  if (status.includes('rejected')) return 'rechazado';

  const approval1 = getApprovalLevel(doc, 1);
  const approval2 = getApprovalLevel(doc, 2);

  if (!approval1 || approval1.status === 'pending') return 'pendiente_validador1';
  if (approval1.status === 'approved' && (!approval2 || approval2.status === 'pending')) return 'pendiente_validador2';
  if (approval2?.status === 'approved') return 'aprobado_final';
  if (approval1.status === 'rejected' || approval2?.status === 'rejected') return 'rechazado';

  return 'pendiente_validador1';
}

export default function FlujDocumentalPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    documento_nombre: '',
    descripcion: '',
    archivo_url: '',
  });

  const { data: documentos, mutate } = useSWR('/api/sostenibilidad/documentos-flujo', fetcher);
  const docList = Array.isArray(documentos?.data) ? (documentos.data as DocumentoFlujo[]) : [];

  const filteredDocs = docList.filter((doc) => {
    const title = doc.title || '';
    const id = doc.id || '';
    const status = getDocumentoStage(doc);
    
    return (
      (title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        id.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (!filterEstado || status === filterEstado)
    );
  });

  const docsByStage = (stage: string) => docList.filter((doc) => getDocumentoStage(doc) === stage);

  const renderDocumentCard = (doc: DocumentoFlujo) => (
    <Card key={doc.id} className="rounded-xl border border-border shadow-none">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getEstadoIcon(getDocumentoStage(doc))}
              <h3 className="text-lg font-bold">{doc.title}</h3>
              <Badge className={getEstadoColor(getDocumentoStage(doc))}>
                {getDocumentoStage(doc).replace(/_/g, ' ')}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{doc.description || 'Sin descripción'}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Eye className="w-4 h-4 mr-1" />
              Ver
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1" />
              Descargar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-border p-4 shadow-none">
            <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">1</div>
              {getApprovalLevel(doc, 1)?.approval_level_name || 'Jefe de Sostenibilidad'}
            </h4>
            {getApprovalLevel(doc, 1) ? (
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  <span className="font-medium">Revisor:</span> {getApprovalLevel(doc, 1)?.assigned_to_name || 'Sin asignar'}
                </p>
                <p className="text-muted-foreground">
                  <span className="font-medium">Accion:</span>
                  <Badge className="ml-2" variant="outline">
                    {getApprovalLevel(doc, 1)?.status || 'pending'}
                  </Badge>
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm italic">Pendiente de revisión</p>
            )}
          </div>

          <div className="rounded-xl border border-border p-4 shadow-none">
            <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs">2</div>
              {getApprovalLevel(doc, 2)?.approval_level_name || 'Gerente General'}
            </h4>
            {getApprovalLevel(doc, 2) ? (
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  <span className="font-medium">Revisor:</span> {getApprovalLevel(doc, 2)?.assigned_to_name || 'Sin asignar'}
                </p>
                <p className="text-muted-foreground">
                  <span className="font-medium">Accion:</span>
                  <Badge className="ml-2" variant="outline">
                    {getApprovalLevel(doc, 2)?.status || 'pending'}
                  </Badge>
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm italic">Pendiente de revisión V2</p>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/10 flex justify-between text-xs text-muted-foreground">
          <span>Creador: {doc.creador_nombre}</span>
          <span>{new Date(doc.created_at).toLocaleDateString('es-CL')}</span>
        </div>
      </CardContent>
    </Card>
  );

  const getEstadoColor = (estado: string) => {
    const statusMap: Record<string, string> = {
      borrador: 'bg-muted text-muted-foreground',
      draft: 'bg-muted text-muted-foreground',
      pendiente_validador1: 'bg-primary/10 text-primary',
      submitted: 'bg-primary/10 text-primary',
      under_review: 'bg-primary/10 text-primary',
      aprobado_validador1: 'bg-secondary/10 text-secondary',
      pendiente_validador2: 'bg-primary/10 text-primary',
      aprobado_final: 'bg-secondary/10 text-secondary',
      approved: 'bg-secondary/10 text-secondary',
      rejected: 'bg-destructive/10 text-destructive',
    };
    return statusMap[estado] || 'bg-muted text-muted-foreground';
  };

  const getEstadoIcon = (estado: string) => {
    const status = (estado || '').toLowerCase();
    switch (true) {
      case status.includes('draft') || status.includes('borrador'):
        return <FileText className="w-4 h-4" />;
      case status.includes('pending') || status.includes('submitted') || status.includes('pendiente'):
        return <Clock className="w-4 h-4" />;
      case status.includes('approved') || status.includes('aprobado'):
        return <CheckCircle className="w-4 h-4" />;
      case status.includes('rejected'):
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUploadSuccess = (fileUrl: string, fileName: string) => {
    setFormData(prev => ({
      ...prev,
      archivo_url: fileUrl,
      documento_nombre: fileName.split('.')[0], // Usar el nombre del archivo como base
    }));
    toast.success('Documento cargado, ahora completa los detalles');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/sostenibilidad/documentos-flujo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('Documento creado correctamente');
        setIsModalOpen(false);
        setFormData({
          documento_nombre: '',
          descripcion: '',
          archivo_url: '',
        });
        mutate();
      } else {
        toast.error('Error al crear documento');
      }
    } catch (error) {
      console.error('[v0] Error creating document:', error);
      toast.error('Error al crear documento');
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-foreground">Flujo de aprobación de documentos</h1>
          </div>
          <p className="text-muted-foreground">Flujo de 2 validadores: Jefe de Sostenibilidad &rarr; Gerente General</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/sostenibilidad/documentos-flujo/importar">Plantilla</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/sostenibilidad/documentos-flujo/importar">
              <Upload className="mr-2 h-4 w-4" />
              Importar Excel
            </Link>
          </Button>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo documento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nuevo documento</DialogTitle>
              <DialogDescription>
                Sube un documento y completa sus detalles para el flujo de aprobación.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Upload Section */}
              <div>
                <Label className="mb-3 block text-base font-semibold">1. Subir documento</Label>
                <DocumentUpload 
                  onUploadSuccess={handleUploadSuccess}
                  maxSizeMB={10}
                  acceptedTypes={['.pdf', '.doc', '.docx', '.xlsx', '.xls', '.txt']}
                />
              </div>

              {/* Document Details */}
              <div className="border-t pt-6">
                <Label className="mb-4 block text-base font-semibold">2. Detalles del documento</Label>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="nombre">Nombre del documento *</Label>
                    <Input
                      id="nombre"
                      name="documento_nombre"
                      value={formData.documento_nombre}
                      onChange={handleInputChange}
                      placeholder="Ej: Procedimiento de Seguridad"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="descripcion">Descripción</Label>
                    <textarea
                      id="descripcion"
                      name="descripcion"
                      value={formData.descripcion}
                      onChange={handleInputChange}
                      placeholder="Descripción del documento"
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                      rows={3}
                    />
                  </div>
                  {formData.archivo_url && (
                    <div className="bg-secondary/10 border border-secondary rounded-md p-3">
                      <p className="text-sm text-secondary">Documento cargado correctamente</p>
                      <p className="text-xs text-muted-foreground mt-1">{formData.archivo_url.split('/').pop()}</p>
                    </div>
                  )}
                  <div className="flex gap-2 justify-end pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsModalOpen(false);
                        setFormData({
                          documento_nombre: '',
                          descripcion: '',
                          archivo_url: '',
                        });
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={!formData.archivo_url}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      Crear documento
                    </Button>
                  </div>
                </form>
              </div>
            </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Diagrama del flujo */}
      <Card className="mb-8 rounded-xl border shadow-none">
        <CardHeader>
              <CardTitle className="text-sm">Fases de aprobación</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 overflow-x-auto pb-4">
            {estadoSteps.map((paso, idx) => (
              <div key={paso} className="flex items-center gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                    idx === 0 ? 'bg-[var(--brand-naranja)] text-white' : 'bg-white/10 text-muted-foreground'
                  }`}>
                    {idx + 1}
                  </div>
                  <span className="text-xs text-muted-foreground mt-1 capitalize text-center max-w-20">
                    {paso.replace(/_/g, ' ')}
                  </span>
                </div>
                {idx < estadoSteps.length - 1 && <div className="w-8 h-0.5 bg-white/10" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different statuses */}
      <Tabs defaultValue="todas" className="mb-8">
        <TabsList>
        <TabsTrigger value="todas">Todos ({docList.length})</TabsTrigger>
        <TabsTrigger value="borrador">Borradores ({docsByStage('borrador').length})</TabsTrigger>
        <TabsTrigger value="pendiente_validador1">Pendiente validador 1 ({docsByStage('pendiente_validador1').length})</TabsTrigger>
        <TabsTrigger value="pendiente_validador2">Pendiente validador 2 ({docsByStage('pendiente_validador2').length})</TabsTrigger>
        <TabsTrigger value="aprobado_final">Aprobados ({docsByStage('aprobado_final').length})</TabsTrigger>
      </TabsList>

        <TabsContent value="todas" className="space-y-4">
          {/* Search */}
          <div className="flex gap-2 mb-6">
            <Input
              placeholder="Buscar documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button variant="outline" size="icon">
              <Search className="w-4 h-4" />
            </Button>
          </div>

          {/* Documents List */}
          <div className="space-y-4">
            {filteredDocs.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No hay documentos</p>
            ) : (
              filteredDocs.map((doc: DocumentoFlujo) => renderDocumentCard(doc))
            )}
          </div>
        </TabsContent>

        <TabsContent value="borrador" className="space-y-4">
          {docsByStage('borrador').length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No hay borradores</p>
          ) : (
            <div className="space-y-4">{docsByStage('borrador').map((doc) => renderDocumentCard(doc))}</div>
          )}
        </TabsContent>

        <TabsContent value="pendiente_validador1" className="space-y-4">
          {docsByStage('pendiente_validador1').length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No hay documentos pendientes del validador 1</p>
          ) : (
            <div className="space-y-4">{docsByStage('pendiente_validador1').map((doc) => renderDocumentCard(doc))}</div>
          )}
        </TabsContent>

        <TabsContent value="pendiente_validador2" className="space-y-4">
          {docsByStage('pendiente_validador2').length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No hay documentos pendientes del validador 2</p>
          ) : (
            <div className="space-y-4">{docsByStage('pendiente_validador2').map((doc) => renderDocumentCard(doc))}</div>
          )}
        </TabsContent>

        <TabsContent value="aprobado_final" className="space-y-4">
          {docsByStage('aprobado_final').length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No hay documentos aprobados</p>
          ) : (
            <div className="space-y-4">{docsByStage('aprobado_final').map((doc) => renderDocumentCard(doc))}</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

