'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertCircle, CheckCircle2, Download, Eye, FileText, Scale, Search, Upload } from 'lucide-react';
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
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar la información');
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
  summary?: {
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
  contracts_pending_review?: Array<{ id: string; title: string }>;
  contracts_missing_file?: Array<{ id: string; title: string }>;
  expiring_contracts?: Array<{ id: string; title: string; days_until_expiry: number }>;
  expiring_documents?: Array<{ id: string; title: string; expiry_date: string }>;
};

type FormPayload = {
  [key: string]: string | number | boolean | File | null | undefined;
};

function getStatusBadge(status: string) {
  const value = String(status || '').toLowerCase();
  if (['active', 'vigente', 'approved'].includes(value)) {
    return <Badge className="bg-secondary/10 text-secondary">Activo</Badge>;
  }
  if (['pending', 'pendiente', 'draft', 'submitted', 'under_review'].includes(value)) {
    return <Badge className="bg-primary/10 text-primary">Pendiente</Badge>;
  }
  if (['expired', 'vencido', 'rejected'].includes(value)) {
    return <Badge className="bg-destructive/10 text-destructive">Vencido</Badge>;
  }
  return <Badge variant="outline">{status || 'Sin estado'}</Badge>;
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

function getComplianceTone(value: number) {
  if (value >= 90) return 'bg-secondary/10 text-secondary';
  if (value >= 70) return 'bg-primary/10 text-primary';
  return 'bg-destructive/10 text-destructive';
}

export default function LegalPage() {
  const [activeTab, setActiveTab] = useState('documents');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);
  const [reviewingDoc, setReviewingDoc] = useState<LegalDocument | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

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

  const legalDocs = (documentData?.documents || []) as LegalDocument[];
  const contracts = (contractData?.contracts || []) as LegalContract[];
  const compliance = (complianceData || {}) as CompliancePayload;
  const summary = compliance.summary;

  const compliancePercent = useMemo(() => {
    if (!summary) return 0;
    const checks = [
      summary.total_contracts ? summary.active_contracts / summary.total_contracts : 1,
      summary.total_contracts ? (summary.total_contracts - summary.contracts_missing_file) / summary.total_contracts : 1,
      summary.legal_documents ? summary.approved_documents / summary.legal_documents : 1,
      summary.legal_documents ? (summary.legal_documents - summary.expiring_documents) / summary.legal_documents : 1,
    ];
    return Math.round((checks.reduce((total, item) => total + Math.max(0, Math.min(1, item)), 0) / checks.length) * 100);
  }, [summary]);

  const complianceItems = useMemo(() => {
    if (!summary) return [];
    return [
      {
        requirement: 'Contratos vigentes',
        percentage: summary.total_contracts ? Math.round((summary.active_contracts / summary.total_contracts) * 100) : 100,
      },
      {
        requirement: 'Contratos con respaldo',
        percentage: summary.total_contracts
          ? Math.round(((summary.total_contracts - summary.contracts_missing_file) / summary.total_contracts) * 100)
          : 100,
      },
      {
        requirement: 'Documentos aprobados',
        percentage: summary.legal_documents
          ? Math.round((summary.approved_documents / summary.legal_documents) * 100)
          : 100,
      },
      {
        requirement: 'Documentos sin vencimiento inmediato',
        percentage: summary.legal_documents
          ? Math.round(((summary.legal_documents - summary.expiring_documents) / summary.legal_documents) * 100)
          : 100,
      },
    ];
  }, [summary]);

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

  const handleOpenDoc = async (doc: LegalDocument, download = false) => {
    if (!download) {
      setReviewError(null);
      setReviewingDoc(doc);
      setReviewModalOpen(true);
      return;
    }

    if (loadingDocId === doc.id) return;
    setLoadingDocId(doc.id);
    try {
      let url = doc.fileUrl;
      if (!url) {
        const response = await fetch(`/api/legal/documentos/download?id=${doc.id}`, { credentials: 'include' });
        const payload = await response.json();
        url = payload.url ?? null;
      }
      if (url) {
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.title || 'documento';
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } finally {
      setLoadingDocId(null);
    }
  };

  const handleDocumentReview = async (
    docId: string,
    level: 'L1' | 'L2',
    status: 'cumple' | 'no_cumple' | null,
    observations: string
  ) => {
    try {
      const response = await fetch('/api/legal/documentos/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ docId, level, status, observations }),
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || 'Error en la revisión');
      }
      await Promise.all([mutateDocuments(), mutateCompliance()]);
      setReviewError(null);
      setReviewingDoc(null);
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : 'Error desconocido al revisar el documento');
    }
  };

  const submitPayload = async (url: string, payload: FormPayload) => {
    const hasFile = payload.file instanceof File;
    const body = hasFile
      ? (() => {
          const formData = new FormData();
          Object.entries(payload).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              formData.append(key, value instanceof File ? value : String(value));
            }
          });
          return formData;
        })()
      : JSON.stringify(payload);

    return fetch(url, {
      method: 'POST',
      headers: hasFile ? undefined : { 'Content-Type': 'application/json' },
      credentials: 'include',
      body,
    });
  };

  const handleAddDocument = async (payload: FormPayload) => {
    const response = await submitPayload('/api/legal/documentos', payload);
    if (response.ok) await Promise.all([mutateDocuments(), mutateCompliance()]);
  };

  const handleAddContract = async (payload: FormPayload) => {
    const response = await submitPayload('/api/legal/contratos', payload);
    if (response.ok) await Promise.all([mutateContracts(), mutateCompliance()]);
  };

  const hasError = documentsError || contractsError || complianceError;
  const kpis = [
    { label: 'Contratos vigentes', value: summary?.active_contracts ?? 0, note: 'Activos y en seguimiento' },
    { label: 'Por vencer', value: summary?.expiring_contracts ?? 0, note: 'Requieren gestión prioritaria' },
    { label: 'Pendientes de revisión', value: summary?.contracts_pending_review ?? 0, note: 'En cola de validación' },
    { label: 'Cumplimiento', value: `${compliancePercent}%`, note: 'Contratos y documentos' },
  ];

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b border-border/70 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Legal y contratistas · Control contractual</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">Gestión legal</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Controla contratos, respaldo documental, revisiones y vencimientos desde un único espacio operativo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/legal/importar">
              <Upload className="mr-2 h-4 w-4" />
              Importar
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/legal/permisos-licencias">Permisos y licencias</Link>
          </Button>
        </div>
      </section>

      {reviewError ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{reviewError}</span>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <Card key={item.label} className="shadow-none">
            <CardHeader className="pb-2">
              <CardDescription>{item.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{item.value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {hasError ? (
        <Card className="border-destructive/30">
          <CardContent className="flex items-center justify-between gap-4 pt-6">
            <div className="flex items-center gap-3 text-sm">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span>No fue posible cargar una parte del módulo legal.</span>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                void mutateDocuments();
                void mutateContracts();
                void mutateCompliance();
              }}
            >
              Reintentar
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            Documentos
          </TabsTrigger>
          <TabsTrigger value="contracts" className="gap-2">
            <Scale className="h-4 w-4" />
            Contratos
          </TabsTrigger>
          <TabsTrigger value="compliance" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Cumplimiento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>Documentos legales</CardTitle>
                  <CardDescription>Políticas, procedimientos, protocolos y respaldo regulatorio.</CardDescription>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <AddDocumentModal onSubmit={handleAddDocument} />
                  <div className="relative min-w-64">
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
            <CardContent className="space-y-3">
              {legalDocs.length === 0 ? (
                <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
                  No hay documentos legales cargados.
                </div>
              ) : (
                legalDocs.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between gap-4 rounded-lg border p-3 hover:bg-muted/40">
                    <div className="flex min-w-0 items-center gap-3">
                      <FileText className="h-5 w-5 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{doc.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {(doc.documentType || 'Documento').replace(/_/g, ' ')} · {doc.description || 'Sin descripción'}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {getStatusBadge(doc.status)}
                      {(doc.fileUrl || doc.filePath) ? (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDoc(doc, false)} title="Revisar documento">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={loadingDocId === doc.id}
                            onClick={() => handleOpenDoc(doc, true)}
                            title="Descargar documento"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contracts" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Contratos</CardTitle>
                  <CardDescription>Seguimiento de vigencia, contratistas, montos y cumplimiento.</CardDescription>
                </div>
                <AddContractModal onSubmit={handleAddContract} />
              </div>
            </CardHeader>
            <CardContent>
              <ContractsTracker contracts={trackerContracts} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Matriz de cumplimiento</CardTitle>
              <CardDescription>Respaldo contractual, aprobaciones y vencimientos próximos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {complianceItems.map((item) => (
                  <div key={item.requirement} className="space-y-2">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm font-medium">{item.requirement}</span>
                      <Badge className={getComplianceTone(item.percentage)}>{item.percentage}%</Badge>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-secondary" style={{ width: `${item.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <p className="mb-3 text-sm font-semibold">Contratos por revisar</p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {(compliance.contracts_pending_review || []).slice(0, 5).map((item) => (
                      <li key={item.id}>{item.title}</li>
                    ))}
                    {(compliance.contracts_pending_review || []).length === 0 ? <li>Sin contratos pendientes.</li> : null}
                  </ul>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="mb-3 text-sm font-semibold">Documentos por vencer</p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {(compliance.expiring_documents || []).slice(0, 5).map((item) => (
                      <li key={item.id}>
                        {item.title}
                        {item.expiry_date ? ` · ${new Date(item.expiry_date).toLocaleDateString('es-CL')}` : ''}
                      </li>
                    ))}
                    {(compliance.expiring_documents || []).length === 0 ? <li>Sin vencimientos próximos.</li> : null}
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
