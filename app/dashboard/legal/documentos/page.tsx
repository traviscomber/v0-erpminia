'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, FileText, Upload } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DocumentUploadForm } from '@/components/legal/document-upload-form';
import { Document, DocumentList } from '@/components/documents/document-list';

type LegalDocumentResponse = {
  documents?: Array<
    Document & {
      file_url?: string;
      uploaded_at?: string;
      valid_until?: string;
      file_size_bytes?: number;
    }
  >;
  total?: number;
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || 'Request failed');
  }

  return payload as LegalDocumentResponse;
};

export default function DocumentosLegalPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [error, setError] = useState<string | null>(null);

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetcher('/api/legal/documentos');
      setDocuments(
        (data.documents || []).map((doc) => ({
          ...doc,
          file_url: doc.file_url || doc.fileUrl,
          uploaded_at: doc.uploaded_at || doc.createdAt,
          valid_until: doc.valid_until || doc.expiryDate,
          file_size_bytes: doc.file_size_bytes,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando documentos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const stats = useMemo(() => {
    const active = documents.filter((doc) =>
      ['active', 'approved'].includes(String(doc.status || '').toLowerCase())
    ).length;
    const review = documents.filter((doc) =>
      ['draft', 'pending', 'pending_l1', 'pending_l2', 'submitted', 'under_review'].includes(
        String(doc.status || '').toLowerCase()
      )
    ).length;
    const rejected = documents.filter(
      (doc) => String(doc.status || '').toLowerCase() === 'rejected'
    ).length;

    return {
      total: documents.length,
      active,
      review,
      rejected,
    };
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    switch (activeTab) {
      case 'active':
        return documents.filter((doc) =>
          ['active', 'approved'].includes(String(doc.status || '').toLowerCase())
        );
      case 'review':
        return documents.filter((doc) =>
          ['draft', 'pending', 'pending_l1', 'pending_l2', 'submitted', 'under_review'].includes(
            String(doc.status || '').toLowerCase()
          )
        );
      case 'all':
      default:
        return documents;
    }
  }, [activeTab, documents]);

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Documentos Legal</h1>
          <p className="max-w-2xl text-muted-foreground">
            Documentos reales cargados para el modulo legal, con archivos, vencimientos y respaldo
            documental.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline">Total {stats.total}</Badge>
            <Badge variant="outline">Activos {stats.active}</Badge>
            <Badge variant="outline">En revision {stats.review}</Badge>
            <Badge variant="outline">Rechazados {stats.rejected}</Badge>
          </div>
        </div>
        <Button variant="outline" onClick={loadDocuments} disabled={loading} className="w-fit">
          {loading ? 'Actualizando...' : 'Actualizar'}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Total</span>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">documentos reales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Activos</span>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-500">{stats.active}</p>
            <p className="text-xs text-muted-foreground">vigentes o aprobados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>En Revision</span>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-500">{stats.review}</p>
            <p className="text-xs text-muted-foreground">pendientes de validacion</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Rechazados</span>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-500">{stats.rejected}</p>
            <p className="text-xs text-muted-foreground">requieren correccion</p>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Card className="border-destructive/30">
          <CardContent className="flex items-center justify-between gap-4 pt-6">
            <div className="flex items-center gap-3 text-sm">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span>{error}</span>
            </div>
            <Button variant="outline" onClick={loadDocuments}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="active">Activos</TabsTrigger>
          <TabsTrigger value="review">En Revision</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <DocumentList documents={filteredDocuments} isLoading={loading} />
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <DocumentList documents={filteredDocuments} isLoading={loading} />
        </TabsContent>

        <TabsContent value="review" className="space-y-4">
          <DocumentList documents={filteredDocuments} isLoading={loading} />
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Cargar Documento Legal
          </CardTitle>
          <CardDescription>
            Sube nuevos respaldos, politicas, reglamentos o documentos contractuales.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentUploadForm onSuccess={loadDocuments} />
        </CardContent>
      </Card>
    </div>
  );
}
