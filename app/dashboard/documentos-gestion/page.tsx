'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { AlertCircle, CheckCircle, Clock, FileText, FolderOpen, Plus, Search, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar gestión documental');
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
      return <Badge className="gap-1 bg-[var(--brand-verde)]"><CheckCircle className="h-3 w-3" />Aprobado</Badge>;
    case 'pendiente_validador1':
    case 'pendiente_validador2':
    case 'draft':
    case 'submitted':
    case 'under_review':
      return <Badge className="gap-1 bg-[var(--secondary)]"><Clock className="h-3 w-3" />Pendiente</Badge>;
    case 'rechazado':
    case 'rejected':
      return <Badge className="gap-1 bg-[var(--brand-rojo)]"><XCircle className="h-3 w-3" />Rechazado</Badge>;
    default:
      return <Badge variant="outline">{estado || 'Sin estado'}</Badge>;
  }
}

export default function DocumentosGestionPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const { data, error, isLoading, mutate } = useSWR('/api/dashboard/documentos-gestion', fetcher, {
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
    return categories.filter((category) =>
      `${category.name || ''} ${category.description || ''}`.toLowerCase().includes(query),
    );
  }, [categories, searchTerm]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-28 animate-pulse rounded-xl bg-muted" />
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((item) => <div key={item} className="h-28 animate-pulse rounded-xl bg-muted" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm">
            <AlertCircle className="h-4 w-4 text-destructive" />
            No fue posible cargar el centro documental.
          </div>
          <Button variant="outline" onClick={() => mutate()}>Reintentar</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-border/70 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Administración y control · Documentación
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Gestión documental</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Controla aprobaciones, vencimientos y categorías documentales desde una sola superficie operacional.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/dashboard/documentos-gestion/contratos"><Plus className="h-4 w-4" />Gestionar contratos</Link>
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Documentos totales</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{stats.total}</p><p className="mt-1 text-xs text-muted-foreground">Registros disponibles</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Pendientes de aprobación</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-[var(--secondary)]">{stats.pending}</p><p className="mt-1 text-xs text-muted-foreground">Requieren revisión</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Próximos a vencer</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-amber-600">{expiringDocuments.length}</p><p className="mt-1 text-xs text-muted-foreground">Requieren seguimiento</p></CardContent></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Pendientes de aprobación</CardTitle><CardDescription>Documentos que requieren decisión.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {pendingApprovals.length === 0 ? <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">No hay aprobaciones pendientes.</p> : pendingApprovals.slice(0, 6).map((doc) => (
              <div key={doc.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0"><p className="truncate font-medium">{doc.nombre || 'Documento sin nombre'}</p><p className="text-xs text-muted-foreground">{doc.documentId || 'Sin ID'} · {doc.pendingBy || 'Sin responsable'}</p></div>
                {statusBadge(doc.estado)}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Vencimientos próximos</CardTitle><CardDescription>Prioridades de control documental.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {expiringDocuments.length === 0 ? <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">No hay documentos próximos a vencer.</p> : expiringDocuments.slice(0, 6).map((doc) => (
              <div key={doc.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0"><p className="truncate font-medium">{doc.nombre || 'Documento sin nombre'}</p><p className="text-xs text-muted-foreground">{doc.documentId || 'Sin ID'}</p></div>
                {statusBadge(doc.estado)}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FolderOpen className="h-5 w-5" />Categorías documentales</CardTitle><CardDescription>Busca y entra a la categoría correspondiente.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar por nombre o descripción" className="pl-10" /></div>
          {filteredCategories.length === 0 ? <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No hay categorías para esta búsqueda.</p> : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredCategories.map((category) => (
                <Link key={category.id} href={`/dashboard/documentos-gestion/${category.id}`} className="rounded-xl border p-4 transition-colors hover:bg-muted/50">
                  <div className="flex items-start justify-between gap-3"><FileText className="mt-0.5 h-5 w-5 text-primary" /><Badge variant="outline">{category.count || 0}</Badge></div>
                  <p className="mt-4 font-semibold">{category.name || category.id}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{category.description || 'Documentos asociados a esta categoría.'}</p>
                  {(category.pendingApprovals || 0) > 0 && <p className="mt-3 text-xs font-medium text-[var(--secondary)]">{category.pendingApprovals} pendientes</p>}
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {recentDocuments.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Actividad reciente</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recentDocuments.slice(0, 6).map((doc) => (
              <div key={doc.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0"><p className="truncate font-medium">{doc.nombre || 'Documento sin nombre'}</p><p className="text-xs text-muted-foreground">{doc.documentId || 'Sin ID'} · v{doc.version || '—'} · {doc.creador || 'Sin autor'}</p></div>
                {statusBadge(doc.estado)}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
