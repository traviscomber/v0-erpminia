'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, FileText, Search, Upload, AlertCircle, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Document {
  id: string;
  title: string;
  category: string;
  status: string;
  expiration_date?: string;
  created_at: string;
}

export default function DocumentosPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch from API
    setLoading(false);
  }, []);

  const expiringDocuments = documents.filter(doc => {
    if (!doc.expiration_date) return false;
    const expiryDate = new Date(doc.expiration_date);
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  });

  const statusColors: Record<string, string> = {
    vigente: 'bg-green-100 text-green-800',
    vencido: 'bg-red-100 text-red-800',
    proximo_vencer: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Sistema de Documentos</h1>
            <p className="text-muted-foreground mt-3">
              Gestión centralizada de documentos, cumplimiento normativo y trazabilidad
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Upload className="h-4 w-4" />
              Importar
            </Button>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Documento
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-border overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-chart-1/10 to-transparent rounded-full -mr-12 -mt-12" />
          <CardHeader className="pb-3 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Documentos
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold">{documents.length}</div>
            <p className="text-xs text-muted-foreground mt-2">documentos en el sistema</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-green-500/5 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-green-500/10 to-transparent rounded-full -mr-12 -mt-12" />
          <CardHeader className="pb-3 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vigentes
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-green-600">
              {documents.filter(d => d.status === 'vigente').length}
            </div>
            <p className="text-xs text-muted-foreground mt-2">documentos activos</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-yellow-500/5 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-yellow-500/10 to-transparent rounded-full -mr-12 -mt-12" />
          <CardHeader className="pb-3 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Por Vencer
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-yellow-600">{expiringDocuments.length}</div>
            <p className="text-xs text-muted-foreground mt-2">próximos 30 días</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-red-500/5 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-red-500/10 to-transparent rounded-full -mr-12 -mt-12" />
          <CardHeader className="pb-3 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vencidos
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-red-600">
              {documents.filter(d => d.status === 'vencido').length}
            </div>
            <p className="text-xs text-muted-foreground mt-2">requieren atención</p>
          </CardContent>
        </Card>
      </div>

      {/* Alert for Expiring */}
      {expiringDocuments.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <CardTitle className="text-yellow-900 dark:text-yellow-100">
                  Documentos por Vencer
                </CardTitle>
                <CardDescription className="text-yellow-800 dark:text-yellow-200">
                  {expiringDocuments.length} documento(s) vencerá(n) en los próximos 30 días
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Documents Table */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <CardTitle>Listado de Documentos</CardTitle>
              <CardDescription>Administra todos los documentos del sistema</CardDescription>
            </div>
            <div className="relative flex-1 md:flex-initial md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar documento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-input"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando documentos...</div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No hay documentos registrados</p>
              <Button className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Crear primer documento
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left font-semibold text-muted-foreground py-3 px-4">Título</th>
                    <th className="text-left font-semibold text-muted-foreground py-3 px-4">Categoría</th>
                    <th className="text-left font-semibold text-muted-foreground py-3 px-4">Estado</th>
                    <th className="text-left font-semibold text-muted-foreground py-3 px-4">Vencimiento</th>
                    <th className="text-left font-semibold text-muted-foreground py-3 px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr
                      key={doc.id}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors group"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{doc.title}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{doc.category}</td>
                      <td className="py-3 px-4">
                        <Badge className={statusColors[doc.status] || ''}>
                          {doc.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {doc.expiration_date ? (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {new Date(doc.expiration_date).toLocaleDateString('es-CL')}
                          </div>
                        ) : (
                          <span>Sin vencimiento</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Ver
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
