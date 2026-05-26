'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Search, Plus, FileText, Eye, Download, Edit, Trash2, CheckCircle, Clock, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ContratosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewContractModal, setShowNewContractModal] = useState(false);

  // Fetch contracts from the contracts table
  const { data, error, isLoading, mutate } = useSWR(
    '/api/contracts',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 60000,
    }
  );

  const contracts = data?.contracts || [];

  // Filter contracts by search term
  const filteredContracts = contracts.filter((contract: any) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      contract.title?.toLowerCase().includes(searchLower) ||
      contract.contract_number?.toLowerCase().includes(searchLower) ||
      contract.description?.toLowerCase().includes(searchLower) ||
      contract.responsible_person?.toLowerCase().includes(searchLower)
    );
  });

  // Calculate stats
  const stats = {
    total: contracts.length,
    vigentes: contracts.filter((c: any) => c.status === 'Vigente').length,
    porVencer: contracts.filter((c: any) => c.status === 'Por Vencer').length,
    enRevision: contracts.filter((c: any) => c.status === 'En Revisión').length,
    vencidos: contracts.filter((c: any) => c.status === 'Vencido').length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Vigente': return 'bg-[var(--brand-verde)]/20 text-[var(--brand-verde)] border-[var(--brand-verde)]/50';
      case 'Por Vencer': return 'bg-[var(--brand-gold)]/20 text-[var(--brand-gold)] border-[var(--brand-gold)]/50';
      case 'En Revisión': return 'bg-[var(--secondary)]/20 text-[var(--secondary)] border-[var(--secondary)]/20/50';
      case 'Vencido': return 'bg-[var(--brand-rojo)]/20 text-[var(--brand-rojo)] border-[var(--brand-rojo)]/50';
      default: return 'bg-muted/20 text-gray-400 border-gray-500/50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Vigente': return <CheckCircle className="w-3 h-3" />;
      case 'Por Vencer': return <Clock className="w-3 h-3" />;
      case 'En Revisión': return <Clock className="w-3 h-3" />;
      case 'Vencido': return <AlertCircle className="w-3 h-3" />;
      default: return null;
    }
  };

  const formatCurrency = (value: number, currency: string) => {
    if (!value) return '-';
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: currency || 'CLP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand-naranja)] mx-auto mb-4"></div>
        <p className="text-muted-foreground">Cargando contratos...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="text-center py-12">
      <AlertCircle className="h-12 w-12 text-[var(--brand-rojo)] mx-auto mb-4" />
      <p className="text-[var(--brand-rojo)]">Error al cargar contratos</p>
      <Button variant="outline" onClick={() => mutate()} className="mt-4">
        Reintentar
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/documentos-gestion">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-[var(--brand-naranja)]/20 flex items-center justify-center">
                <FileText className="w-6 h-6 text-[var(--brand-naranja)]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Gestión de Contratos</h1>
                <p className="text-muted-foreground text-sm">Contratos principales y subcontratos</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => mutate()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Actualizar
          </Button>
          <Button 
            className="bg-[var(--brand-naranja)] text-white hover:bg-[var(--brand-naranja)]/90"
            onClick={() => setShowNewContractModal(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Nuevo Contrato
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Contratos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">En el sistema</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--brand-verde)]">Vigentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-verde)]">{stats.vigentes}</div>
            <p className="text-xs text-muted-foreground mt-1">Activos</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--brand-gold)]">Por Vencer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-gold)]">{stats.porVencer}</div>
            <p className="text-xs text-muted-foreground mt-1">Próximos a vencer</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--secondary)]">En Revisión</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--secondary)]">{stats.enRevision}</div>
            <p className="text-xs text-muted-foreground mt-1">Pendientes</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--brand-rojo)]">Vencidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-rojo)]">{stats.vencidos}</div>
            <p className="text-xs text-muted-foreground mt-1">Requieren acción</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Buscar Contratos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título, número, descripción o responsable..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/5 border-white/10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Contracts Table */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>{filteredContracts.length} Contratos Encontrados</CardTitle>
          <CardDescription>Lista de contratos registrados en el sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredContracts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay contratos que coincidan con tu búsqueda</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Contrato</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Número</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Tipo</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Estado</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Valor</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Vigencia</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Responsable</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContracts.map((contract: any) => (
                    <tr key={contract.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium">{contract.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">{contract.description}</div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground font-mono text-xs">{contract.contract_number}</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-xs">{contract.contract_type}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className={`flex items-center gap-1 w-fit ${getStatusColor(contract.status)}`}>
                          {getStatusIcon(contract.status)}
                          {contract.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {formatCurrency(contract.contract_value, contract.currency)}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        <div>{contract.start_date ? new Date(contract.start_date).toLocaleDateString('es-CL') : '-'}</div>
                        <div>→ {contract.end_date ? new Date(contract.end_date).toLocaleDateString('es-CL') : '-'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">{contract.responsible_person}</div>
                        <div className="text-xs text-muted-foreground">{contract.responsible_area}</div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" title="Ver detalle">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Descargar">
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Editar">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Eliminar" className="text-[var(--brand-rojo)] hover:text-[var(--brand-rojo)]">
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

      {/* New Contract Modal */}
      {showNewContractModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl bg-background border-white/10 max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 sticky top-0 bg-background border-b border-white/10">
              <div>
                <CardTitle>Crear Nuevo Contrato</CardTitle>
                <CardDescription>Registra un nuevo contrato en el sistema</CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowNewContractModal(false)}
              >
                ✕
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Título del Contrato *</label>
                    <Input placeholder="Ej: Contrato Principal 2024" className="bg-white/5 border-white/10" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Número de Contrato *</label>
                    <Input placeholder="Ej: CNT-2024-001" className="bg-white/5 border-white/10" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Descripción</label>
                  <Input placeholder="Breve descripción del contrato" className="bg-white/5 border-white/10" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Tipo de Contrato *</label>
                    <select className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-sm">
                      <option>Principal</option>
                      <option>Subcontrato</option>
                      <option>Enmienda</option>
                      <option>Addendum</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Estado *</label>
                    <select className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-sm">
                      <option>Vigente</option>
                      <option>Por Vencer</option>
                      <option>En Revisión</option>
                      <option>Vencido</option>
                    </select>
                  </div>
                </div>

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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Responsable</label>
                    <Input placeholder="Nombre del responsable" className="bg-white/5 border-white/10" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Área Responsable</label>
                    <select className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-sm">
                      <option>Operaciones</option>
                      <option>Mantención</option>
                      <option>Administración</option>
                      <option>Legal</option>
                      <option>Compras</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-white/10 my-2" />

                <div>
                  <label className="block text-sm font-medium mb-2">Documento PDF *</label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-[var(--brand-naranja)]/50 rounded-lg cursor-pointer hover:bg-[var(--brand-naranja)]/5 transition">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg className="w-8 h-8 text-[var(--brand-naranja)] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-sm text-muted-foreground mb-1">
                          <span className="font-semibold text-white">Haz clic para subir</span> o arrastra
                        </p>
                        <p className="text-xs text-muted-foreground">PDF, DOC, DOCX (máx. 50MB)</p>
                      </div>
                      <input type="file" className="hidden" accept=".pdf,.doc,.docx" />
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-white/10 mt-6">
                  <Button variant="outline" onClick={() => setShowNewContractModal(false)}>
                    Cancelar
                  </Button>
                  <Button className="bg-[var(--brand-naranja)] text-white hover:bg-[var(--brand-naranja)]/90">
                    Crear Contrato
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
