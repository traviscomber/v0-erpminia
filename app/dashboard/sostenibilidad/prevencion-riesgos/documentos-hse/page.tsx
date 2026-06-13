'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DocumentUpload } from '@/components/documents/document-upload';
import { DocumentList, Document } from '@/components/documents/document-list';
import { DocumentReviewModal } from '@/components/documents/document-review-modal';
import { FileText, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface DocumentStats {
  total: number;
  vigentes: number;
  en_revision: number;
  rechazados: number;
}

export default function DocumentosHSEPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [stats, setStats] = useState<DocumentStats>({
    total: 0,
    vigentes: 0,
    en_revision: 0,
    rechazados: 0,
  });

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/documents/list?module=prevenci%C3%B3n&category=documentos-hse', {
        credentials: 'include',
      });
      const data = await response.json();
      const docs = Array.isArray(data?.documents) ? data.documents : Array.isArray(data) ? data : [];

      setDocuments(docs);
      setStats({
        total: docs.length,
        vigentes: docs.filter((d: Document) => d.status === 'aprobado' || d.status === 'active').length,
        en_revision: docs.filter((d: Document) =>
          d.status === 'en_revision_l1' ||
          d.status === 'en_revision_l2' ||
          d.status === 'pending_l1' ||
          d.status === 'pending_l2'
        ).length,
        rechazados: docs.filter((d: Document) => d.status === 'rechazado' || d.status === 'rejected').length,
      });
    } catch (error) {
      console.error('Error cargando documentos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleDelete = async (documentId: string) => {
    try {
      const response = await fetch(`/api/documents/delete?id=${documentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        await loadDocuments();
      }
    } catch (error) {
      console.error('Error eliminando documento:', error);
    }
  };

  const handleView = (document: Document | string) => {
    if (typeof document === 'string') {
      const doc = documents.find(d => d.id === document);
      if (doc) setSelectedDoc(doc);
    } else {
      setSelectedDoc(document);
    }
    setReviewOpen(true);
  };

  const handleApprove = async (documentId: string, observations: string) => {
    try {
      const response = await fetch('/api/documents/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, action: 'approve', observations, reviewLevel: 'L1' }),
        credentials: 'include',
      });
      if (response.ok) await loadDocuments();
    } catch (error) {
      console.error('Error aprobando documento:', error);
    }
  };

  const handleReject = async (documentId: string, observations: string) => {
    try {
      const response = await fetch('/api/documents/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, action: 'reject', observations, reviewLevel: 'L1' }),
        credentials: 'include',
      });
      if (response.ok) await loadDocuments();
    } catch (error) {
      console.error('Error rechazando documento:', error);
    }
  };

  // Draft docs are loaded but not yet reviewed — show them in main tab
  const draftDocs = documents.filter(d =>
    d.status === 'draft' || !d.status
  );
  const vigentesDocs = documents.filter(d =>
    d.status === 'aprobado' || d.status === 'active'
  );
  const revisionDocs = documents.filter(d =>
    d.status === 'en_revision_l1' || d.status === 'en_revision_l2' ||
    d.status === 'pending_l1' || d.status === 'pending_l2'
  );

  // Default tab: show where documents actually are
  const defaultTab = vigentesDocs.length > 0 ? 'vigentes' : draftDocs.length > 0 ? 'todos' : 'todos';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Documentos HSE</h1>
        <p className="text-muted-foreground mt-2">
          Gestión de políticas, procedimientos, instructivos y programas de seguridad
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Total</span>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">documentos cargados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Vigentes</span>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-500">{stats.vigentes}</p>
            <p className="text-xs text-muted-foreground">aprobados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>En Revisión</span>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-500">{stats.en_revision}</p>
            <p className="text-xs text-muted-foreground">esperando aprobación</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Rechazados</span>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-500">{stats.rechazados}</p>
            <p className="text-xs text-muted-foreground">pendientes de corrección</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList className="bg-muted/60 p-1">
          <TabsTrigger value="todos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">
            Todos ({documents.length})
          </TabsTrigger>
          <TabsTrigger value="vigentes" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">
            Vigentes ({vigentesDocs.length})
          </TabsTrigger>
          <TabsTrigger value="revision" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">
            En Revisión ({revisionDocs.length})
          </TabsTrigger>
          <TabsTrigger value="upload" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">
            Subir
          </TabsTrigger>
        </TabsList>

        {/* Todos — búsqueda inteligente en todos los documentos */}
        <TabsContent value="todos" className="space-y-4">
          <DocumentList
            documents={documents}
            isLoading={loading}
            onView={handleView}
            onDelete={handleDelete}
            showSearch={true}
          />
        </TabsContent>

        {/* Vigentes */}
        <TabsContent value="vigentes" className="space-y-4">
          <DocumentList
            documents={vigentesDocs}
            isLoading={loading}
            onView={handleView}
            onDelete={handleDelete}
            showSearch={true}
          />
        </TabsContent>

        {/* En Revisión */}
        <TabsContent value="revision" className="space-y-4">
          <DocumentList
            documents={revisionDocs}
            isLoading={loading}
            onView={handleView}
            onDelete={handleDelete}
            showSearch={false}
          />
        </TabsContent>

        {/* Upload */}
        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subir Nuevo Documento</CardTitle>
              <CardDescription>
                Sube documentos HSE: políticas, procedimientos, instructivos, programas de seguridad
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentUpload
                module="prevención"
                category="documentos-hse"
                onUploadSuccess={loadDocuments}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Review Modal */}
      <DocumentReviewModal
        document={selectedDoc}
        isOpen={reviewOpen}
        onClose={() => { setReviewOpen(false); setSelectedDoc(null); }}
        onApprove={handleApprove}
        onReject={handleReject}
        reviewLevel="L1"
      />
    </div>
  );
}

