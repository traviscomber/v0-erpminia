'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Plus } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DocumentosGestionPage() {
  // Call all hooks at the top level BEFORE any conditional returns
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch documents from API
  const { data, error, isLoading, mutate } = useSWR(
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
  const recentDocuments = data?.recentDocuments || [];
  const expiringDocuments = data?.expiringDocuments || [];
  const pendingApprovals = data?.pendingApprovals || [];

  // Calculate stats
  const totalDocuments = recentDocuments.length;
  const totalPendingApprovals = pendingApprovals.length;

  // Filter categories based on search - must be called after other hooks
  const filteredCategories = useMemo(() => {
    if (!searchTerm) return categories;
    return categories.filter(cat =>
      cat.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cat.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [categories, searchTerm]);

  // Now safe to return early if loading/error AFTER all hooks
  if (error) return <div className="text-red-500">Error loading documents</div>;
  if (isLoading) return <div className="text-gray-500">Loading document management...</div>;

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
        <Button className="gap-2 bg-orange-600 hover:bg-orange-700">
          <Plus className="h-4 w-4" />
          Cargar Documento
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Documentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalDocuments}</div>
            <p className="text-xs text-muted-foreground mt-1">Documentos en el sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pendiente Aprobación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{totalPendingApprovals}</div>
            <p className="text-xs text-muted-foreground mt-1">Requieren revisión</p>
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
        {filteredCategories.map((category: any) => {
          // Generate slug from category name for cleaner URLs
          const slug = category.name.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '');
          return (
            <Link key={category.id} href={`/dashboard/documentos-gestion/${slug}`}>
              <Card className="cursor-pointer hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{category.name}</CardTitle>
                      <CardDescription className="text-xs mt-1">{category.description}</CardDescription>
                    </div>
                    {category.pendingApprovals > 0 && (
                      <Badge variant="destructive">{category.pendingApprovals}</Badge>
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
          );
        })}
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
