'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, CheckCircle2, Clock, FileText, RefreshCw, Search } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DocumentUpload } from '@/components/documents/document-upload';
import { DocumentList, Document } from '@/components/documents/document-list';
import { DocumentReviewModal } from '@/components/documents/document-review-modal';

interface DocumentStats {
  total: number;
  vigentes: number;
  en_revision: number;
  rechazados: number;
}

export default function DocumentosMantenimientoPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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
      const response = await fetch('/api/documents/list?module=mantenimiento&category=documentos', {
        credentials: 'include',
      });
      const data = await response.json();
      const docs = Array.isArray(data?.documents) ? data.documents : Array.isArray(data) ? data : [];

      setDocuments(docs);
      setStats({
        total: docs.length,
        vigentes: docs.filter((d: Document) => d.status === 'active' || d.status === 'aprobado').length,
        en_revision: docs.filter((d: Document) => d.status === 'pending_l1' || d.status === 'pending_l2' || d.status === 'en_revision_l1' || d.status === 'en_revision_l2').length,
        rechazados: docs.filter((d: Document) => d.status === 'rejected' || d.status === 'rechazado').length,
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

  const filteredDocuments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return documents;

    return documents.filter((doc: any) => {
      const searchable = [
        doc.id,
        doc.title,
        doc.name,
        doc.document_name,
        doc.description,
        doc.category,
        doc.type,
        doc.documentType,
        doc.owner,
        doc.created_by,
      ]
        .map((value) => String(value || '').toLowerCase())
        .join(' ');

      return searchable.includes(query);
    });
  }, [documents, searchTerm]);

  const filteredStats = useMemo(
    () => ({
      total: filteredDocuments.length,
      vigentes: filteredDocuments.filter((d: Document) => d.status === 'active' || d.status === 'aprobado').length,
      en_revision: filteredDocuments.filter(
        (d: Document) =>
          d.status === 'pending_l1' ||
          d.status === 'pending_l2' ||
          d.status === 'en_revision_l1' ||
          d.status === 'en_revision_l2'
      ).length,
      rechazados: filteredDocuments.filter((d: Document) => d.status === 'rejected' || d.status === 'rechazado').length,
    }),
    [filteredDocuments]
  );

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
      console.error('Error eliminando documento:', error);
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
      console.error('Error aprobando documento:', error);
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
      console.error('Error rechazando documento:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Documentos de mantenimiento</h1>
          <p className="mt-2 text-muted-foreground">Gestion de manuales, procedimientos e instructivos de mantenimiento.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/mantenimiento/bitacora">
              Bitacora
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/mantenimiento/planificacion">
              Planificacion
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/mantenimiento/gerencial">
              Gerencial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" onClick={loadDocuments} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Actualizando...' : 'Recargar'}
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
            <p className="text-2xl font-bold">{filteredStats.total}</p>
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
            <p className="text-2xl font-bold text-green-500">{filteredStats.vigentes}</p>
            <p className="text-xs text-muted-foreground">aprobados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              <span>En revision</span>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-500">{filteredStats.en_revision}</p>
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
            <p className="text-2xl font-bold text-red-500">{filteredStats.rechazados}</p>
            <p className="text-xs text-muted-foreground">pendientes de correccion</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar documentos</CardTitle>
          <CardDescription>Filtra por titulo, descripcion, categoria o responsable.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar documento de mantenimiento..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="border-b-2 border-border bg-muted/60 p-1">
          <TabsTrigger value="all" className="font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Todos
          </TabsTrigger>
          <TabsTrigger value="vigentes" className="font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Vigentes
          </TabsTrigger>
          <TabsTrigger value="revision" className="font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            En revision
          </TabsTrigger>
          <TabsTrigger value="upload" className="font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Subir documentos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <DocumentList documents={filteredDocuments} isLoading={loading} onView={handleView} onDelete={handleDelete} />
        </TabsContent>

        <TabsContent value="vigentes" className="space-y-4">
          <DocumentList
            documents={filteredDocuments.filter((d) => d.status === 'active')}
            isLoading={loading}
            onView={handleView}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="revision" className="space-y-4">
          <DocumentList
            documents={filteredDocuments.filter((d) => d.status === 'pending_l1' || d.status === 'pending_l2')}
            isLoading={loading}
            onView={handleView}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subir nuevo documento</CardTitle>
              <CardDescription>Sube manuales, procedimientos e instructivos de mantenimiento</CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentUpload module="mantenimiento" category="documentos" onUploadSuccess={loadDocuments} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Accesos rapidos</CardTitle>
          <CardDescription>Atajos utiles para operacion y supervision.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <Button asChild variant="outline" className="justify-between">
            <Link href="/dashboard/mantenimiento/vehiculos">
              Vehiculos y QR
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-between">
            <Link href="/dashboard/mantenimiento/bitacora">
              Bitacora
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-between">
            <Link href="/dashboard/mantenimiento/gerencial">
              Dashboard gerencial
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

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
