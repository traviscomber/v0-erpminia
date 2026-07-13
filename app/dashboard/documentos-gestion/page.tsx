'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { AlertCircle, ArrowRight, CheckCircle, Clock, FileText, FolderOpen, Plus, Search, Scale, Shield, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) return null;
  return payload;
};

type DocumentCategory = {
  id: string;
  name?: string | null;
  description?: string | null;
  pendingApprovals?: number | null;
  count?: number | null;
};

type DocumentSummaryItem = {
  id: string | number;
  nombre?: string | null;
  documentId?: string | null;
  version?: string | number | null;
  estado?: string | null;
  pendingBy?: string | null;
  creador?: string | null;
};

function statusBadge(estado?: string | null) {
  switch (estado) {
    case 'aprobado':
    case 'active':
    case 'approved':
      return (
        <Badge className="gap-1 bg-[var(--brand-verde)]">
          <CheckCircle className="h-3 w-3" />
          Aprobado
        </Badge>
      );
    case 'pendiente_validador1':
    case 'pendiente_validador2':
    case 'draft':
    case 'submitted':
    case 'under_review':
      return (
        <Badge className="gap-1 bg-[var(--secondary)]">
          <Clock className="h-3 w-3" />
          Pendiente
        </Badge>
      );
    case 'rechazado':
    case 'rejected':
      return (
        <Badge className="gap-1 bg-[var(--brand-rojo)]">
          <XCircle className="h-3 w-3" />
          Rechazado
        </Badge>
      );
    default:
      return <Badge variant="outline">{estado}</Badge>;
  }
}

export default function DocumentosGestionPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data, error, isLoading } = useSWR('/api/dashboard/documentos-gestion', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    refreshInterval: 300000,
  });

  const categories = (data?.categories || []) as DocumentCategory[];
  const pendingApprovals = (data?.pendingApprovals || []) as DocumentSummaryItem[];
  const recentDocuments = (data?.recentDocuments || []) as DocumentSummaryItem[];
  const expiringDocuments = (data?.expiringDocuments || []) as DocumentSummaryItem[];
  const stats = data?.stats || { total: 0, pending: 0, expiring: 0 };

  const filteredCategories = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return categories;

    return categories.filter((cat) =>
      String(cat.name || '').toLowerCase().includes(query) ||
      String(cat.description || '').toLowerCase().includes(query)
    );
  }, [categories, searchTerm]);
  const expiringPreview = expiringDocuments.slice(0, 5);

  if (error) {
    return <div className="text-red-500">Error al cargar documentos</div>;
  }

  if (isLoading) {
    return <div className="text-gray-500">Cargando gestion documental...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestion documental</h1>
          <p className="mt-1 text-muted-foreground">
            Centraliza, revisa y organiza los documentos operativos en una sola vista, con alertas de revision y vencimiento.
          </p>
        </div>
        <Button asChild className="gap-2 bg-[var(--brand-naranja)] hover:bg-[var(--brand-naranja)]/90">
          <Link href="/dashboard/documentos-gestion/contratos">
            <Plus className="h-4 w-4" />
            Gestionar contratos
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de documentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
            <p className="mt-1 text-xs text-muted-foreground">En el sistema</p>
          </CardContent>
        </Card>

        <Card className="border-[var(--secondary)]/30 bg-[var(--secondary)]/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[var(--secondary)]">
              Pendientes de aprobacion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[var(--secondary)]">{stats.pending}</div>
            <p className="mt-1 text-xs text-muted-foreground">Requieren revision</p>
          </CardContent>
        </Card>

        <Card className="border-[var(--brand-verde)]/30 bg-[var(--brand-verde)]/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[var(--brand-verde)]">Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[var(--brand-verde)]">{recentDocuments.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">Ultimos documentos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Categorias activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{categories.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">Tipos de documentos</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="border-[var(--secondary)]/30 bg-[var(--secondary)]/5">
          <CardHeader>
            <CardTitle className="text-base">Resumen de control</CardTitle>
            <CardDescription>Lectura rapida para supervision y aprobacion.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Pendientes de aprobacion</p>
              <p className="text-2xl font-bold text-[var(--secondary)]">{stats.pending}</p>
            </div>
            <div className="rounded-lg border border-border bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Documentos recientes</p>
              <p className="text-2xl font-bold text-[var(--brand-verde)]">{recentDocuments.length}</p>
            </div>
            <div className="rounded-lg border border-border bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Categorias activas</p>
              <p className="text-2xl font-bold">{categories.length}</p>
            </div>
            <div className="rounded-lg border border-border bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Documentos por vencer</p>
              <p className="text-2xl font-bold text-amber-600">{expiringDocuments.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-base">Documentos por vencer</CardTitle>
            <CardDescription>{expiringDocuments.length} documentos proximos a vencerse</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {expiringPreview.length > 0 ? (
              expiringPreview.map((doc) => (
                <div key={doc.id} className="rounded-lg border border-amber-500/20 bg-background/70 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{doc.nombre}</p>
                      <p className="text-xs text-muted-foreground">{doc.documentId}</p>
                    </div>
                    {statusBadge(doc.estado)}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                No hay documentos con vencimiento cercano.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle>Accesos rapidos</CardTitle>
          <CardDescription>Entra directo a las subrutas mas usadas del modulo.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <Link href="/dashboard/documentos-gestion/contratos" className="rounded-lg border border-border p-4 transition hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-[var(--brand-naranja)]" />
              <span className="font-semibold">Contratos</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Vigencia, revision y respaldo contractual.</p>
          </Link>
          <Link href="/dashboard/documentos-gestion/procedimientos" className="rounded-lg border border-border p-4 transition hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[var(--brand-verde)]" />
              <span className="font-semibold">Procedimientos</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Protocolos, procesos y documentos operativos.</p>
          </Link>
          <Link href="/dashboard/documentos-gestion/seguridad" className="rounded-lg border border-border p-4 transition hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-[var(--secondary)]" />
              <span className="font-semibold">Seguridad</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">MSDS, auditorias, incidentes y protocolos HSE.</p>
          </Link>
          <Link href="/dashboard/documentos-gestion/reportes" className="rounded-lg border border-border p-4 transition hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-primary" />
              <span className="font-semibold">Reportes</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Seguimiento ejecutivo de cumplimiento documental.</p>
          </Link>
          <Link href="/dashboard/documentos-gestion/adquisiciones" className="rounded-lg border border-border p-4 transition hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-[var(--secondary)]" />
              <span className="font-semibold">Adquisiciones</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Ordenes de compra, proveedores y respaldo asociado.</p>
          </Link>
          <Link href="/dashboard/documentos-gestion/eecc" className="rounded-lg border border-border p-4 transition hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-[var(--brand-verde)]" />
              <span className="font-semibold">EECC</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Empresas contratistas y trazabilidad de documentos.</p>
          </Link>
        </CardContent>
      </Card>

      {pendingApprovals.length > 0 && (
        <Card className="border-[var(--secondary)]/30 bg-[var(--secondary)]/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-[var(--secondary)]" />
              <CardTitle>Documentos pendientes de aprobacion</CardTitle>
            </div>
            <CardDescription>{pendingApprovals.length} documentos requieren revision</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingApprovals.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded border border-[var(--secondary)]/20 bg-background/50 p-3"
              >
                <div className="flex-1">
                  <div className="text-sm font-semibold">{doc.nombre}</div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>ID: {doc.documentId} - v{doc.version}</span>
                    <span className="text-[var(--secondary)]">Por revisar: {doc.pendingBy || 'Sin asignar'}</span>
                  </div>
                </div>
                {statusBadge(doc.estado)}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {recentDocuments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Documentos recientes</CardTitle>
            <CardDescription>Ultimos documentos creados o actualizados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentDocuments.map((doc, idx: number) => (
                <div key={idx} className="flex items-center justify-between rounded border p-3 hover:bg-accent">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{doc.nombre}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{doc.documentId}</span>
                      <span>-</span>
                      <span>v{doc.version}</span>
                      <span>-</span>
                      <span>Por: {doc.creador}</span>
                    </div>
                  </div>
                  {statusBadge(doc.estado)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Buscar categorias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Busca por nombre o descripcion..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredCategories.map((category) => (
          <Link key={category.id} href={`/dashboard/documentos-gestion/${category.id}`}>
            <Card className="h-full cursor-pointer transition-all hover:shadow-lg">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                    <CardDescription className="mt-1 text-xs">{category.description}</CardDescription>
                  </div>
                  {(category.pendingApprovals || 0) > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {category.pendingApprovals}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{category.count || 0} documentos</span>
                  <span className="font-semibold">{category.pendingApprovals || 0} pendientes</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No se encontraron categorias que coincidan con tu busqueda.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

