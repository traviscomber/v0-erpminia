'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertCircle, ArrowRight, CheckCircle2, Download, Eye, FileText, Scale, Search, Upload } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ContractsTracker } from '@/components/legal/contracts-tracker';
import { AddDocumentModal } from '@/components/legal/add-document-modal';
import { DocumentReviewModal } from '@/components/legal/document-review-modal';
import { AddContractModal } from '@/components/legal/add-contract-modal';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) return null;
  return payload;
};

type LegalDocument = {
  id: string;
  title: string;
  description: string;
  category: string;
  documentType: string;
  status: string;
  fileUrl: string | null;
  filePath: string | null;
};

type LegalContract = {
  id: string;
  title: string;
  contractor_name: string;
  start_date: string;
  end_date: string;
  status: string;
  contract_value: number;
  currency: string;
  compliance_status: string;
  file_url: string;
};

type CompliancePayload = {
  summary: {
    total_contracts: number;
    active_contracts: number;
    contracts_pending_review: number;
    contracts_missing_file: number;
    expiring_contracts: number;
    expired_contracts: number;
    legal_documents: number;
    expiring_documents: number;
  approved_documents: number;
  };
  contracts_pending_review: Array<{ id: string; title: string }>;
  contracts_missing_file: Array<{ id: string; title: string }>;
  expiring_contracts: Array<{ id: string; title: string; days_until_expiry: number }>;
  expiring_documents: Array<{ id: string; title: string; expiry_date: string }>;
};

type LegalDocumentForm = {
  [key: string]: string | number | boolean | File | null | undefined;
};

type LegalContractForm = LegalDocumentForm;

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
    case 'vigente':
    case 'approved':
      return <Badge className="bg-secondary/10 text-secondary">Activo</Badge>;
    case 'pending':
    case 'pendiente':
    case 'draft':
    case 'submitted':
    case 'under_review':
      return <Badge className="bg-primary/10 text-primary">Pendiente</Badge>;
    case 'expired':
    case 'vencido':
    case 'rejected':
      return <Badge className="bg-destructive/10 text-destructive">Vencido</Badge>;
    default:
      return <Badge variant="outline">{status || 'Sin estado'}</Badge>;
  }
}

function getComplianceTone(value: number) {
  if (value >= 90) return 'bg-secondary/10 text-secondary';
  if (value >= 70) return 'bg-primary/10 text-primary';
  return 'bg-destructive/10 text-destructive';
}

function mapContractStatus(status: string): 'active' | 'expiring' | 'expired' {
  const value = String(status || '').toLowerCase();
  if (value.includes('vencido')) return 'expired';
  if (value.includes('por vencer') || value.includes('revision') || value.includes('revisi')) return 'expiring';
  return 'active';
}

function mapApprovalStatus(status: string): 'pending' | 'approved' | 'rejected' {
  if (status === 'Pendiente') return 'pending';
  if (status === 'Incumplimiento') return 'rejected';
  return 'approved';
}

function formatContractValue(value: number, currency: string) {
  if (!value) return '-';
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: currency || 'CLP',
    minimumFractionDigits: 0,
  }).format(value);
}

export default function LegalPage() {
  const [activeTab, setActiveTab] = useState('documents');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);
  const [reviewingDoc, setReviewingDoc] = useState<LegalDocument | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  const searchParam = searchQuery.trim() ? `?search=${encodeURIComponent(searchQuery.trim())}` : '';

  const { data: documentData, error: documentsError, mutate: mutateDocuments } = useSWR(
    `/api/legal/documentos${searchParam}`,
    fetcher,
    { revalidateOnFocus: false }
  );
  const { data: contractData, error: contractsError, mutate: mutateContracts } = useSWR(
    `/api/legal/contratos${searchParam}`,
    fetcher,
    { revalidateOnFocus: false }
  );
  const { data: complianceData, error: complianceError, mutate: mutateCompliance } = useSWR(
    '/api/legal/compliance',
    fetcher,
    { revalidateOnFocus: false }
  );

  const handleOpenDoc = async (doc: LegalDocument, download = false) => {
    if (download) {
      if (loadingDocId === doc.id) return;
      setLoadingDocId(doc.id);
      try {
        let url = doc.fileUrl;
        if (!url) {
          const res = await fetch(`/api/legal/documentos/download?id=${doc.id}`, {
            credentials: 'include',
          });
          const json = await res.json();
          url = json.url ?? null;
        }
        if (url) {
          const a = document.createElement('a');
          a.href = url;
          a.download = doc.title || 'documento';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      } finally {
        setLoadingDocId(null);
      }
      return;
    }

    setReviewingDoc(doc);
    setReviewModalOpen(true);
  };

  const handleDocumentReview = async (
    docId: string,
    level: 'L1' | 'L2',
    status: 'cumple' | 'no_cumple' | null,
    observations: string
  ) => {
    try {
      const res = await fetch('/api/legal/documentos/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ docId, level, status, observations }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error en la revision');
      }

      await mutateDocuments();
      setReviewingDoc(null);
    } catch (error) {
      console.error('Error al revisar documento:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const handleAddDocument = async (doc: LegalDocumentForm) => {
    const hasFile = doc.file instanceof File;
    let body: BodyInit;
    let headers: HeadersInit | undefined;

    if (hasFile) {
      const formData = new FormData();
      Object.entries(doc).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value instanceof File ? value : String(value));
        }
      });
      body = formData;
      headers = undefined;
    } else {
      body = JSON.stringify(doc);
      headers = { 'Content-Type': 'application/json' };
    }

    const res = await fetch('/api/legal/documentos', {
      method: 'POST',
      headers,
      credentials: 'include',
      body,
    });
    if (res.ok) {
      await mutateDocuments();
      await mutateCompliance();
    }
  };

  const handleAddContract = async (contract: LegalContractForm) => {
    const hasFile = contract.file instanceof File;
    let body: BodyInit;
    let headers: HeadersInit | undefined;

    if (hasFile) {
      const formData = new FormData();
      Object.entries(contract).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value instanceof File ? value : String(value));
        }
      });
      body = formData;
      headers = undefined;
    } else {
      body = JSON.stringify(contract);
      headers = { 'Content-Type': 'application/json' };
    }

    const res = await fetch('/api/legal/contratos', {
      method: 'POST',
      headers,
      credentials: 'include',
      body,
    });
    if (res.ok) {
      await mutateContracts();
      await mutateCompliance();
    }
  };

  const legalDocs = (documentData?.documents || []) as LegalDocument[];
  const contracts = (contractData?.contracts || []) as LegalContract[];
  const compliance = (complianceData || {}) as CompliancePayload;

  const documentCount = documentData?.total ?? legalDocs.length;
  const documentsWithFile = legalDocs.filter((doc) => Boolean(doc.fileUrl || doc.filePath)).length;
  const activeContracts = compliance.summary?.active_contracts ?? 0;
  const pendingReviewCount = compliance.summary?.contracts_pending_review ?? 0;
  const expiringContractsCount = compliance.summary?.expiring_contracts ?? 0;
  const expiringDocumentsCount = compliance.summary?.expiring_documents ?? 0;

  const compliancePercent = useMemo(() => {
    const summary = compliance.summary;
    if (!summary) return 0;

    const checks = [
      summary.total_contracts ? (summary.active_contracts || 0) / summary.total_contracts : 1,
      summary.total_contracts
        ? ((summary.total_contracts || 0) - (summary.contracts_missing_file || 0)) / summary.total_contracts
        : 1,
      summary.legal_documents ? (summary.approved_documents || 0) / summary.legal_documents : 1,
      summary.legal_documents
        ? ((summary.legal_documents || 0) - (summary.expiring_documents || 0)) / summary.legal_documents
        : 1,
    ];

    const score = checks.reduce((acc, value) => acc + Math.max(0, Math.min(1, value)), 0) / checks.length;
    return Math.round(score * 100);
  }, [compliance.summary]);

  const complianceItems = useMemo(
    () => [
      {
        requirement: 'Contratos vigentes',
        percentage: compliance.summary?.total_contracts
          ? Math.round(((compliance.summary?.active_contracts || 0) / Math.max(compliance.summary?.total_contracts || 1, 1)) * 100)
          : 100,
      },
      {
        requirement: 'Contratos con respaldo documental',
        percentage: compliance.summary?.total_contracts
          ? Math.round((((compliance.summary?.total_contracts || 0) - (compliance.summary?.contracts_missing_file || 0)) / Math.max(compliance.summary?.total_contracts || 1, 1)) * 100)
          : 100,
      },
      {
        requirement: 'Documentos legales aprobados',
        percentage: compliance.summary?.legal_documents
          ? Math.round(((compliance.summary?.approved_documents || 0) / Math.max(compliance.summary?.legal_documents || 1, 1)) * 100)
          : 100,
      },
      {
        requirement: 'Documentos sin vencimiento inmediato',
        percentage: compliance.summary?.legal_documents
          ? Math.round((((compliance.summary?.legal_documents || 0) - (compliance.summary?.expiring_documents || 0)) / Math.max(compliance.summary?.legal_documents || 1, 1)) * 100)
          : 100,
      },
    ],
    [compliance.summary]
  );

  const trackerContracts = useMemo(
    () =>
      contracts.slice(0, 8).map((contract) => ({
        id: contract.id,
        title: contract.title,
        provider: contract.contractor_name || 'Sin contratista',
        startDate: contract.start_date || new Date().toISOString(),
        endDate: contract.end_date || new Date().toISOString(),
        status: mapContractStatus(contract.status),
        value: formatContractValue(contract.contract_value, contract.currency),
        approvalStatus: mapApprovalStatus(contract.compliance_status),
        fileUrl: contract.file_url,
      })),
    [contracts]
  );

  const hasError = documentsError || contractsError || complianceError;

  const downloadTemplate = (kind: 'documents' | 'contracts') => {
    const config = {
      documents: {
        filename: 'plantilla-documentos-legales.csv',
        headers: ['TITLE', 'DESCRIPTION', 'DOCUMENT_TYPE', 'CATEGORY', 'STATUS'],
        rows: [
          ['Politica HSE', 'Politica corporativa de seguridad', 'policy', 'HSE', 'pending'],
          ['Procedimiento vehiculos', 'Uso seguro de vehiculos', 'procedure', 'Operacion', 'active'],
        ],
      },
      contracts: {
        filename: 'plantilla-contratos-legales.csv',
        headers: ['TITLE', 'CONTRACTOR_NAME', 'START_DATE', 'END_DATE', 'STATUS', 'CONTRACT_VALUE', 'CURRENCY', 'COMPLIANCE_STATUS'],
        rows: [
          ['Contrato transporte', 'Transportes del Norte', '2026-07-01', '2027-06-30', 'active', '15000000', 'CLP', 'Pendiente'],
          ['Contrato mantencion', 'Servicios Andes', '2026-07-01', '2026-12-31', 'active', '8500000', 'CLP', 'Cumple'],
        ],
      },
    }[kind];

    const csv = [config.headers, ...config.rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = config.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Modulo Legal</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Vista ejecutiva para documentos, contratos y cumplimiento normativo, con foco en respaldo, vencimientos y revision.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/legal/importar">
              <Upload className="mr-2 h-4 w-4" />
              Importar Excel
            </Link>
          </Button>
          <Button variant="outline" onClick={() => downloadTemplate('documents')}>
            <Download className="mr-2 h-4 w-4" />
            Plantilla documentos
          </Button>
          <Button variant="outline" onClick={() => downloadTemplate('contracts')}>
            <Download className="mr-2 h-4 w-4" />
            Plantilla contratos
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Documentos legales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{documentCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">Registrados en el sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contratos vigentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeContracts}</div>
            <p className="mt-1 text-xs text-muted-foreground">Activos y en seguimiento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Documentos con archivo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{documentsWithFile}</div>
            <p className="mt-1 text-xs text-muted-foreground">Con respaldo disponible</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cumplimiento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{compliancePercent}%</div>
            <p className="mt-1 text-xs text-muted-foreground">Basado en contratos y documentos legales</p>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-primary">Pendientes de revision</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{pendingReviewCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">Contratos en cola de validacion</p>
          </CardContent>
        </Card>

        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-amber-600">Contratos por vencer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{expiringContractsCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">Requieren seguimiento cercano</p>
          </CardContent>
        </Card>

        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-destructive">Documentos por vencer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{expiringDocumentsCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">Revisar respaldo y vigencia</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/90">
        <CardHeader>
          <CardTitle>Acceso rapido al flujo documental</CardTitle>
          <CardDescription>
            Legal trabaja conectado a mantenimiento, bodega y telemetria para cerrar trazabilidad.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/mantenimiento/documentos">
                Documentos de mantenimiento
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/bodega/documentos">
                Documentos de bodega
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/telemetria">
                Telemetria
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/legal/documentos">
                Documentos legales
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/legal/permisos-licencias">
                Permisos y licencias
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {hasError && (
        <Card className="border-destructive/30">
          <CardContent className="flex items-center justify-between gap-4 pt-6">
            <div className="flex items-center gap-3 text-sm">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span>No fue posible cargar una parte del modulo legal.</span>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                mutateDocuments();
                mutateContracts();
                mutateCompliance();
              }}
            >
              Reintentar
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Documentos</span>
          </TabsTrigger>
          <TabsTrigger value="contracts" className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            <span className="hidden sm:inline">Contratos</span>
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span className="hidden sm:inline">Cumplimiento</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Documentos legales</CardTitle>
                  <CardDescription>Politicas, procedimientos, protocolos y respaldo regulatorio.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <AddDocumentModal onSubmit={handleAddDocument} />
                  <div className="relative max-w-sm flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar documentos..."
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {legalDocs.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
                    No hay documentos legales cargados todavia.
                  </div>
                )}

                {legalDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-lg border p-3 transition hover:bg-muted/50"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <FileText className="h-5 w-5 flex-shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{doc.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {(doc.documentType || 'Documento').replace(/_/g, ' ')} - {doc.description || 'Sin descripcion'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      {getStatusBadge(doc.status)}
                      {(doc.fileUrl || doc.filePath) && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            disabled={loadingDocId === doc.id}
                            onClick={() => handleOpenDoc(doc, false)}
                            title="Vista previa"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            disabled={loadingDocId === doc.id}
                            onClick={() => handleOpenDoc(doc, true)}
                            title="Descargar"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contracts">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Contratos vigentes</CardTitle>
                  <CardDescription>Seguimiento de contratos activos y vencimientos proximos.</CardDescription>
                </div>
                <AddContractModal onSubmit={handleAddContract} />
              </div>
            </CardHeader>
            <CardContent>
              <ContractsTracker contracts={trackerContracts} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance">
          <Card>
            <CardHeader>
              <CardTitle>Matriz de cumplimiento</CardTitle>
              <CardDescription>Seguimiento de respaldo contractual y documental del modulo legal.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {complianceItems.map((item) => (
                  <div key={item.requirement} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.requirement}</span>
                      <Badge className={getComplianceTone(item.percentage)}>{item.percentage}%</Badge>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-secondary" style={{ width: `${item.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <p className="mb-2 text-sm font-semibold">Contratos por revisar</p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {(compliance.contracts_pending_review || []).slice(0, 5).map((item) => (
                      <li key={item.id}>{item.title}</li>
                    ))}
                    {(compliance.contracts_pending_review || []).length === 0 && (
                      <li>No hay contratos pendientes de revision.</li>
                    )}
                  </ul>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="mb-2 text-sm font-semibold">Documentos por vencer</p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {(compliance.expiring_documents || []).slice(0, 5).map((item) => (
                      <li key={item.id}>
                        {item.title}
                        {item.expiry_date ? ` - ${new Date(item.expiry_date).toLocaleDateString('es-CL')}` : ''}
                      </li>
                    ))}
                    {(compliance.expiring_documents || []).length === 0 && (
                      <li>No hay documentos con vencimiento cercano.</li>
                    )}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DocumentReviewModal
        open={reviewModalOpen}
        document={reviewingDoc}
        level="L1"
        onClose={() => {
          setReviewModalOpen(false);
          setReviewingDoc(null);
        }}
        onReview={handleDocumentReview}
      />
    </div>
  );
}
