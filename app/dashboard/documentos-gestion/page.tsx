'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Plus, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DocumentosGestionPage() {
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch documents from API
  const { data, error, isLoading } = useSWR(
    '/api/dashboard/documentos-gestion',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 300000, // 5 minutes
    }
  );

  // Extract data safely
  const categories = data?.categories || [];
  const pendingApprovals = data?.pendingApprovals || [];
  const recentDocuments = data?.recentDocuments || [];
  const expiringDocuments = data?.expiringDocuments || [];
  const stats = data?.stats || { total: 0, pending: 0, expiring: 0 };

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!searchTerm) return categories;
    return categories.filter((cat: any) =>
      cat.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cat.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [categories, searchTerm]);

  if (error) return <div className="text-red-500">Error loading documents</div>;
  if (isLoading) return <div className="text-gray-500">Loading document management...</div>;

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'aprobado':
        return <Badge className="bg-[var(--brand-verde)] gap-1"><CheckCircle className="h-3 w-3" /> Aprobado</Badge>;
      case 'pendiente_validador1':
      case 'pendiente_validador2':
        return <Badge className="bg-[var(--secondary)] gap-1"><Clock className="h-3 w-3" /> Pendiente</Badge>;
      case 'rechazado':
        return <Badge className="bg-[var(--brand-rojo)] gap-1"><XCircle className="h-3 w-3" /> Rechazado</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Gestión Documental</h1>
          <p className="text-muted-foreground mt-1">
            Centraliza y gestiona todos los documentos de la operación minera
          </p>
        </div>
        <Button className="gap-2 bg-[var(--brand-naranja)] hover:bg-[var(--brand-naranja)]/90">
          <Plus className="h-4 w-4" />
          Cargar Documento
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Documentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">En el sistema</p>
          </CardContent>
        </Card>

        <Card className="border-[var(--secondary)]/30 bg-[var(--secondary)]/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[var(--secondary)]">Pendiente Aprobación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[var(--secondary)]">{stats.pending}</div>
            <p className="text-xs text-muted-foreground mt-1">Requieren revisión</p>
          </CardContent>
        </Card>

        <Card className="border-[var(--brand-verde)]/30 bg-[var(--brand-verde)]/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[var(--brand-verde)]">Recientemente Actualizados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[var(--brand-verde)]">{expiringDocuments.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Últimos 7 días</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Categorías Activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{categories.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Tipos de documentos</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals Section */}
      {pendingApprovals.length > 0 && (
        <Card className="border-[var(--secondary)]/30 bg-[var(--secondary)]/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-[var(--secondary)]" />
              <CardTitle>Documentos Pendientes de Aprobación</CardTitle>
            </div>
            <CardDescription>{pendingApprovals.length} documentos requieren revisión</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingApprovals.map((doc: any) => (
              <div key={doc.id} className="flex items-center justify-between p-3 bg-background/50 rounded border border-[var(--secondary)]/20">
                <div className="flex-1">
                  <div className="font-semibold text-sm">{doc.nombre}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-3 mt-1">
                    <span>ID: {doc.documentId} • v{doc.version}</span>
                    <span className="text-[var(--secondary)]">Por revisar: {doc.pendingBy || 'Sin asignar'}</span>
                  </div>
                </div>
                {getEstadoBadge(doc.estado)}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Documents */}
      {recentDocuments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Documentos Recientes</CardTitle>
            <CardDescription>Últimos documentos creados o actualizados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentDocuments.map((doc: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 hover:bg-accent rounded border">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{doc.nombre}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                      <span>{doc.documentId}</span>
                      <span>•</span>
                      <span>v{doc.version}</span>
                      <span>•</span>
                      <span>Por: {doc.creador}</span>
                    </div>
                  </div>
                  {getEstadoBadge(doc.estado)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Buscar Categorías</CardTitle>
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

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategories.map((category: any) => (
          <Link key={category.id} href={`/dashboard/documentos-gestion/${category.id}`}>
            <Card className="cursor-pointer hover:shadow-lg transition-all h-full">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                    <CardDescription className="text-xs mt-1">{category.description}</CardDescription>
                  </div>
                  {category.pendingApprovals > 0 && (
                    <Badge variant="destructive" className="ml-2">{category.pendingApprovals}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{category.count || 0} docs</span>
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
            No se encontraron categorías que coincidan con tu búsqueda
          </CardContent>
        </Card>
      )}
    </div>
  );
}
