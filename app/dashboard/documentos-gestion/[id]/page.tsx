'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, ArrowLeft, Download, Edit, Trash2, Eye, Plus, AlertCircle, CheckCircle, Clock } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Category-specific configurations
const CATEGORY_CONFIG: Record<string, any> = {
  '1': { // Contratos
    name: 'Contratos',
    displayName: 'Gestión de Contratos',
    icon: '📋',
    description: 'Contratos principales y subcontratos',
    fields: ['contract_number', 'contractor_name', 'contract_value', 'start_date', 'end_date', 'status', 'approval_status'],
    actions: ['Ver Detalles', 'Descargar', 'Solicitar Firma', 'Crear Enmienda', 'Archivar'],
    statuses: ['Vigente', 'Por Vencer', 'Vencido', 'En Negociación', 'Finalizado'],
  },
  '2': { // HSE
    name: 'HSE',
    displayName: 'Documentos HSE',
    icon: '🛡️',
    description: 'Documentos de salud, seguridad y medio ambiente',
    fields: ['document_type', 'compliance_status', 'inspection_date', 'next_review', 'auditor', 'findings'],
    actions: ['Ver Inspección', 'Descargar Reporte', 'Programar Auditoría', 'Registrar Hallazgo', 'Cerrar'],
    statuses: ['Conforme', 'No Conforme', 'Pendiente Inspección', 'En Revisión'],
  },
  '3': { // Compliance
    name: 'Compliance',
    displayName: 'Documentos de Cumplimiento',
    icon: '✅',
    description: 'Documentos de cumplimiento regulatorio',
    fields: ['requirement_code', 'framework', 'deadline', 'responsible_role', 'compliance_evidence', 'audit_required'],
    actions: ['Ver Requisito', 'Subir Evidencia', 'Programar Auditoría', 'Solicitar Aprobación', 'Archivar'],
    statuses: ['Conforme', 'No Conforme', 'En Proceso', 'Vencido'],
  },
  '4': { // Operacional
    name: 'Operacional',
    displayName: 'Documentos Operacionales',
    icon: '⚙️',
    description: 'Manuales y procedimientos operacionales',
    fields: ['document_type', 'procedure_code', 'equipment_applicable', 'last_update', 'version', 'training_required'],
    actions: ['Ver Procedimiento', 'Descargar', 'Solicitar Actualización', 'Registrar Capacitación', 'Revisar'],
    statuses: ['Vigente', 'Por Actualizar', 'Obsoleto', 'En Revisión'],
  },
  '5': { // Financiero
    name: 'Financiero',
    displayName: 'Documentos Financieros',
    icon: '💰',
    description: 'Reportes y estados financieros',
    fields: ['document_type', 'period', 'amount', 'currency', 'status', 'approver'],
    actions: ['Ver Reporte', 'Descargar', 'Aprobar', 'Rechazar', 'Auditar'],
    statuses: ['Aprobado', 'Pendiente Aprobación', 'Rechazado', 'En Auditoría'],
  },
  '6': { // Técnico
    name: 'Técnico',
    displayName: 'Documentos Técnicos',
    icon: '🔧',
    description: 'Especificaciones técnicas y planos',
    fields: ['document_type', 'equipment_related', 'revision', 'engineer_responsible', 'approval_status', 'effective_date'],
    actions: ['Ver Plano', 'Descargar', 'Solicitar Revisión', 'Aprobar Cambio', 'Archivar Versión'],
    statuses: ['Vigente', 'Por Revisar', 'Aprobado', 'Obsoleto', 'En Cambio'],
  },
};

const getStatusIcon = (status: string) => {
  if (status === 'Vigente' || status === 'Conforme' || status === 'Aprobado') {
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  }
  if (status === 'Por Vencer' || status === 'En Proceso' || status === 'En Revisión') {
    return <Clock className="w-4 h-4 text-yellow-500" />;
  }
  return <AlertCircle className="w-4 h-4 text-red-500" />;
};

export default function DocumentCategoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = params.id as string;
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewDocumentDialog, setShowNewDocumentDialog] = useState(false);

  const config = CATEGORY_CONFIG[categoryId] || CATEGORY_CONFIG['1'];

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

  // Filter documents by search term - handle different field names per category
  const filteredDocuments = documents.filter((doc: any) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      doc.name?.toLowerCase().includes(searchLower) ||
      doc.title?.toLowerCase().includes(searchLower) ||
      doc.code?.toLowerCase().includes(searchLower) ||
      doc.contract_number?.toLowerCase().includes(searchLower) ||
      doc.description?.toLowerCase().includes(searchLower)
    );
  });

  // Calculate status distribution
  const statusCount = filteredDocuments.reduce((acc: any, doc: any) => {
    acc[doc.status] = (acc[doc.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="text-4xl">{config.icon}</div>
              <h1 className="text-3xl font-bold">{config.displayName}</h1>
              <p className="text-muted-foreground">{config.description}</p>
            </div>
          </div>
          <Button 
            className="bg-[var(--brand-naranja)] text-white hover:bg-[var(--brand-naranja)]/90"
            onClick={() => setShowNewDocumentDialog(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo {config.name}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white/5 backdrop-blur-md border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Documentos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{documents.length}</div>
              <p className="text-xs text-muted-foreground mt-1">En este tipo</p>
            </CardContent>
          </Card>

          {Object.entries(statusCount).map(([status, count]: [string, any]) => (
            <Card key={status} className="bg-white/5 backdrop-blur-md border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {getStatusIcon(status)}
                  {status}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{count}</div>
                <p className="text-xs text-muted-foreground mt-1">documento{count !== 1 ? 's' : ''}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search and Filter */}
        <Card className="bg-white/5 backdrop-blur-md border-white/10">
          <CardHeader>
            <CardTitle>Buscar {config.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={`Buscar por nombre, código o descripción...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/5 border-white/10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Documents Table */}
        <Card className="bg-white/5 backdrop-blur-md border-white/10">
          <CardHeader>
            <CardTitle>{filteredDocuments.length} Documentos Encontrados</CardTitle>
            <CardDescription>Gestión y seguimiento de {config.name.toLowerCase()}</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredDocuments.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No hay documentos en esta categoría</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 font-semibold">Nombre</th>
                      <th className="text-left py-3 px-4 font-semibold">Código</th>
                      <th className="text-left py-3 px-4 font-semibold">Estado</th>
                      <th className="text-left py-3 px-4 font-semibold">Fecha</th>
                      <th className="text-right py-3 px-4 font-semibold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocuments.map((doc: any, idx: number) => (
                      <tr key={idx} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium">{doc.title || doc.name || 'N/A'}</div>
                          <div className="text-xs text-muted-foreground">{doc.description || 'Sin descripción'}</div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{doc.contract_number || doc.code || '-'}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="flex items-center gap-1 w-fit">
                            {getStatusIcon(doc.status)}
                            {doc.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {doc.start_date ? new Date(doc.start_date).toLocaleDateString('es-CL') : doc.date ? new Date(doc.date).toLocaleDateString('es-CL') : '-'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category-Specific Actions */}
        <Card className="bg-white/5 backdrop-blur-md border-white/10">
          <CardHeader>
            <CardTitle>Acciones Disponibles</CardTitle>
            <CardDescription>Operaciones específicas para {config.name.toLowerCase()}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {config.actions.map((action: string, idx: number) => (
                <Button key={idx} variant="outline" className="w-full bg-white/5 border-white/10 hover:bg-white/10">
                  {action}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Document Dialog */}
      {showNewDocumentDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl bg-background border-white/10 max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 sticky top-0 bg-background border-b border-white/10">
              <div>
                <CardTitle>Crear Nuevo {config.name}</CardTitle>
                <CardDescription>Registra un nuevo documento en el sistema</CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowNewDocumentDialog(false)}
              >
                ✕
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-5">
                {/* Título y Número */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Título del Documento *</label>
                    <Input placeholder="Ej: Contrato Principal La Patagua 2024" className="bg-white/5 border-white/10" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Número de Contrato *</label>
                    <Input placeholder="Ej: CNT-2024-001" className="bg-white/5 border-white/10" />
                  </div>
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm font-medium mb-2">Descripción</label>
                  <Input placeholder="Breve descripción del contrato y su propósito" className="bg-white/5 border-white/10" />
                </div>

                {/* Tipo de Contrato y Estado */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Tipo de Contrato *</label>
                    <select className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-sm">
                      <option>Seleccionar tipo...</option>
                      <option>Principal</option>
                      <option>Subcontrato</option>
                      <option>Addendum</option>
                      <option>Enmienda</option>
                      <option>Marco</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Estado *</label>
                    <select className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-sm">
                      {config.statuses.map((status: string) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Fechas */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Fecha de Inicio *</label>
                    <Input type="date" className="bg-white/5 border-white/10" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Fecha de Término *</label>
                    <Input type="date" className="bg-white/5 border-white/10" />
                  </div>
                </div>

                {/* Valor y Moneda */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Valor del Contrato</label>
                    <Input type="number" placeholder="Ej: 1000000" className="bg-white/5 border-white/10" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Moneda</label>
                    <select className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-sm">
                      <option>CLP</option>
                      <option>USD</option>
                      <option>EUR</option>
                    </select>
                  </div>
                </div>

                {/* Términos de Pago */}
                <div>
                  <label className="block text-sm font-medium mb-2">Términos de Pago</label>
                  <Input placeholder="Ej: A 30 días desde la emisión" className="bg-white/5 border-white/10" />
                </div>

                {/* Responsable y Área */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Responsable</label>
                    <Input placeholder="Nombre del responsable" className="bg-white/5 border-white/10" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Área Responsable</label>
                    <select className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-sm">
                      <option>Seleccionar área...</option>
                      <option>Administración</option>
                      <option>Operaciones</option>
                      <option>Legal</option>
                      <option>Finanzas</option>
                      <option>RRHH</option>
                      <option>Compras</option>
                    </select>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-white/10 my-2" />

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium mb-2">Documento PDF o Word *</label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-[var(--brand-naranja)]/50 rounded-lg cursor-pointer hover:bg-[var(--brand-naranja)]/5 transition">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg className="w-8 h-8 text-[var(--brand-naranja)] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-sm text-muted-foreground mb-1">
                          <span className="font-semibold text-white">Haz clic para subir</span> o arrastra el archivo
                        </p>
                        <p className="text-xs text-muted-foreground">PDF, DOC, DOCX (máx. 50MB)</p>
                      </div>
                      <input type="file" className="hidden" accept=".pdf,.doc,.docx" />
                    </label>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-6 border-t border-white/10 mt-6">
                  <Button 
                    variant="outline"
                    onClick={() => setShowNewDocumentDialog(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    className="bg-[var(--brand-naranja)] text-white hover:bg-[var(--brand-naranja)]/90"
                    onClick={() => {
                      // Handle document creation here
                      setShowNewDocumentDialog(false);
                    }}
                  >
                    Crear Documento
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
