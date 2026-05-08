'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, ArrowLeft, Download, Edit, Trash2, Eye } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DocumentCategoryDetailPage() {
  const params = useParams();
  const categoryId = params.id as string;
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch category and its documents from API
  const { data, error, isLoading, mutate } = useSWR(
    `/api/dashboard/documentos-gestion/${categoryId}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 300000, // 5 minutes
    }
  );

  if (error) return <div className="text-red-500">Error loading category documents</div>;
  if (isLoading) return <div className="text-gray-500">Loading category...</div>;

  const category = data?.category || {};
  const documents = data?.documents || [];

  // Filter documents by search term
  const filteredDocuments = documents.filter((doc: any) =>
    doc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Vigente': 'bg-green-100 text-green-800',
      'Por Vencer': 'bg-yellow-100 text-yellow-800',
      'Vencido': 'bg-red-100 text-red-800',
      'Pendiente': 'bg-blue-100 text-blue-800',
      'Aprobado': 'bg-green-100 text-green-800',
      'Rechazado': 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/documentos-gestion">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{category.name || 'Documentos'}</h1>
          <p className="text-muted-foreground mt-1">{category.description}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white/5 backdrop-blur-md border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Documentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{documents.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-md border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Vigentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[var(--brand-verde)]">
              {documents.filter((d: any) => d.status === 'Vigente').length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-md border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Por Vencer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[var(--brand-gold)]">
              {documents.filter((d: any) => d.status === 'Por Vencer').length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-md border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Vencidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[var(--brand-rojo)]">
              {documents.filter((d: any) => d.status === 'Vencido').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="bg-white/5 backdrop-blur-md border-white/10">
        <CardHeader>
          <CardTitle>Buscar Documentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Busca por nombre, código o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card className="bg-white/5 backdrop-blur-md border-white/10">
        <CardHeader>
          <CardTitle>Documentos</CardTitle>
          <CardDescription>
            {filteredDocuments.length} de {documents.length} documentos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron documentos
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDocuments.map((doc: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-sm">{doc.name}</h3>
                      <Badge className={getStatusColor(doc.status)}>
                        {doc.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                      <span>Código: {doc.code || 'N/A'}</span>
                      <span>Versión: {doc.version || '1.0'}</span>
                      <span>Creado: {doc.createdDate ? new Date(doc.createdDate).toLocaleDateString() : 'N/A'}</span>
                      <span>Vence: {doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="gap-1">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-1">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-1">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-1 text-red-600 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
