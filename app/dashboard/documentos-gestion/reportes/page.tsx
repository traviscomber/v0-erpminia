'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertCircle, ArrowRight, Clock, Search, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type CategorySummary = {
  id: string;
  name: string;
  description: string;
  count: number;
  pendingApprovals: number;
};

type GestionDocumentalPayload = {
  categories: CategorySummary[];
  pendingApprovals: Array<{
    id: string;
    documentId: string;
    nombre: string;
    version: string;
    estado: string;
    createdBy: string;
    pendingBy?: string;
    pendingRole?: string;
  }>;
  recentDocuments: Array<{
    documentId: string;
    nombre: string;
    version: string;
    estado: string;
    creador: string;
    fechaCreacion?: string;
    validador1?: string | null;
  }>;
  expiringDocuments: Array<{
    id: string;
    title: string;
    daysUntilExpiry?: number;
  }>;
  stats: {
    total: number;
    pending: number;
    expiring: number;
  };
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) return null;
  return payload;
};

function statusBadge(status: string) {
  switch (String(status || '').toLowerCase()) {
    case 'aprobado':
    case 'active':
    case 'approved':
      return <Badge className="bg-secondary/10 text-secondary">Aprobado</Badge>;
    case 'pendiente_validador1':
    case 'pendiente_validador2':
    case 'draft':
    case 'submitted':
    case 'under_review':
      return <Badge className="bg-primary/10 text-primary">Pendiente</Badge>;
    case 'rechazado':
    case 'rejected':
      return <Badge className="bg-destructive/10 text-destructive">Rechazado</Badge>;
    default:
      return <Badge variant="outline">{status || 'Sin estado'}</Badge>;
  }
}

export default function ReportesGestionDocumentalPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data, error, isLoading } = useSWR<GestionDocumentalPayload>('/api/dashboard/documentos-gestion', fetcher, {
    revalidateOnFocus: false,
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

    return categories.filter((category) =>
      [category.name, category.description, category.id]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [categories, searchTerm]);

  if (isLoading) {
    return <div className="text-muted-foreground">Cargando resumen documental...</div>;
  }

  if (error || !data) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="flex items-center justify-between gap-4 pt-6">
          <div className="flex items-center gap-3 text-sm">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span>No fue posible cargar el resumen documental real.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Datos reales</span>
        </div>
        <h1 className="text-3xl font-bold">Reportes de gestion documental</h1>
        <p className="text-muted-foreground">
          Vista ejecutiva con secciones, aprobaciones pendientes, documentos recientes y vencimientos.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Documentos cargados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="mt-1 text-xs text-muted-foreground">Cargados desde la base real</p>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-primary">Pendientes por revisar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.pending}</div>
            <p className="mt-1 text-xs text-muted-foreground">Requieren revision</p>
          </CardContent>
        </Card>

        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-600">Por vencer pronto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.expiring}</div>
            <p className="mt-1 text-xs text-muted-foreground">Dentro del rango critico</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Secciones activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">Clasificación operativa real</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle>Atajos del modulo</CardTitle>
          <CardDescription>Entra a las secciones clave sin perder contexto.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/documentos-gestion/contratos">
                Contratos
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/documentos-gestion/procedimientos">
                Procedimientos
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/documentos-gestion/seguridad">
                Seguridad
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/documentos-gestion">
                Gestión documental
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Documentos recientes</CardTitle>
            <CardDescription>Ultimos registros que entraron al sistema real</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentDocuments.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No hay documentos recientes cargados.
              </div>
            ) : (
              recentDocuments.slice(0, 5).map((doc) => (
                <div key={`${doc.documentId}-${doc.version}`} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{doc.nombre}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {doc.documentId} - v{doc.version}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">Por: {doc.creador}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {statusBadge(doc.estado)}
                      <span className="text-xs text-muted-foreground">
                        <Clock className="mr-1 inline h-3 w-3" />
                        {doc.fechaCreacion ? new Date(doc.fechaCreacion).toLocaleDateString('es-CL') : 'Sin fecha'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <CardTitle>Documentos por vencer</CardTitle>
            <CardDescription>{expiringDocuments.length} documentos proximos a vencer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {expiringDocuments.length > 0 ? (
              expiringDocuments.slice(0, 5).map((doc) => (
                <div key={doc.id} className="flex items-center justify-between rounded border border-amber-500/20 bg-background/60 p-3">
                  <span className="font-medium">{doc.title}</span>
                  <Badge className="bg-amber-500/10 text-amber-700">
                    {typeof doc.daysUntilExpiry === 'number' ? `${doc.daysUntilExpiry} días` : 'Sin dato'}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No hay documentos con vencimiento cercano.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar secciones</CardTitle>
          <CardDescription>Filtra el resumen por nombre, descripcion o id de seccion.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar sección o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {filteredCategories.map((category) => (
          <Card key={category.id} className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="text-lg">{category.name}</CardTitle>
                  <CardDescription className="mt-1">{category.description}</CardDescription>
                </div>
                <Badge variant="secondary">{category.count} docs</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pendientes</span>
                <span className="font-semibold text-primary">{category.pendingApprovals}</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{
                    width: `${Math.min(100, Math.max(10, category.count > 0 ? (category.pendingApprovals / category.count) * 100 : 10))}%`,
                  }}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No se encontraron secciones que coincidan con la busqueda.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
          <CardTitle>Documentos pendientes</CardTitle>
          <CardDescription>{pendingApprovals.length} documentos en revision</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingApprovals.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No hay documentos pendientes.
              </div>
            ) : (
              pendingApprovals.map((doc) => (
                <div key={doc.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{doc.nombre}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {doc.documentId} - v{doc.version}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Pendiente por: {doc.pendingBy || 'Sin asignar'}
                      </p>
                    </div>
                    {statusBadge(doc.estado)}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
