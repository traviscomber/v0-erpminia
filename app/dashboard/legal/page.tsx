'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Scale,
  Search,
} from 'lucide-react';
import { ContractsTracker } from '@/components/legal/contracts-tracker';
import { AddDocumentModal } from '@/components/legal/add-document-modal';
import { AddContractModal } from '@/components/legal/add-contract-modal';

const fetcher = async (url: string) => {
  const response = await fetch(url);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload.error || 'La solicitud falló');
  }

  return payload;
};

type LegalDocument = {
  id: string;
  title: string;
  description: string;
  category: string;
  documentType: string;
  status: string;
  fileUrl: string;
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
  if (value.includes('por vencer') || value.includes('revision') || value.includes('revisi'))
    return 'expiring';
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
  const searchParam = searchQuery.trim()
    ? `?search=${encodeURIComponent(searchQuery.trim())}`
    : '';

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

  const handleAddDocument = async (doc: any) => {
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

  const handleAddContract = async (contract: any) => {
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
  const activeContracts = compliance.summary?.active_contracts ?? 0;

  const compliancePercent = useMemo(() => {
    const summary = compliance.summary;
    if (!summary) return 0;

    const checks = [
      summary.total_contracts ? (summary.active_contracts || 0) / summary.total_contracts : 1,
      summary.total_contracts
        ? ((summary.total_contracts || 0) - (summary.contracts_missing_file || 0)) /
          summary.total_contracts
        : 1,
      summary.legal_documents
        ? (summary.approved_documents || 0) / summary.legal_documents
        : 1,
      summary.legal_documents
        ? ((summary.legal_documents || 0) - (summary.expiring_documents || 0)) /
          summary.legal_documents
        : 1,
    ];

    const score =
      checks.reduce((acc, value) => acc + Math.max(0, Math.min(1, value)), 0) / checks.length;
    return Math.round(score * 100);
  }, [compliance.summary]);

  const complianceItems = useMemo(
    () => [
      {
        requirement: 'Contratos vigentes',
        percentage:
          compliance.summary?.total_contracts
            ? Math.round(
                ((compliance.summary?.active_contracts || 0) /
                  Math.max(compliance.summary?.total_contracts || 1, 1)) *
                  100
              )
            : 100,
      },
      {
        requirement: 'Contratos con respaldo documental',
        percentage:
          compliance.summary?.total_contracts
            ? Math.round(
                (((compliance.summary?.total_contracts || 0) -
                  (compliance.summary?.contracts_missing_file || 0)) /
                  Math.max(compliance.summary?.total_contracts || 1, 1)) *
                  100
              )
            : 100,
      },
      {
        requirement: 'Documentos legales aprobados',
        percentage:
          compliance.summary?.legal_documents
            ? Math.round(
                ((compliance.summary?.approved_documents || 0) /
                  Math.max(compliance.summary?.legal_documents || 1, 1)) *
                  100
              )
            : 100,
      },
      {
        requirement: 'Documentos sin vencimiento inmediato',
        percentage:
          compliance.summary?.legal_documents
            ? Math.round(
                (((compliance.summary?.legal_documents || 0) -
                  (compliance.summary?.expiring_documents || 0)) /
                  Math.max(compliance.summary?.legal_documents || 1, 1)) *
                  100
              )
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

  const normativas = useMemo(() => {
    const filtered = legalDocs.filter((doc) =>
      ['regulatory', 'compliance'].includes(String(doc.category || '').toLowerCase())
    );
    return filtered.length > 0 ? filtered : legalDocs.slice(0, 8);
  }, [legalDocs]);

  const hasError = documentsError || contractsError || complianceError;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Módulo Legal y Compliance</h1>
        <p className="text-muted-foreground mt-2">
          Gestión de documentos legales, contratos y cumplimiento normativo minero
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Documentos Legales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{documentCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Registrados en el sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Contratos Vigentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeContracts}</div>
            <p className="text-xs text-muted-foreground mt-1">Activos y en seguimiento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Normativas Aplicables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{normativas.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Requisitos visibles del módulo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cumplimiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{compliancePercent}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Basado en contratos y documentos legales
            </p>
          </CardContent>
        </Card>
      </div>

      {hasError && (
        <Card className="border-destructive/30">
          <CardContent className="pt-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-sm">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span>No fue posible cargar una parte del módulo legal.</span>
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Documentos</span>
          </TabsTrigger>
          <TabsTrigger value="contracts" className="flex items-center gap-2">
            <Scale className="w-4 h-4" />
            <span className="hidden sm:inline">Contratos</span>
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span className="hidden sm:inline">Cumplimiento</span>
          </TabsTrigger>
          <TabsTrigger value="normativas" className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Normativas</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Documentos Legales</CardTitle>
                  <CardDescription>
                    Políticas, procedimientos, protocolos y respaldo regulatorio
                  </CardDescription>
                </div>
                <div className="flex gap-2 items-center">
                  <AddDocumentModal onSubmit={handleAddDocument} />
                  <div className="flex-1 max-w-sm">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar documentos..."
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {legalDocs.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
                    No hay documentos legales cargados todavía.
                  </div>
                )}

                {legalDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{doc.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {(doc.documentType || 'Documento').replace(/_/g, ' ')} -{' '}
                          {doc.description || 'Sin descripción'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getStatusBadge(doc.status)}
                      {doc.fileUrl && (
                        <>
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <a href={doc.fileUrl} target="_blank" rel="noreferrer">
                              <Eye className="w-4 h-4" />
                            </a>
                          </Button>
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <a href={doc.fileUrl} target="_blank" rel="noreferrer">
                              <Download className="w-4 h-4" />
                            </a>
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
          <div className="flex justify-end mb-4">
            <AddContractModal onSubmit={handleAddContract} />
          </div>
          <ContractsTracker contracts={trackerContracts} />
        </TabsContent>

        <TabsContent value="compliance">
          <Card>
            <CardHeader>
              <CardTitle>Matriz de Cumplimiento</CardTitle>
              <CardDescription>
                Seguimiento de respaldo contractual y documental del módulo legal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {complianceItems.map((item) => (
                  <div key={item.requirement} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.requirement}</span>
                      <Badge className={getComplianceTone(item.percentage)}>
                        {item.percentage}%
                      </Badge>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-secondary h-2 rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-semibold mb-2">Contratos por revisar</p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {(compliance.contracts_pending_review || []).slice(0, 5).map((item) => (
                      <li key={item.id}>{item.title}</li>
                    ))}
                    {(compliance.contracts_pending_review || []).length === 0 && (
                      <li>No hay contratos pendientes de revisión.</li>
                    )}
                  </ul>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-sm font-semibold mb-2">Documentos por vencer</p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {(compliance.expiring_documents || []).slice(0, 5).map((item) => (
                      <li key={item.id}>
                        {item.title}
                        {item.expiry_date
                          ? ` - ${new Date(item.expiry_date).toLocaleDateString('es-CL')}`
                          : ''}
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

        <TabsContent value="normativas">
          <Card>
            <CardHeader>
              <CardTitle>Normativas y Respaldo Regulatorio</CardTitle>
              <CardDescription>
                Documentación regulatoria visible para auditoría y seguimiento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {normativas.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
                    No hay normativas registradas todavía.
                  </div>
                )}

                {normativas.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 border border-primary/20 rounded-lg bg-primary/5"
                  >
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium text-sm">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {(doc.category || 'regulatory').replace(/_/g, ' ')}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(doc.status)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


