'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileSearch,
  FileText,
  MapPinned,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DocumentUpload } from '@/components/documents/document-upload';
import { DocumentList, Document } from '@/components/documents/document-list';
import { DocumentReviewModal } from '@/components/documents/document-review-modal';
import { EXPEDIENT_CATALOG } from '@/lib/maintenance/expedient-catalog';

const canonicalLabels: Record<string, string> = {
  ot_historica: 'OT historicas',
  componentes: 'Componentes',
  arbol_fallas: 'Arbol de fallas',
  ficha_equipo: 'Ficha de equipo',
  evidencia: 'Evidencia',
  modificaciones: 'Modificaciones',
  pendiente_clasificar: 'Pendiente de clasificar',
};

const FEATURED_EXPEDIENT_KEYS = [
  'cat-938h-n2',
  'cat-938h-n1',
  'generador-atlas-copco-qas-500-kva',
  'scoop-atlas-st1030',
];

export default function DocumentosMantenimientoPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [cargando, setCargando] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  const loadDocuments = async () => {
    setCargando(true);
    try {
      const response = await fetch('/api/documents/list?module=mantenimiento', {
        credentials: 'include',
      });
      const data = await response.json();
      const docs = Array.isArray(data?.documents) ? data.documents : Array.isArray(data) ? data : [];

      setDocuments(docs);
    } catch (error) {
      console.error('Error cargando documentos:', error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const filteredDocuments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return documents;

    return documents.filter((doc) => {
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
        doc.canonical_section,
        doc.asset_id,
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
      con_equipo: filteredDocuments.filter((d: Document) => Boolean(d.asset_id)).length,
    }),
    [filteredDocuments]
  );

  const canonicalStats = useMemo(
    () =>
      Object.entries(canonicalLabels).map(([key, label]) => ({
        key,
        label,
        count: filteredDocuments.filter((doc) => String(doc.canonical_section || 'pendiente_clasificar') === key).length,
      })),
    [filteredDocuments]
  );

  const equipmentDocuments = useMemo(() => filteredDocuments.filter((doc) => Boolean(doc.asset_id)), [filteredDocuments]);

  const featuredExpedients = useMemo(
    () =>
      FEATURED_EXPEDIENT_KEYS.map((expedientKey) =>
        EXPEDIENT_CATALOG.find((entry) => entry.expedientKey === expedientKey)
      ).filter((entry): entry is (typeof EXPEDIENT_CATALOG)[number] => Boolean(entry)),
    []
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

  const handleVer = (document: Document | string) => {
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
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--brand-cobre)]/20 bg-[var(--brand-cobre)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--brand-cobre)]">
            Fulvio / Centro documental
          </div>
          <h1 className="text-3xl font-bold">Documentacion de mantenimiento</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Esta portada funciona como mesa de entrada. Primero te lleva al expediente correcto del equipo y despues al
            flujo documental general.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/dashboard/mantenimiento/documentos/expedientes/cat-938h-n2">
              Abrir CAT 938H N2
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/mantenimiento/documentos/expedientes">
              Ver todos los expedientes
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/dashboard/mantenimiento/documentos/importar">
              Importar documentos
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" onClick={loadDocuments} disabled={cargando}>
            <RefreshCw className={`mr-2 h-4 w-4 ${cargando ? 'animate-spin' : ''}`} />
            {cargando ? 'Actualizando...' : 'Recargar'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSearch className="h-5 w-5 text-[var(--brand-cobre)]" />
            Entradas rapidas por equipo
          </CardTitle>
          <CardDescription>
            Primero abre el expediente consolidado del activo. La carga, clasificacion e importacion documental quedan
            como pasos secundarios cuando ya no basta con el historial resumido.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {featuredExpedients.map((definition) => (
            <div key={definition.expedientKey} className="rounded-xl border border-border/70 bg-muted/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{definition.title}</p>
                  <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPinned className="h-3.5 w-3.5" />
                    {definition.location}
                  </p>
                </div>
                <span className="rounded-full border border-border/70 px-2 py-1 text-xs text-muted-foreground">
                  {definition.summary.records} docs
                </span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{definition.description}</p>
              <Button asChild variant="outline" className="mt-4 w-full justify-between">
                <Link href={`/dashboard/mantenimiento/documentos/expedientes/${definition.expedientKey}`}>
                  Abrir expediente
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              <span>Total</span>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{filteredStats.total}</p>
            <p className="text-xs text-muted-foreground">documentos cargados</p>
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

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              <span>Con equipo</span>
              <CheckCircle2 className="h-4 w-4 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-500">{filteredStats.con_equipo}</p>
            <p className="text-xs text-muted-foreground">documentos vinculados</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar documentos</CardTitle>
          <CardDescription>Filtra por titulo, descripcion, categoria, seccion canonica o responsable.</CardDescription>
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

      <Card>
        <CardHeader>
          <CardTitle>Mapa canonico</CardTitle>
          <CardDescription>La documentacion se organiza con la misma logica que usa operacion para mantener equipos.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {canonicalStats.map((item) => (
              <div key={item.key} className="rounded-xl border border-border/70 bg-muted/20 p-4">
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="mt-1 text-2xl font-bold">{item.count}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard/mantenimiento/documentos/expedientes">
                Ir al indice de expedientes
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/mantenimiento/equipos">
                Ir a equipos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/mantenimiento/equipos/importar">
                Importar equipos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
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
          <TabsTrigger value="equipos" className="font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Por equipo
          </TabsTrigger>
          <TabsTrigger value="upload" className="font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Subir documentos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <DocumentList documents={filteredDocuments} isLoading={cargando} onView={handleVer} onDelete={handleDelete} />
        </TabsContent>

        <TabsContent value="vigentes" className="space-y-4">
          <DocumentList
            documents={filteredDocuments.filter((d) => d.status === 'active' || d.status === 'aprobado')}
            isLoading={cargando}
            onView={handleVer}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="revision" className="space-y-4">
          <DocumentList
            documents={filteredDocuments.filter(
              (d) =>
                d.status === 'pending_l1' ||
                d.status === 'pending_l2' ||
                d.status === 'en_revision_l1' ||
                d.status === 'en_revision_l2'
            )}
            isLoading={cargando}
            onView={handleVer}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="equipos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Documentos vinculados a activos</CardTitle>
              <CardDescription>
                Estos documentos ya tienen `asset_id` y pueden abrirse desde el flujo documental por equipo.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href="/dashboard/mantenimiento/equipos">Abrir bandeja por equipo</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard/mantenimiento/equipos/importar">Importar activos</Link>
              </Button>
            </CardContent>
          </Card>
          <DocumentList documents={equipmentDocuments} isLoading={cargando} onView={handleVer} onDelete={handleDelete} />
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subir nuevo documento</CardTitle>
              <CardDescription>Sube manuales, procedimientos e instructivos de mantenimiento.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link href="/dashboard/mantenimiento/documentos/importar">Abrir importador dedicado</Link>
                </Button>
              </div>
              <DocumentUpload module="mantenimiento" category="documentos" onUploadSuccess={loadDocuments} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Atajos operativos</CardTitle>
          <CardDescription>Accesos utiles para operacion y supervision.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <Button asChild variant="outline" className="justify-between">
            <Link href="/dashboard/mantenimiento/vehiculos">
              Vehiculos y traslados
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
          <Button asChild variant="outline" className="justify-between">
            <Link href="/dashboard/mantenimiento/documentos/expedientes/cat-938h-n2">
              CAT 938H N2
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-between">
            <Link href="/dashboard/mantenimiento/documentos/expedientes/cat-938h-n1">
              CAT 938H N1
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-between">
            <Link href="/dashboard/mantenimiento/documentos/expedientes/generador-atlas-copco-qas-500-kva">
              Generador Atlas QAS 500
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-between">
            <Link href="/dashboard/mantenimiento/documentos/expedientes">
              Ver todos los expedientes
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
