'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DocumentUpload } from '@/components/documents/document-upload';
import { DocumentList, Document } from '@/components/documents/document-list';
import { DocumentReviewModal, type DocumentReviewDocument } from '@/components/documents/document-review-modal';
import { FileText, CheckCircle2, AlertCircle, ArrowRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DocumentStats {
  total: number;
  vigentes: number;
  en_revision: number;
  rechazados: number;
}

function asText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asTags(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function normalizeDocument(raw: Document): Document {
  const fallbackName = asText(raw.document_name || raw.title, 'Sin nombre');
  const fallbackType = asText(raw.document_type || raw.documentType, 'document');
  const fallbackCategory = asText(raw.document_type_category || raw.category, 'general');
  const fallbackCode = asText(raw.document_code || raw.documentNumber);
  const fallbackUploadedAt = asText(raw.uploaded_at || raw.createdAt);
  const fallbackExpiryDate = asText(raw.valid_until || raw.expiryDate);
  const fallbackValidFrom = asText(raw.valid_from);
  const fallbackDescription = asText(raw.description);
  const fallbackUploadedBy = asText(raw.uploaded_by || raw.createdByUser?.name);

  return {
    ...raw,
    id: String(raw.id || ''),
    document_name: fallbackName,
    document_type: fallbackType,
    document_type_category: fallbackCategory,
    document_code: fallbackCode,
    tags: asTags(raw.tags),
    file_size_bytes: asNumber(raw.file_size_bytes),
    uploaded_by: fallbackUploadedBy,
    uploaded_at: fallbackUploadedAt,
    valid_until: fallbackExpiryDate,
    valid_from: fallbackValidFrom,
    status: asText(raw.status),
    l1_observations: asText(raw.l1_observations),
    l2_observations: asText(raw.l2_observations),
    is_expired: Boolean(raw.is_expired),
    file_url: asText(raw.file_url),
    description: fallbackDescription,
    version: asNumber(raw.version, 1),
    title: fallbackName,
    documentNumber: fallbackCode,
    documentType: fallbackType,
    category: fallbackCategory,
    createdAt: fallbackUploadedAt,
    createdByUser: { name: fallbackUploadedBy },
    expiryDate: fallbackExpiryDate,
    daysUntilExpiry: asNumber(raw.daysUntilExpiry),
  };
}

export default function DocumentosBodegaPage() {
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
      const response = await fetch('/api/documents/list?module=bodega&category=documentos', {
        credentials: 'include',
      });
      const data = await response.json().catch(() => null);
      const docs = response.ok
        ? Array.isArray(data?.documents)
          ? data.documents
          : Array.isArray(data)
            ? data
            : []
        : [];
      const normalizedDocs: Document[] = docs.map((doc: Document) => normalizeDocument(doc));

      setDocuments(normalizedDocs);
      setStats({
        total: normalizedDocs.length,
        vigentes: normalizedDocs.filter((d) => d.status === 'active' || d.status === 'aprobado').length,
        en_revision: normalizedDocs.filter((d) => d.status === 'pending_l1' || d.status === 'pending_l2' || d.status === 'en_revision_l1' || d.status === 'en_revision_l2').length,
        rechazados: normalizedDocs.filter((d) => d.status === 'rejected' || d.status === 'rechazado').length,
      });
    } catch (error) {
      console.error('Error al cargar documentos:', error);
      setDocuments([]);
      setStats({
        total: 0,
        vigentes: 0,
        en_revision: 0,
        rechazados: 0,
      });
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
        setDocuments(documents.filter((d) => d.id !== documentId));
        await loadDocuments();
      }
    } catch (error) {
      console.error('Error al eliminar documento:', error);
    }
  };

  const handleView = (document: Document | string) => {
    if (typeof document === 'string') {
      const doc = documents.find((d) => d.id === document);
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
        body: JSON.stringify({
          documentId,
          action: 'approve',
          observations,
          reviewLevel: 'L1',
        }),
        credentials: 'include',
      });
      if (response.ok) {
        await loadDocuments();
      }
    } catch (error) {
      console.error('Error al aprobar documento:', error);
    }
  };

  const handleReject = async (documentId: string, observations: string) => {
    try {
      const response = await fetch('/api/documents/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          action: 'reject',
          observations,
          reviewLevel: 'L1',
        }),
        credentials: 'include',
      });
      if (response.ok) {
        await loadDocuments();
      }
    } catch (error) {
      console.error('Error al rechazar documento:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documentos de bodega</h1>
          <p className="mt-2 text-muted-foreground">Gestión de procedimientos, instructivos y respaldo operativo de bodega.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/dashboard/bodega/documentos/importar">Importar documentos</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/bodega/importar-datos">Importar datos</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/bodega">
              <ArrowRight className="mr-2 h-4 w-4" />
              Volver a bodega
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              <span>Total</span>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">documentos reales cargados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
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
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
               <span>En revisión</span>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-500">{stats.en_revision}</p>
            <p className="text-xs text-muted-foreground">esperando aprobacion</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              <span>Rechazados</span>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-500">{stats.rechazados}</p>
            <p className="text-xs text-muted-foreground">Pendientes de corrección</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="border-b-2 border-border bg-muted/60 p-1">
          <TabsTrigger value="all" className="font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Todos
          </TabsTrigger>
          <TabsTrigger value="vigentes" className="font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Vigentes
          </TabsTrigger>
          <TabsTrigger value="revision" className="font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
             En revisión
          </TabsTrigger>
          <TabsTrigger value="upload" className="font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Subir documentos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <DocumentList documents={documents} isLoading={loading} onView={handleView} onDelete={handleDelete} />
        </TabsContent>

        <TabsContent value="vigentes" className="space-y-4">
          <DocumentList documents={documents.filter((d) => d.status === 'active')} isLoading={loading} onView={handleView} onDelete={handleDelete} />
        </TabsContent>

        <TabsContent value="revision" className="space-y-4">
          <DocumentList
            documents={documents.filter((d) => d.status === 'pending_l1' || d.status === 'pending_l2')}
            isLoading={loading}
            onView={handleView}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subir nuevo documento</CardTitle>
              <CardDescription>Sube procedimientos e instructivos de bodega.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link href="/dashboard/bodega/documentos/importar">Abrir importador dedicado</Link>
                </Button>
                <Button size="sm" variant="ghost" asChild>
                  <Link href="/dashboard/bodega/importar-datos">Ir al importador tabular</Link>
                </Button>
              </div>
              <DocumentUpload module="bodega" category="documentos" onUploadSuccess={loadDocuments} />
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/80">
            <CardHeader>
              <CardTitle>Importacion tabular de bodega</CardTitle>
              <CardDescription>
                La carga de inventario y centros de costo ahora vive en una ruta operativa dedicada para mantener separado el flujo documental.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" asChild>
                <Link href="/dashboard/bodega/importar-datos">Abrir importador de datos</Link>
              </Button>
              <Button size="sm" variant="ghost" asChild>
                <Link href="/dashboard/bodega">Volver al modulo bodega</Link>
              </Button>
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
