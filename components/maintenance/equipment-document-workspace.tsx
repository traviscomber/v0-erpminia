'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { AlertCircle, ArrowLeft, ArrowRight, FileText, RefreshCw, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentList, Document } from '@/components/documents/document-list';
import { DocumentReviewModal } from '@/components/documents/document-review-modal';
import { getExpedientDefinition, resolveExpedientForAsset } from '@/lib/maintenance/expedient-catalog';

type MaintenanceDocument = Document & {
  asset_id?: string | null;
  canonical_section?: string | null;
  extracted_data?: Record<string, unknown> | null;
};

type AssetHistoryResponse = {
  asset?: {
    id: string;
    asset_name?: string | null;
    asset_code?: string | null;
    model?: string | null;
    asset_type?: string | null;
    status?: string | null;
    criticality?: string | null;
  } | null;
};

type EquipmentDocumentWorkspaceProps = {
  assetId: string;
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || 'No fue posible cargar datos');
  }
  return payload;
};

const canonicalSections = [
  { value: 'ot_historica', label: 'OT histórica' },
  { value: 'componentes', label: 'Componentes' },
  { value: 'arbol_fallas', label: 'Árbol de fallas' },
  { value: 'ficha_equipo', label: 'Ficha del equipo' },
  { value: 'evidencia', label: 'Evidencia' },
  { value: 'modificaciones', label: 'Modificaciones' },
  { value: 'pendiente_clasificar', label: 'Pendiente de clasificar' },
];

const maintenanceDocumentTypes = [
  'Hoja de servicio',
  'OT histórica',
  'Ficha del equipo',
  'Reporte de falla',
  'Evidencia fotográfica',
  'Modificación',
  'Checklist',
  'Informe técnico',
  'Orden de trabajo',
];

export function EquipmentDocumentWorkspace({ assetId }: EquipmentDocumentWorkspaceProps) {
  const [assetInfo, setAssetInfo] = useState<AssetHistoryResponse['asset'] | null>(null);
  const [documents, setDocuments] = useState<MaintenanceDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [canonicalSection, setCanonicalSection] = useState('ot_historica');
  const [file, setFile] = useState<File | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<MaintenanceDocument | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const { data: assetHistory, mutate: mutateAsset } = useSWR<AssetHistoryResponse>(
    assetId ? `/api/maintenance/assets/${assetId}/history` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    if (assetHistory?.asset) {
      setAssetInfo(assetHistory.asset);
    }
  }, [assetHistory]);

  const loadDocuments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/documents/list?module=mantenimiento&category=equipos&assetId=${assetId}`, {
        credentials: 'include',
      });
      const data = await response.json();
      const docs = Array.isArray(data?.documents) ? data.documents : Array.isArray(data) ? data : [];
      setDocuments(docs as MaintenanceDocument[]);
    } catch (loadError) {
      console.error('[EquipmentDocumentWorkspace] load error:', loadError);
      setError('No fue posible cargar los documentos del equipo.');
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadDocuments();
  }, [assetId, refreshTick]);

  const counters = useMemo(() => {
    const bySection = documents.reduce<Record<string, number>>((acc, doc) => {
      const key = String(doc.canonical_section || 'pendiente_clasificar');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const pending = documents.filter((doc) => ['draft', 'pending_l1', 'pending_l2', 'en_revision_l1', 'en_revision_l2'].includes(String(doc.status || 'draft'))).length;

    return {
      total: documents.length,
      pending,
      bySection,
    };
  }, [documents]);

  const queueDocs = useMemo(
    () =>
      documents.filter((doc) =>
        ['draft', 'pending_l1', 'pending_l2', 'en_revision_l1', 'en_revision_l2'].includes(String(doc.status || 'draft'))
      ),
    [documents],
  );

  const docsForSection = (section: string) =>
    documents.filter((doc) => String(doc.canonical_section || 'pendiente_clasificar') === section);

  const expedientDefinition = useMemo(() => {
    const expedientKey = resolveExpedientForAsset({
      assetName: assetInfo?.asset_name,
      assetCode: assetInfo?.asset_code,
      model: assetInfo?.model,
      assetType: assetInfo?.asset_type,
    });

    return expedientKey ? getExpedientDefinition(expedientKey) : null;
  }, [assetInfo]);

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!title.trim() || !documentType || !canonicalSection || !file) {
      setError('Completa título, tipo, sección y archivo.');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('module', 'mantenimiento');
      formData.append('category', 'equipos');
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('documentType', documentType);
      formData.append('canonicalSection', canonicalSection);
      formData.append('assetId', assetId);
      formData.append('file', file);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'La carga falló');
      }

      setTitle('');
      setDescription('');
      setDocumentType('');
      setCanonicalSection('ot_historica');
      setFile(null);
      setRefreshTick((current) => current + 1);
      await mutateAsset();
    } catch (uploadError) {
      console.error('[EquipmentDocumentWorkspace] upload error:', uploadError);
      setError(uploadError instanceof Error ? uploadError.message : 'Error al cargar el documento');
    } finally {
      setIsUploading(false);
    }
  };

  const handleApprove = async (documentId: string, observations: string) => {
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
      setRefreshTick((current) => current + 1);
    }
  };

  const handleReject = async (documentId: string, observations: string) => {
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
      setRefreshTick((current) => current + 1);
    }
  };

  const handleDelete = async (documentId: string) => {
    const response = await fetch(`/api/documents/delete?id=${documentId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (response.ok) {
      setRefreshTick((current) => current + 1);
    }
  };

  const handleView = (document: MaintenanceDocument | string) => {
    if (typeof document === 'string') {
      const match = documents.find((item) => item.id === document);
      if (match) {
        setSelectedDoc(match);
      }
    } else {
      setSelectedDoc(document);
    }
    setReviewOpen(true);
  };

  const assetLabel = assetInfo?.asset_name || assetInfo?.asset_code || assetId;
  const assetSubtitle = [assetInfo?.model, assetInfo?.asset_type].filter(Boolean).join(' · ');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--brand-cobre)]/20 bg-[var(--brand-cobre)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--brand-cobre)]">
            Fulvio · Ingreso documental
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{assetLabel}</h1>
          <p className="mt-2 text-muted-foreground">
            Documentos físicos del equipo, convertidos en OT históricas, componentes y árbol de fallas sin perder el original.
          </p>
          {assetSubtitle ? <p className="mt-1 text-sm text-muted-foreground">{assetSubtitle}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {expedientDefinition ? (
            <Button asChild>
              <Link href={`/dashboard/mantenimiento/documentos/expedientes/${expedientDefinition.expedientKey}`}>
                Abrir expediente consolidado
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link href="/dashboard/mantenimiento/equipos">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a equipos
            </Link>
          </Button>
          <Button onClick={() => setRefreshTick((current) => current + 1)} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        </div>
      </div>

      {expedientDefinition ? (
        <Card className="border-[var(--brand-cobre)]/30 bg-[var(--brand-cobre)]/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Expediente consolidado disponible</CardTitle>
            <CardDescription>
              Este equipo ya tiene historial consolidado. Usa el expediente para consultar OT historicas, componentes
              y fallas sin pasar por la carga documental.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{expedientDefinition.title}</p>
              <p className="text-sm text-muted-foreground">{expedientDefinition.location}</p>
            </div>
            <Button asChild variant="outline">
              <Link href={`/dashboard/mantenimiento/documentos/expedientes/${expedientDefinition.expedientKey}`}>
                Ir al expediente
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Documentos</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{counters.total}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">En bandeja Fulvio</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-[var(--brand-cobre)]">{counters.pending}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">OT históricas</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{counters.bySection.ot_historica || 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Árbol de fallas</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{counters.bySection.arbol_fallas || 0}</CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/90">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-[var(--brand-cobre)]" />
            Cargar documento físico
          </CardTitle>
          <CardDescription>
            El papel original queda guardado y la información extraída se clasifica por sección canónica.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4">
            {error ? (
              <div className="flex gap-2 rounded border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Título documental</label>
                <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ej: Hoja de servicio 10.000 kms" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de documento</label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {maintenanceDocumentTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Sección canónica</label>
                <Select value={canonicalSection} onValueChange={setCanonicalSection}>
                  <SelectTrigger>
                    <SelectValue placeholder="Clasifica el documento" />
                  </SelectTrigger>
                  <SelectContent>
                    {canonicalSections.map((section) => (
                      <SelectItem key={section.value} value={section.value}>
                        {section.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Archivo</label>
                <Input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" onChange={(event) => setFile(event.target.files?.[0] || null)} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Descripción / observaciones</label>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Observaciones, partes cambiadas, notas del técnico, etc."
                rows={4}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Fulvio conserva el documento fuente y lo distribuye en OT históricas, componentes y fallas.
              </p>
              <Button type="submit" className="gap-2" disabled={isUploading}>
                {isUploading ? 'Cargando...' : 'Guardar documento'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/90">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[var(--brand-verde)]" />
            Mapa documental
          </CardTitle>
          <CardDescription>Usa estas secciones para ordenar el papel exactamente como lo trabaja operación.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {canonicalSections.map((section) => (
              <div key={section.value} className="rounded-xl border border-border/70 bg-muted/20 p-4">
                <p className="font-semibold text-foreground">{section.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{docsForSection(section.value).length} documento(s)</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="fulvio" className="space-y-4">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="fulvio">Bandeja Fulvio</TabsTrigger>
          <TabsTrigger value="ot">OT históricas</TabsTrigger>
          <TabsTrigger value="componentes">Componentes</TabsTrigger>
          <TabsTrigger value="fallas">Árbol de fallas</TabsTrigger>
          <TabsTrigger value="fuente">Documentos fuente</TabsTrigger>
        </TabsList>

        <TabsContent value="fulvio" className="space-y-4">
          <DocumentList
            documents={queueDocs}
            isLoading={isLoading}
            onView={handleView}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="ot" className="space-y-4">
          <DocumentList
            documents={docsForSection('ot_historica')}
            isLoading={isLoading}
            onView={handleView}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="componentes" className="space-y-4">
          <DocumentList
            documents={docsForSection('componentes')}
            isLoading={isLoading}
            onView={handleView}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="fallas" className="space-y-4">
          <DocumentList
            documents={docsForSection('arbol_fallas')}
            isLoading={isLoading}
            onView={handleView}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="fuente" className="space-y-4">
          <DocumentList
            documents={docsForSection('ficha_equipo').concat(docsForSection('evidencia'), docsForSection('modificaciones'), docsForSection('pendiente_clasificar'))}
            isLoading={isLoading}
            onView={handleView}
            onDelete={handleDelete}
          />
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
