'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, FileText, Search, Upload, AlertCircle, Calendar, CheckCircle2, Clock, BarChart3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Document {
  id: string;
  title: string;
  category: string;
  status: 'vigente' | 'vencido' | 'pendiente_aprobacion';
  expiration_date?: string;
  created_at: string;
  approval_status?: 'pendiente' | 'aprobado' | 'rechazado';
  approvals?: {
    level: 'manager' | 'finance' | 'director';
    approved: boolean;
    date?: string;
  }[];
  compliance_score?: number;
  sernageomin_compliant?: boolean;
}

export default function DocumentosPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'all' | 'pending' | 'compliance'>('all');

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

  const pendingApprovals = documents.filter(d => d.approval_status === 'pendiente');
  const complianceScore = documents.length > 0 
    ? Math.round((documents.filter(d => d.sernageomin_compliant).length / documents.length) * 100)
    : 0;

  const statusColors: Record<string, string> = {
    vigente: 'bg-accent/10 text-accent',
    vencido: 'bg-destructive/10 text-destructive',
    pendiente_aprobacion: 'bg-primary/10 text-primary',
  };

  const approvalColors = {
    pendiente: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200',
    aprobado: 'bg-accent/10 text-accent',
    rechazado: 'bg-destructive/10 text-destructive',
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Gestión de Documentos</h1>
            <p className="text-muted-foreground mt-3">
              Sistema de aprobaciones multinivel, cumplimiento SERNAGEOMIN y trazabilidad completa
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
            <p className="text-xs text-muted-foreground mt-2">en el sistema</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-blue-500/5 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-full -mr-12 -mt-12" />
          <CardHeader className="pb-3 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              Pendiente Aprobación
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-blue-600">{pendingApprovals.length}</div>
            <p className="text-xs text-muted-foreground mt-2">en flujo de aprobación</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-green-500/5 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-green-500/10 to-transparent rounded-full -mr-12 -mt-12" />
          <CardHeader className="pb-3 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Cumplimiento SERNAGEOMIN
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-green-600">{complianceScore}%</div>
            <p className="text-xs text-muted-foreground mt-2">documentos normados</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-muted/50 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-muted to-transparent rounded-full -mr-12 -mt-12" />
          <CardHeader className="pb-3 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Por Vencer
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-muted-foreground">{expiringDocuments.length}</div>
            <p className="text-xs text-muted-foreground mt-2">próximos 30 días</p>
          </CardContent>
        </Card>
      </div>

      {/* Alert for Expiring */}
      {expiringDocuments.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <CardTitle className="text-destructive">
                  Documentos por Vencer
                </CardTitle>
                <CardDescription>
                  {expiringDocuments.length} documento(s) vencerá(n) en los próximos 30 días
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <Button 
          variant={selectedTab === 'all' ? 'default' : 'ghost'}
          onClick={() => setSelectedTab('all')}
        >
          Todos
        </Button>
        <Button 
          variant={selectedTab === 'pending' ? 'default' : 'ghost'}
          onClick={() => setSelectedTab('pending')}
        >
          Pendiente Aprobación ({pendingApprovals.length})
        </Button>
        <Button 
          variant={selectedTab === 'compliance' ? 'default' : 'ghost'}
          onClick={() => setSelectedTab('compliance')}
          className="gap-2"
        >
          <BarChart3 className="h-4 w-4" />
          Cumplimiento
        </Button>
      </div>

      {/* Documents Table */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <CardTitle>Listado de Documentos</CardTitle>
              <CardDescription>Gestión centralizada con trazabilidad completa</CardDescription>
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
                    <th className="text-left font-semibold text-muted-foreground py-3 px-4">Aprobación</th>
                    <th className="text-left font-semibold text-muted-foreground py-3 px-4">SERNAGEOMIN</th>
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
                      <td className="py-3 px-4">
                        <Badge className={approvalColors[doc.approval_status || 'pendiente'] || ''}>
                          {doc.approval_status || 'pendiente'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {doc.sernageomin_compliant ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                        )}
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
