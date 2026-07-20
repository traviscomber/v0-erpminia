'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { toast } from 'sonner';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle, Clock, Download, Eye, FileText, Plus, RefreshCw, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) return null;
  return payload;
};

const initialFormState = {
  title: '',
  contractNumber: '',
  description: '',
  contractType: 'Principal',
  status: 'En revisión',
  startDate: '',
  endDate: '',
  reviewDueDate: '',
  contractValue: '',
  currency: 'CLP',
  eeccId: '',
  contractorName: '',
  responsiblePerson: '',
  responsibleArea: 'Legal',
};

type ContractRow = {
  id: string;
  title: string;
  contract_number: string;
  description: string | null;
  contract_type: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  contract_value: number | null;
  currency: string | null;
  contractor_name: string | null;
  responsible_person: string | null;
  responsible_area: string | null;
  file_url: string | null;
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

  const { data: eeccData } = useSWR('/api/eecc?active=true', fetcher, {
    revalidateOnFocus: false,
  });
  const eeccOptions = (eeccData?.eecc || []) as Array<{ id: string; name: string }>;

  const contracts = (data?.contracts || []) as ContractRow[];

  const filteredContracts = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return contracts.filter((contract) => {
      if (!searchLower) return true;
      return (
        contract.title.toLowerCase().includes(searchLower) ||
        contract.contract_number.toLowerCase().includes(searchLower) ||
        (contract.description || '').toLowerCase().includes(searchLower) ||
        (contract.responsible_person || '').toLowerCase().includes(searchLower) ||
        (contract.contractor_name || '').toLowerCase().includes(searchLower)
      );
    });
  }, [contracts, searchTerm]);

  const stats = {
    total: contracts.length,
    vigentes: contracts.filter((contract) => contract.status === 'Vigente').length,
    porVencer: contracts.filter((contract) => contract.status === 'Por Vencer').length,
    enRevision: contracts.filter((contract) => contract.status === 'En revisión').length,
    vencidos: contracts.filter((contract) => contract.status === 'Vencido').length,
    conArchivo: contracts.filter((contract) => Boolean(contract.file_url)).length,
  };
  const sinArchivo = stats.total - stats.conArchivo;

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
      if (contractFile) payload.append('file', contractFile);

      const response = await fetch('/api/contracts', {
        method: 'POST',
        body: payload,
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error((errorPayload as { error?: string }).error || 'No se pudo crear el contrato');
      }

      toast.success('Contrato creado correctamente');
      resetForm();
      setShowNewContractModal(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear contrato');
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
      case 'En revisión':
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
        return <CheckCircle className="h-3 w-3" />;
      case 'Por Vencer':
      case 'En revisión':
        return <Clock className="h-3 w-3" />;
      case 'Vencido':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'En revisión':
        return 'En revisión';
      default:
        return status;
    }
  };

  const formatCurrency = (value: number | null, currency: string | null) => {
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
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-[var(--brand-naranja)]" />
          <p className="text-muted-foreground">Cargando contratos...</p>
        </div>
      </div>
  );
}
  if (error) {
    return (
      <div className="py-12 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-[var(--brand-rojo)]" />
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
              <ArrowLeft className="mr-1 h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--brand-naranja)]/20">
                <FileText className="h-6 w-6 text-[var(--brand-naranja)]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Gestión de contratos</h1>
                <p className="text-sm text-muted-foreground">Contratos principales, subcontratos y respaldo legal.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => mutate()}>
            <RefreshCw className="mr-1 h-4 w-4" />
            Actualizar
          </Button>
          <Button className="bg-[var(--brand-naranja)] text-white hover:bg-[var(--brand-naranja)]/90" onClick={() => setShowNewContractModal(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Nuevo contrato
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link href="/dashboard/documentos-gestion/eecc">
            Empresas contratistas
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link href="/dashboard/legal/documentos">
            Documentos legales
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link href="/dashboard/mantenimiento/documentos">
            Documentos de mantenimiento
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link href="/dashboard/documentos-gestion/reportes">
            Reportes
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total contratos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--brand-verde)]">Vigentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-verde)]">{stats.vigentes}</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--brand-gold)]">Por vencer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-gold)]">{stats.porVencer}</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--secondary)]">En revisión</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--secondary)]">{stats.enRevision}</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--brand-rojo)]">Vencidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-rojo)]">{stats.vencidos}</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sin archivo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sinArchivo}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Buscar contratos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título, número, contratista o responsable..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-white/10 bg-white/5 pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle>{filteredContracts.length} contratos encontrados</CardTitle>
          <CardDescription>Lista de contratos registrados en el sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredContracts.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <FileText className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>No hay contratos que coincidan con tu búsqueda</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Contrato</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Numero</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipo</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Valor</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Vigencia</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Responsable</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContracts.map((contract) => (
                    <tr key={contract.id} className="border-b border-white/10 transition-colors hover:bg-white/5">
                      <td className="px-4 py-3">
                        <div className="font-medium">{contract.title}</div>
                        <div className="line-clamp-1 text-xs text-muted-foreground">{contract.description}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {contract.contractor_name || 'Sin contratista'}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{contract.contract_number}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {contract.contract_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`flex w-fit items-center gap-1 ${getStatusColor(contract.status)}`}>
                          {getStatusIcon(contract.status)}
                          {getStatusLabel(contract.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-medium">{formatCurrency(contract.contract_value, contract.currency)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        <div>{contract.start_date ? new Date(contract.start_date).toLocaleDateString('es-CL') : '-'}</div>
                        <div>
                          {'Hasta '}
                          {contract.end_date ? new Date(contract.end_date).toLocaleDateString('es-CL') : '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">{contract.responsible_person || '-'}</div>
                        <div className="text-xs text-muted-foreground">{contract.responsible_area || '-'}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {contract.file_url ? (
                            <Button variant="ghost" size="sm" asChild title="Ver archivo">
                              <a href={contract.file_url} target="_blank" rel="noopener noreferrer">
                                <Eye className="h-4 w-4" />
                              </a>
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" disabled title="Sin archivo">
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {contract.file_url ? (
                            <Button variant="ghost" size="sm" asChild title="Descargar">
                              <a href={contract.file_url} target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" disabled title="Sin archivo">
                              <Download className="h-4 w-4" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="max-h-[90vh] w-full max-w-4xl overflow-y-auto border-white/10 bg-background">
            <CardHeader className="sticky top-0 flex flex-row items-center justify-between space-y-0 border-b border-white/10 bg-background">
              <div>
                <CardTitle>Crear nuevo contrato</CardTitle>
                <CardDescription>Registra un nuevo contrato con respaldo legal.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowNewContractModal(false)}>
                x
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              <form className="space-y-5" onSubmit={handleCreateContract}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Título del contrato *</label>
                    <Input
                      value={formState.title}
                      onChange={(e) => updateField('title', e.target.value)}
                      placeholder="Ej: Contrato mantenimiento planta 2026"
                      className="border-white/10 bg-white/5"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Numero de contrato *</label>
                    <Input
                      value={formState.contractNumber}
                      onChange={(e) => updateField('contractNumber', e.target.value)}
                      placeholder="Ej: CNT-2026-001"
                      className="border-white/10 bg-white/5"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Descripcion</label>
                  <Input
                    value={formState.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="Breve descripción del contrato"
                    className="border-white/10 bg-white/5"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Tipo de contrato *</label>
                    <select
                      value={formState.contractType}
                      onChange={(e) => updateField('contractType', e.target.value)}
                      className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
                    >
                      <option>Principal</option>
                      <option>Subcontrato</option>
                      <option>Enmienda</option>
                      <option value="Adenda">Adenda</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Estado *</label>
                    <select
                      value={formState.status}
                      onChange={(e) => updateField('status', e.target.value)}
                      className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
                    >
                      <option>En revisión</option>
                      <option>Vigente</option>
                      <option>Por Vencer</option>
                      <option>Vencido</option>
                      <option>Borrador</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Fecha de inicio</label>
                    <Input type="date" value={formState.startDate} onChange={(e) => updateField('startDate', e.target.value)} className="border-white/10 bg-white/5" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Fecha de termino</label>
                    <Input type="date" value={formState.endDate} onChange={(e) => updateField('endDate', e.target.value)} className="border-white/10 bg-white/5" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Próxima revisión legal</label>
                    <Input type="date" value={formState.reviewDueDate} onChange={(e) => updateField('reviewDueDate', e.target.value)} className="border-white/10 bg-white/5" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Valor del contrato</label>
                    <Input type="number" value={formState.contractValue} onChange={(e) => updateField('contractValue', e.target.value)} className="border-white/10 bg-white/5" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Moneda</label>
                    <Input value={formState.currency} onChange={(e) => updateField('currency', e.target.value)} className="border-white/10 bg-white/5" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">contratista</label>
                    <Select
                      value={formState.eeccId}
                      onValueChange={(value) => {
                        const selected = eeccOptions.find((option) => option.id === value);
                        setFormState((current) => ({
                          ...current,
                          eeccId: value,
                          contractorName: selected?.name || '',
                        }));
                      }}
                    >
                      <SelectTrigger className="border-white/10 bg-white/5">
                        <SelectValue placeholder="Selecciona una empresa contratista" />
                      </SelectTrigger>
                      <SelectContent>
                        {eeccOptions.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            No hay Empresas contratistas registradas
                          </div>
                        ) : (
                          eeccOptions.map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                              {option.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Link
                      href="/dashboard/documentos-gestion/eecc"
                      className="mt-1 inline-block text-xs text-muted-foreground hover:text-foreground"
                    >
                      Gestionar empresas contratistas
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Responsable</label>
                    <Input value={formState.responsiblePerson} onChange={(e) => updateField('responsiblePerson', e.target.value)} placeholder="Nombre del responsable" className="border-white/10 bg-white/5" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Área responsable</label>
                    <Input value={formState.responsibleArea} onChange={(e) => updateField('responsibleArea', e.target.value)} className="border-white/10 bg-white/5" />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowNewContractModal(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={submitting} className="bg-[var(--brand-naranja)] text-white hover:bg-[var(--brand-naranja)]/90">
                    {submitting ? 'Guardando...' : 'Crear contrato'}
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

