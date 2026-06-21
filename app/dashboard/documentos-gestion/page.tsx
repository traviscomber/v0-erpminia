'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { AlertCircle, CheckCircle, Clock, Plus, Search, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function statusBadge(estado: string) {
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

  const categories = data?.categories || [];
  const pendingApprovals = data?.pendingApprovals || [];
  const recentDocuments = data?.recentDocuments || [];
  const expiringDocuments = data?.expiringDocuments || [];
  const stats = data?.stats || { total: 0, pending: 0, expiring: 0 };

  const filteredCategories = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return categories;

    return categories.filter((cat: any) =>
      String(cat.name || '').toLowerCase().includes(query) ||
      String(cat.description || '').toLowerCase().includes(query),
    );
  }, [categories, searchTerm]);

  if (error) return <div className="text-red-500">Error al cargar documentos</div>;
  if (isLoading) return <div className="text-gray-500">Cargando gestión documental...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión documental</h1>
          <p className="mt-1 text-muted-foreground">
            Centraliza, revisa y organiza los documentos operativos en una sola vista.
          </p>
        </div>
        <Button className="gap-2 bg-[var(--brand-naranja)] hover:bg-[var(--brand-naranja)]/90">
          <Plus className="h-4 w-4" />
          Nuevo documento
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
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
              Pendientes de aprobación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[var(--secondary)]">{stats.pending}</div>
            <p className="mt-1 text-xs text-muted-foreground">Requieren revisión</p>
          </CardContent>
        </Card>

        <Card className="border-[var(--brand-verde)]/30 bg-[var(--brand-verde)]/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[var(--brand-verde)]">Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[var(--brand-verde)]">{recentDocuments.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">Últimos documentos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Categorías activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{categories.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">Tipos de documentos</p>
          </CardContent>
        </Card>
      </div>

      {pendingApprovals.length > 0 && (
        <Card className="border-[var(--secondary)]/30 bg-[var(--secondary)]/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-[var(--secondary)]" />
              <CardTitle>Documentos pendientes de aprobación</CardTitle>
            </div>
            <CardDescription>{pendingApprovals.length} documentos requieren revisión</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingApprovals.map((doc: any) => (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded border border-[var(--secondary)]/20 bg-background/50 p-3"
              >
                <div className="flex-1">
                  <div className="text-sm font-semibold">{doc.nombre}</div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>ID: {doc.documentId} · v{doc.version}</span>
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
            <CardDescription>Últimos documentos creados o actualizados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentDocuments.map((doc: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between rounded border p-3 hover:bg-accent">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{doc.nombre}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{doc.documentId}</span>
                      <span>·</span>
                      <span>v{doc.version}</span>
                      <span>·</span>
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

      {expiringDocuments.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <CardTitle>Documentos por vencer</CardTitle>
            <CardDescription>{expiringDocuments.length} documentos próximos a vencerse</CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Buscar categorías</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Busca por nombre o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredCategories.map((category: any) => (
          <Link key={category.id} href={`/dashboard/documentos-gestion/${category.id}`}>
            <Card className="h-full cursor-pointer transition-all hover:shadow-lg">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                    <CardDescription className="mt-1 text-xs">{category.description}</CardDescription>
                  </div>
                  {category.pendingApprovals > 0 && (
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
            No se encontraron categorías que coincidan con tu búsqueda.
          </CardContent>
        </Card>
      )}
    </div>
  );
}


