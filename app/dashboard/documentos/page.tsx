'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle, Clock, FileText, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentUploadModal } from '@/components/documents/document-upload-modal';
import { DocumentViewer, type DocumentViewerDocument } from '@/components/documents/document-viewer';
import { DocumentList, type Document } from '@/components/documents/document-list';
import { ApprovalWorkflowCard, type ApprovalStep } from '@/components/documents/approval-workflow-card';
import { AdvancedDocumentSearch } from '@/components/documents/advanced-search';

interface PendingApproval {
  id: string;
  documentId: string;
  steps: ApprovalStep[];
  document: {
    id: string;
    title: string;
    documentNumber: string;
    documentType: string;
    category: string;
    createdAt: string;
    createdByUser: { name: string; email: string };
  };
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }

  return response.json();
};

export default function DocumentosDashboard() {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentViewerDocument | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const documentsParams = new URLSearchParams();
  if (activeTab === 'pending' || activeTab === 'approved') {
    documentsParams.set('status', activeTab);
  } else if (statusFilter) {
    documentsParams.set('status', statusFilter);
  }
  if (searchQuery.trim()) {
    documentsParams.set('search', searchQuery.trim());
  }

  const documentsEndpoint = documentsParams.toString()
    ? `/api/documents${documentsParams.toString()}`
    : '/api/documents';

  const {
    data: documentsData,
    isLoading: docsLoading,
    mutate: mutateDocuments,
  } = useSWR(documentsEndpoint, fetcher);
  const { data: approvalsData, mutate: mutateApprovals } = useSWR(
    '/api/documents/pending',
    fetcher
  );
  const { data: statsData, mutate: mutateStats } = useSWR('/api/documents/stats', fetcher);

  const documents = documentsData.documents || [];
  const pendingApprovals = approvalsData.approvals || [];
  const stats = statsData || { total: 0, approved: 0, pending: 0, expired: 0 };

  const refreshAll = async () => {
    await Promise.all([mutateDocuments(), mutateApprovals(), mutateStats()]);
  };

  const handleViewDocument = (document: Document | string) => {
    const toViewerDocument = (doc: Document): DocumentViewerDocument => ({
      createdByUser: (() => {
        const createdByUser = doc.createdByUser as { name?: string; email?: string } | undefined;
        return {
          name: createdByUser?.name || doc.uploaded_by || 'Desconocido',
          email: createdByUser?.email || '',
        };
      })(),
      id: String(doc.id),
      title: doc.document_name || doc.title || 'Documento sin título',
      documentNumber: doc.document_code || doc.documentNumber || 'Sin código',
      documentType: doc.document_type_category || doc.documentType || 'Documento',
      category: doc.document_type_category || doc.category || 'General',
      status: doc.status || 'draft',
      fileUrl: String(doc.file_url || doc.fileUrl || ''),
      fileSize: Number(doc.file_size_bytes || doc.fileSize || 0),
      createdAt: doc.createdAt || doc.uploaded_at || new Date().toISOString(),
    });

    if (typeof document === 'string') {
      // Si es solo un ID, buscar el documento en la lista
      const doc = documents.find((d: Document) => String(d.id) === document);
      if (doc) setSelectedDocument(toViewerDocument(doc));
    } else {
      setSelectedDocument(toViewerDocument(document));
    }
    setViewerOpen(true);
  };

  const handleUploadSuccess = async () => {
    await refreshAll();
    toast.success('Documento agregado a la lista');
  };

  const handleApprove = async (documentId: string, approvalId: string, comments: string) => {
    const response = await fetch(`/api/documents/${documentId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approvalId, comments }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'No se pudo aprobar el documento');
    }

    await refreshAll();
  };

  const handleReject = async (documentId: string, approvalId: string, reason: string) => {
    const response = await fetch(`/api/documents/${documentId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approvalId, reason }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'No se pudo rechazar el documento');
    }

    await refreshAll();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Gestión de Documentos</h1>
          <p className="text-muted-foreground">
            Administra documentos y aprobaciones con compliance SERNAGEOMIN
          </p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90"
          onClick={() => setUploadModalOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Subir Documento
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Aprobados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-secondary">{stats.approved}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{stats.pending}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Vencidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{stats.expired}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Todos los Documentos</TabsTrigger>
          <TabsTrigger value="pending">Pendientes ({stats.pending})</TabsTrigger>
          <TabsTrigger value="approved">Aprobados ({stats.approved})</TabsTrigger>
          <TabsTrigger value="search">Busqueda avanzada</TabsTrigger>
          {pendingApprovals.length > 0 && (
            <TabsTrigger value="my-approvals" className="relative">
              Mis Aprobaciones
              <span className="ml-2 px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                {pendingApprovals.length}
              </span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <DocumentList
            documents={documents}
            isLoading={docsLoading}
            onView={handleViewDocument}
          />
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <DocumentList documents={documents} isLoading={docsLoading} onView={handleViewDocument} />
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          <DocumentList documents={documents} isLoading={docsLoading} onView={handleViewDocument} />
        </TabsContent>

        <TabsContent value="search" className="space-y-4">
          <AdvancedDocumentSearch />
        </TabsContent>

        {pendingApprovals.length > 0 && (
          <TabsContent value="my-approvals" className="space-y-6">
            <div className="grid gap-4">
              {pendingApprovals.map((approval: PendingApproval) => (
                <Card key={approval.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle>{approval.document.title}</CardTitle>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedDocument({
                            id: approval.document.id,
                            title: approval.document.title,
                            documentNumber: approval.document.documentNumber,
                            documentType: approval.document.documentType,
                            category: approval.document.category,
                            status: 'pending',
                            createdAt: approval.document.createdAt,
                            createdByUser: approval.document.createdByUser,
                          } as unknown as Document);
                          setViewerOpen(true);
                        }}
                      >
                        Ver Documento
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ApprovalWorkflowCard
                      documentId={approval.document.id}
                      steps={approval.steps}
                      currentUserCanApprove={true}
                      onApprove={(stepId, comments) =>
                        handleApprove(approval.document.id, stepId, comments)
                      }
                      onReject={(stepId, reason) =>
                        handleReject(approval.document.id, stepId, reason)
                      }
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>

      <DocumentUploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        organizationId=""
        onSuccess={handleUploadSuccess}
      />

      {selectedDocument && (
        <DocumentViewer
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          document={selectedDocument}
        />
      )}
    </div>
  );
}

