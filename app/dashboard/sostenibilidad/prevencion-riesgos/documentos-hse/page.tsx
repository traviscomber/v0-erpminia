'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, Clock, FileText, Upload } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DocumentUpload } from '@/components/documents/document-upload';
import { DocumentList, Document } from '@/components/documents/document-list';
import { DocumentReviewModal, type DocumentReviewDocument } from '@/components/documents/document-review-modal';

const PREVENCION_MODULE = 'prevenci\u00f3n';
const DOCUMENTOS_HSE_CATEGORY = 'documentos-hse';

interface DocumentStats {
  total: number;
  vigentes: number;
  en_revision: number;
  rechazados: number;
}

export default function DocumentosHSEPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentReviewDocument | null>(null);
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
      const response = await fetch(
        `/api/documents/list?module=${encodeURIComponent(PREVENCION_MODULE)}&category=${encodeURIComponent(DOCUMENTOS_HSE_CATEGORY)}`,
        {
          credentials: 'include',
        }
      );
      const data = await response.json().catch(() => null);
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
      const doc = documents.find((d) => d.id === document);
      if (doc) setSelectedDoc(doc as DocumentReviewDocument);
    } else {
      setSelectedDoc(document as DocumentReviewDocument);
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

  const draftDocs = documents.filter((d) => d.status === 'draft' || !d.status);
  const vigentesDocs = documents.filter((d) => d.status === 'aprobado' || d.status === 'active');
  const revisionDocs = documents.filter(
    (d) => d.status === 'en_revision_l1' || d.status === 'en_revision_l2' || d.status === 'pending_l1' || d.status === 'pending_l2'
  );

  const defaultTab = vigentesDocs.length > 0 ? 'vigentes' : draftDocs.length > 0 ? 'todos' : 'todos';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documentos HSE</h1>
          <p className="mt-2 text-muted-foreground">Gestión de políticas, procedimientos, instructivos y programas de seguridad.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/sostenibilidad/prevencion-riesgos/documentos-hse/importar">
            <Upload className="mr-2 h-4 w-4" />
            Importar documentos
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
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
            <CardTitle className="flex items-center justify-between text-sm font-medium">
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
            <CardTitle className="flex items-center justify-between text-sm font-medium">
            <span>En revisión</span>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-500">{stats.en_revision}</p>
            <p className="text-xs text-muted-foreground">Esperando aprobación</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              <span>Rechazados</span>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-500">{stats.rechazados}</p>
            <p className="text-xs text-muted-foreground">Pendientes de correccion</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList className="bg-muted/60 p-1">
          <TabsTrigger value="todos" className="font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Todos ({documents.length})
          </TabsTrigger>
          <TabsTrigger value="vigentes" className="font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Vigentes ({vigentesDocs.length})
          </TabsTrigger>
          <TabsTrigger value="revision" className="font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            En revisión ({revisionDocs.length})
          </TabsTrigger>
          <TabsTrigger value="upload" className="font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Subir
          </TabsTrigger>
        </TabsList>

        <TabsContent value="todos" className="space-y-4">
          <DocumentList documents={documents} isLoading={loading} onView={handleView} onDelete={handleDelete} showSearch />
        </TabsContent>

        <TabsContent value="vigentes" className="space-y-4">
          <DocumentList documents={vigentesDocs} isLoading={loading} onView={handleView} onDelete={handleDelete} showSearch />
        </TabsContent>

        <TabsContent value="revision" className="space-y-4">
          <DocumentList documents={revisionDocs} isLoading={loading} onView={handleView} onDelete={handleDelete} showSearch={false} />
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subir nuevo documento</CardTitle>
              <CardDescription>Sube documentos HSE: políticas, procedimientos, instructivos y programas de seguridad.</CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentUpload module={PREVENCION_MODULE} category={DOCUMENTOS_HSE_CATEGORY} onUploadSuccess={loadDocuments} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DocumentReviewModal
        document={selectedDoc}
        isOpen={reviewOpen}
        onClose={() => {
          setReviewOpen(false);
          setSelectedDoc(null);
        }}
        onApprove={handleApprove}
        onReject={handleReject}
        reviewLevel="L1"
      />
    </div>
  );
}
