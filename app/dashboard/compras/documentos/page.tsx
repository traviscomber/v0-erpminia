'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Clock, FileText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DocumentUpload } from '@/components/documents/document-upload';
import { DocumentList, type Document } from '@/components/documents/document-list';
import { DocumentReviewModal, type DocumentReviewDocument } from '@/components/documents/document-review-modal';

interface DocumentStats {
  total: number;
  vigentes: number;
  en_revision: number;
  rechazados: number;
}

export default function ComprasDocumentosPage() {
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
      const response = await fetch('/api/documents/list?module=compras&category=documentos', {
        credentials: 'include',
      });
      const data = await response.json();

      if (Array.isArray(data)) {
        setDocuments(data);
        setStats({
          total: data.length,
          vigentes: data.filter((d: Document) => d.status === 'active').length,
          en_revision: data.filter((d: Document) => d.status === 'pending_l1' || d.status === 'pending_l2').length,
          rechazados: data.filter((d: Document) => d.status === 'rejected').length,
        });
      }
    } catch (error) {
      console.error('Error cargando documentos de compras:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDocuments();
  }, []);

  const handleDelete = async (documentId: string) => {
    try {
      const response = await fetch(`/api/documents/delete?id=${documentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setDocuments((current) => current.filter((document) => document.id !== documentId));
        await loadDocuments();
      }
    } catch (error) {
      console.error('Error eliminando documento de compras:', error);
    }
  };

  const handleView = (document: Document | string) => {
    if (typeof document === 'string') {
      const selected = documents.find((item) => item.id === document);
      if (selected) {
        setSelectedDoc(selected as DocumentReviewDocument);
      }
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
        credentials: 'include',
        body: JSON.stringify({
          documentId,
          action: 'approve',
          observations,
          reviewLevel: 'L1',
        }),
      });

      if (response.ok) {
        await loadDocuments();
      }
    } catch (error) {
      console.error('Error aprobando documento de compras:', error);
    }
  };

  const handleReject = async (documentId: string, observations: string) => {
    try {
      const response = await fetch('/api/documents/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          documentId,
          action: 'reject',
          observations,
          reviewLevel: 'L1',
        }),
      });

      if (response.ok) {
        await loadDocuments();
      }
    } catch (error) {
      console.error('Error rechazando documento de compras:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documentos de Compras</h1>
          <p className="mt-2 text-muted-foreground">
            Gestiona ordenes, respaldos, cotizaciones, contratos y anexos del modulo de compras.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/dashboard/compras/documentos/importar">Importar documentos</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/compras/importar-existencias">Excel compras</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/compras">
              <ArrowRight className="mr-2 h-4 w-4" />
              Volver a compras
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
            <p className="text-xs text-muted-foreground">documentos</p>
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
              <span>En revision</span>
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
            <p className="text-xs text-muted-foreground">pendientes de correccion</p>
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
            En revision
          </TabsTrigger>
          <TabsTrigger value="upload" className="font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Subir documentos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <DocumentList documents={documents} isLoading={loading} onView={handleView} onDelete={handleDelete} />
        </TabsContent>

        <TabsContent value="vigentes" className="space-y-4">
          <DocumentList
            documents={documents.filter((document) => document.status === 'active')}
            isLoading={loading}
            onView={handleView}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="revision" className="space-y-4">
          <DocumentList
            documents={documents.filter((document) => document.status === 'pending_l1' || document.status === 'pending_l2')}
            isLoading={loading}
            onView={handleView}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subir nuevo documento</CardTitle>
              <CardDescription>Sube ordenes, respaldos, contratos y archivos de soporte de compras</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link href="/dashboard/compras/documentos/importar">Abrir importador dedicado</Link>
                </Button>
                <Button size="sm" variant="ghost" asChild>
                  <Link href="/dashboard/compras/importar-existencias">Ir al importador tabular</Link>
                </Button>
              </div>
              <DocumentUpload module="compras" category="documentos" onUploadSuccess={loadDocuments} />
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
