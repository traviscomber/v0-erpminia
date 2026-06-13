'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { toast } from 'sonner';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Download,
  Eye,
  FileText,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Request failed');
  return response.json();
};

const initialFormState = {
  title: '',
  contractNumber: '',
  description: '',
  contractType: 'Principal',
  status: 'En Revisión',
  startDate: '',
  endDate: '',
  reviewDueDate: '',
  contractValue: '',
  paidAmount: '',
  currency: 'CLP',
  contractorName: '',
  responsiblePerson: '',
  responsibleArea: 'Legal',
  propertyName: '',
  projectName: '',
  royaltyRate: '',
  guaranteeAmount: '',
  complianceStatus: 'Pendiente',
  complianceNotes: '',
};

export default function ContratosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewContractModal, setShowNewContractModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [formState, setFormState] = useState(initialFormState);

  const { data, error, isLoading, mutate } = useSWR('/api/contracts', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    refreshInterval: 60000,
  });

  const contracts = data?.contracts || [];

  const filteredContracts = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return contracts.filter((contract: any) => {
      if (!searchLower) return true;
      return (
        contract.title.toLowerCase().includes(searchLower) ||
        contract.contract_number.toLowerCase().includes(searchLower) ||
        contract.description.toLowerCase().includes(searchLower) ||
        contract.responsible_person.toLowerCase().includes(searchLower) ||
        contract.contractor_name.toLowerCase().includes(searchLower)
      );
    });
  }, [contracts, searchTerm]);

  const stats = {
    total: contracts.length,
    vigentes: contracts.filter((contract: any) => contract.status === 'Vigente').length,
    porVencer: contracts.filter((contract: any) => contract.status === 'Por Vencer').length,
    enRevision: contracts.filter((contract: any) => contract.status === 'En Revisión').length,
    vencidos: contracts.filter((contract: any) => contract.status === 'Vencido').length,
  };

  const updateField = (field: string, value: string) => {
    setFormState((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setFormState(initialFormState);
    setContractFile(null);
  };

  const handleCreateContract = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const payload = new FormData();
      Object.entries(formState).forEach(([key, value]) => payload.append(key, value));
      if (contractFile) {
        payload.append('file', contractFile);
      }

      const response = await fetch('/api/contracts', {
        method: 'POST',
        body: payload,
      });

      if (!response.ok) {
        const errorPayload = await response.json();
        throw new Error(errorPayload.error || 'No se pudo crear el contrato');
      }

      toast.success('Contrato creado correctamente');
      resetForm();
      setShowNewContractModal(false);
      await mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al crear contrato');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Vigente':
        return 'bg-[var(--brand-verde)]/20 text-[var(--brand-verde)] border-[var(--brand-verde)]/50';
      case 'Por Vencer':
        return 'bg-[var(--brand-gold)]/20 text-[var(--brand-gold)] border-[var(--brand-gold)]/50';
      case 'En Revisión':
        return 'bg-[var(--secondary)]/20 text-[var(--secondary)] border-[var(--secondary)]/30';
      case 'Vencido':
        return 'bg-[var(--brand-rojo)]/20 text-[var(--brand-rojo)] border-[var(--brand-rojo)]/50';
      default:
        return 'bg-muted/20 text-gray-400 border-gray-500/50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Vigente':
        return <CheckCircle className="w-3 h-3" />;
      case 'Por Vencer':
      case 'En Revisión':
        return <Clock className="w-3 h-3" />;
      case 'Vencido':
        return <AlertCircle className="w-3 h-3" />;
      default:
        return null;
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand-naranja)] mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando contratos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-[var(--brand-rojo)] mx-auto mb-4" />
        <p className="text-[var(--brand-rojo)]">Error al cargar contratos</p>
        <Button variant="outline" onClick={() => mutate()} className="mt-4">
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
                <p className="text-muted-foreground text-sm">
                  Contratos principales, subcontratos y respaldo legal
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/documentos-gestion/contratos/reportes">
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-1" />
              Ver Reportes
            </Button>
          </Link>
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

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Contratos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--brand-verde)]">
              Vigentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-verde)]">{stats.vigentes}</div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--brand-gold)]">
              Por Vencer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-gold)]">
              {stats.porVencer}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--secondary)]">
              En Revisión
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--secondary)]">
              {stats.enRevision}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--brand-rojo)]">
              Vencidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-rojo)]">{stats.vencidos}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Buscar Contratos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título, número, contratista o responsable..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/5 border-white/10"
            />
          </div>
        </CardContent>
      </Card>

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
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Contrato
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Número
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Tipo
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Estado
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Valor
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Vigencia
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Responsable
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContracts.map((contract: any) => (
                    <tr
                      key={contract.id}
                      className="border-b border-white/10 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-medium">{contract.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {contract.description}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {contract.contractor_name || 'Sin contratista'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground font-mono text-xs">
                        {contract.contract_number}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-xs">
                          {contract.contract_type}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={`flex items-center gap-1 w-fit ${getStatusColor(contract.status)}`}
                        >
                          {getStatusIcon(contract.status)}
                          {contract.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {formatCurrency(contract.contract_value, contract.currency)}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        <div>
                          {contract.start_date
                            ? new Date(contract.start_date).toLocaleDateString('es-CL')
                            : '-'}
                        </div>
                        <div>
                          →{' '}
                          {contract.end_date
                            ? new Date(contract.end_date).toLocaleDateString('es-CL')
                            : '-'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">{contract.responsible_person || '-'}</div>
                        <div className="text-xs text-muted-foreground">
                          {contract.responsible_area || '-'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1">
                          {contract.file_url ? (
                            <Button variant="ghost" size="sm" asChild title="Ver archivo">
                              <a href={contract.file_url} target="_blank" rel="noopener noreferrer">
                                <Eye className="w-4 h-4" />
                              </a>
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" disabled title="Sin archivo">
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          {contract.file_url ? (
                            <Button variant="ghost" size="sm" asChild title="Descargar">
                              <a href={contract.file_url} target="_blank" rel="noopener noreferrer">
                                <Download className="w-4 h-4" />
                              </a>
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" disabled title="Sin archivo">
                              <Download className="w-4 h-4" />
                            </Button>
                          )}
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

      {showNewContractModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl bg-background border-white/10 max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 sticky top-0 bg-background border-b border-white/10">
              <div>
                <CardTitle>Crear Nuevo Contrato</CardTitle>
                <CardDescription>Registra un nuevo contrato con respaldo legal</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowNewContractModal(false)}>
                ×
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              <form className="space-y-5" onSubmit={handleCreateContract}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Título del Contrato *</label>
                    <Input
                      value={formState.title}
                      onChange={(e) => updateField('title', e.target.value)}
                      placeholder="Ej: Contrato Mantención Planta 2026"
                      className="bg-white/5 border-white/10"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Número de Contrato *</label>
                    <Input
                      value={formState.contractNumber}
                      onChange={(e) => updateField('contractNumber', e.target.value)}
                      placeholder="Ej: CNT-2026-001"
                      className="bg-white/5 border-white/10"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Descripción</label>
                  <Input
                    value={formState.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="Breve descripción del contrato"
                    className="bg-white/5 border-white/10"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Tipo de Contrato *</label>
                    <select
                      value={formState.contractType}
                      onChange={(e) => updateField('contractType', e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-sm"
                    >
                      <option>Principal</option>
                      <option>Subcontrato</option>
                      <option>Enmienda</option>
                      <option>Addendum</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Estado *</label>
                    <select
                      value={formState.status}
                      onChange={(e) => updateField('status', e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-sm"
                    >
                      <option>En Revisión</option>
                      <option>Vigente</option>
                      <option>Por Vencer</option>
                      <option>Vencido</option>
                      <option>Borrador</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Fecha de Inicio</label>
                    <Input
                      type="date"
                      value={formState.startDate}
                      onChange={(e) => updateField('startDate', e.target.value)}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Fecha de Término</label>
                    <Input
                      type="date"
                      value={formState.endDate}
                      onChange={(e) => updateField('endDate', e.target.value)}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Próxima Revisión Legal</label>
                    <Input
                      type="date"
                      value={formState.reviewDueDate}
                      onChange={(e) => updateField('reviewDueDate', e.target.value)}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Valor del Contrato</label>
                    <Input
                      type="number"
                      value={formState.contractValue}
                      onChange={(e) => updateField('contractValue', e.target.value)}
                      placeholder="Ej: 1000000"
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Monto Pagado</label>
                    <Input
                      type="number"
                      value={formState.paidAmount}
                      onChange={(e) => updateField('paidAmount', e.target.value)}
                      placeholder="Ej: 250000"
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Moneda</label>
                    <select
                      value={formState.currency}
                      onChange={(e) => updateField('currency', e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-sm"
                    >
                      <option>CLP</option>
                      <option>USD</option>
                      <option>EUR</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Contratista</label>
                    <Input
                      value={formState.contractorName}
                      onChange={(e) => updateField('contractorName', e.target.value)}
                      placeholder="Nombre empresa o persona"
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Responsable</label>
                    <Input
                      value={formState.responsiblePerson}
                      onChange={(e) => updateField('responsiblePerson', e.target.value)}
                      placeholder="Nombre del responsable"
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Área Responsable</label>
                    <select
                      value={formState.responsibleArea}
                      onChange={(e) => updateField('responsibleArea', e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-sm"
                    >
                      <option>Legal</option>
                      <option>Operaciones</option>
                      <option>Mantención</option>
                      <option>Administración</option>
                      <option>Compras</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Propiedad</label>
                    <Input
                      value={formState.propertyName}
                      onChange={(e) => updateField('propertyName', e.target.value)}
                      placeholder="Ej: Propiedad Norte"
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Proyecto</label>
                    <Input
                      value={formState.projectName}
                      onChange={(e) => updateField('projectName', e.target.value)}
                      placeholder="Ej: Expansión Planta"
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Tasa Regalía (%)</label>
                    <Input
                      type="number"
                      value={formState.royaltyRate}
                      onChange={(e) => updateField('royaltyRate', e.target.value)}
                      placeholder="Ej: 5"
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Garantía</label>
                    <Input
                      type="number"
                      value={formState.guaranteeAmount}
                      onChange={(e) => updateField('guaranteeAmount', e.target.value)}
                      placeholder="Ej: 50000"
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Cumplimiento</label>
                    <select
                      value={formState.complianceStatus}
                      onChange={(e) => updateField('complianceStatus', e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-sm"
                    >
                      <option>Pendiente</option>
                      <option>Al Día</option>
                      <option>Observado</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Notas de cumplimiento</label>
                  <Input
                    value={formState.complianceNotes}
                    onChange={(e) => updateField('complianceNotes', e.target.value)}
                    placeholder="Observaciones legales o regulatorias"
                    className="bg-white/5 border-white/10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Documento Legal</label>
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => setContractFile(e.target.files?.[0] || null)}
                      className="bg-white/5 border-white/10"
                    />
                  <p className="text-xs text-muted-foreground mt-2">
                    PDF, DOC o DOCX. Máximo 50MB.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-white/10 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowNewContractModal(false)}
                    disabled={submitting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-[var(--brand-naranja)] text-white hover:bg-[var(--brand-naranja)]/90"
                    disabled={submitting}
                  >
                    {submitting ? 'Creando...' : 'Crear Contrato'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}


