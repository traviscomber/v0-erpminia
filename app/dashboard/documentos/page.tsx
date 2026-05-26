'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import useSWR from 'swr';
import { toast } from 'sonner';

import { DocumentUploadModal } from '@/components/documents/document-upload-modal';
import { DocumentViewer } from '@/components/documents/document-viewer';
import { DocumentList, type Document } from '@/components/documents/document-list';
import { ApprovalWorkflowCard } from '@/components/documents/approval-workflow-card';

interface PendingApproval {
  id: string;
  documentId: string;
  document: {
    id: string;
    title: string;
    documentNumber: string;
    documentType: string;
    category: string;
    createdAt: string;
    createdByUser?: { name: string; email: string };
  };
}

export default function DocumentosDashboard() {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  // Fetch documentos
  const { data: documentsData, isLoading: docsLoading, mutate: mutateDocuments } = useSWR(
    activeTab === 'all' ? '/api/documents' : `/api/documents?status=${activeTab}`,
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch documents');
      return res.json();
    }
  );

  // Fetch aprobaciones pendientes
  const { data: approvalsData, isLoading: approvalsLoading } = useSWR(
    '/api/documents/pending',
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch pending approvals');
      return res.json();
    }
  );

  // Fetch stats
  const { data: statsData } = useSWR('/api/documents/stats', async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  });

  const handleViewDocument = (doc: Document) => {
    setSelectedDocument(doc);
    setViewerOpen(true);
  };

  const handleUploadSuccess = (documentId: string) => {
    mutateDocuments();
    toast.success('Documento agregado a la lista');
  };

  const documents = documentsData?.documents || [];
  const pendingApprovals = approvalsData?.approvals || [];
  const stats = statsData || { total: 0, approved: 0, pending: 0, expired: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Stats */}
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

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Todos los Documentos</TabsTrigger>
          <TabsTrigger value="pending">
            Pendientes ({stats.pending})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Aprobados ({stats.approved})
          </TabsTrigger>
          {pendingApprovals.length > 0 && (
            <TabsTrigger value="my-approvals" className="relative">
              Mis Aprobaciones
              {pendingApprovals.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                  {pendingApprovals.length}
                </span>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        {/* Tab: Todos los Documentos */}
        <TabsContent value="all" className="space-y-4">
          <DocumentList
            documents={documents}
            isLoading={docsLoading}
            onView={handleViewDocument}
            onSearch={(query) => {
              // Implementar búsqueda
            }}
            onStatusFilter={(status) => {
              setActiveTab(status || 'all');
            }}
          />
        </TabsContent>

        {/* Tab: Pendientes */}
        <TabsContent value="pending" className="space-y-4">
          <DocumentList
            documents={documents.filter((d: Document) => d.status === 'pending')}
            isLoading={docsLoading}
            onView={handleViewDocument}
          />
        </TabsContent>

        {/* Tab: Aprobados */}
        <TabsContent value="approved" className="space-y-4">
          <DocumentList
            documents={documents.filter((d: Document) => d.status === 'approved')}
            isLoading={docsLoading}
            onView={handleViewDocument}
          />
        </TabsContent>

        {/* Tab: Mis Aprobaciones */}
        {pendingApprovals.length > 0 && (
          <TabsContent value="my-approvals" className="space-y-6">
            <div className="grid gap-4">
              {pendingApprovals.map((approval: PendingApproval) => (
                <Card key={approval.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle>{approval.document.title}</CardTitle>
                        <CardDescription>
                          {approval.document.documentNumber}
                        </CardDescription>
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
                          });
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
                      steps={[]}
                      currentUserCanApprove={true}
                      onApprove={async (stepId, comments) => {
                        // Implementar aprobación
                      }}
                      onReject={async (stepId, reason) => {
                        // Implementar rechazo
                      }}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Modals */}
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
          document={selectedDocument as any}
        />
      )}
    </div>
  );
}
