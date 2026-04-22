'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Download, Eye, Trash2, FileText, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface Contract {
  id: string;
  number: string;
  contractor: string;
  title: string;
  amount: number;
  startDate: string;
  endDate: string;
  status: 'activo' | 'pendiente' | 'vencido' | 'suspendido';
  type: 'principal' | 'subcontrato';
  approvalStatus: 'aprobado' | 'pendiente' | 'rechazado';
  documents: number;
  lastModified: string;
}

const mockContracts: Contract[] = [
  {
    id: '1',
    number: 'CONT-2024-001',
    contractor: 'Minería Chile SpA',
    title: 'Servicios de Perforación y Tronadura',
    amount: 2500000,
    startDate: '2024-01-15',
    endDate: '2025-01-14',
    status: 'activo',
    type: 'principal',
    approvalStatus: 'aprobado',
    documents: 8,
    lastModified: '2024-04-20',
  },
  {
    id: '2',
    number: 'SUBCONT-2024-001',
    contractor: 'Transporte y Logística SA',
    title: 'Transporte de Material',
    amount: 450000,
    startDate: '2024-02-01',
    endDate: '2024-12-31',
    status: 'activo',
    type: 'subcontrato',
    approvalStatus: 'aprobado',
    documents: 5,
    lastModified: '2024-04-18',
  },
  {
    id: '3',
    number: 'CONT-2024-002',
    contractor: 'Servicios de Mantenimiento Integral',
    title: 'Mantenimiento de Equipos Mineros',
    amount: 1800000,
    startDate: '2024-03-01',
    endDate: '2024-12-31',
    status: 'activo',
    type: 'principal',
    approvalStatus: 'pendiente',
    documents: 12,
    lastModified: '2024-04-19',
  },
  {
    id: '4',
    number: 'SUBCONT-2024-002',
    contractor: 'Análisis Químico Minero',
    title: 'Análisis de Muestras de Mineral',
    amount: 280000,
    startDate: '2024-04-01',
    endDate: '2024-09-30',
    status: 'pendiente',
    type: 'subcontrato',
    approvalStatus: 'pendiente',
    documents: 3,
    lastModified: '2024-04-21',
  },
  {
    id: '5',
    number: 'CONT-2023-015',
    contractor: 'Consultoría Ambiental Ltd',
    title: 'Estudios de Impacto Ambiental',
    amount: 950000,
    startDate: '2023-06-01',
    endDate: '2024-03-31',
    status: 'vencido',
    type: 'principal',
    approvalStatus: 'aprobado',
    documents: 15,
    lastModified: '2024-03-30',
  },
];

const statusConfig = {
  activo: { color: 'bg-green-500/10 text-green-700', label: 'Activo' },
  pendiente: { color: 'bg-yellow-500/10 text-yellow-700', label: 'Pendiente' },
  vencido: { color: 'bg-red-500/10 text-red-700', label: 'Vencido' },
  suspendido: { color: 'bg-gray-500/10 text-gray-700', label: 'Suspendido' },
};

const approvalConfig = {
  aprobado: { icon: CheckCircle2, color: 'text-green-600', label: 'Aprobado' },
  pendiente: { icon: AlertCircle, color: 'text-yellow-600', label: 'Pendiente' },
  rechazado: { icon: AlertCircle, color: 'text-red-600', label: 'Rechazado' },
};

export default function ContratosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [contractType, setContractType] = useState<'all' | 'principal' | 'subcontrato'>('all');
  const [activeTab, setActiveTab] = useState('activos');

  const filteredContracts = mockContracts.filter((contract) => {
    const matchesSearch =
      contract.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.contractor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.title.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = contractType === 'all' || contract.type === contractType;

    const matchesStatus =
      activeTab === 'activos'
        ? contract.status === 'activo'
        : activeTab === 'vencidos'
          ? contract.status === 'vencido'
          : activeTab === 'pendientes'
            ? contract.status === 'pendiente'
            : true;

    return matchesSearch && matchesType && matchesStatus;
  });

  const stats = {
    activos: mockContracts.filter((c) => c.status === 'activo').length,
    pendientes: mockContracts.filter((c) => c.status === 'pendiente').length,
    vencidos: mockContracts.filter((c) => c.status === 'vencido').length,
    pendienteAprobacion: mockContracts.filter((c) => c.approvalStatus === 'pendiente').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Contratos & Subcontratos</h1>
          <p className="text-muted-foreground mt-1">Gestiona contratos principales y subcontratos con contratistas</p>
        </div>
        <Button className="gap-2 bg-[var(--brand-naranja)] hover:bg-[var(--brand-naranja)]/90">
          <Plus className="h-4 w-4" />
          Nuevo Contrato
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.activos}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{stats.pendientes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Vencidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.vencidos}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pendiente Aprobación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[var(--brand-naranja)]">{stats.pendienteAprobacion}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Busca por número, contratista o título..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge
              variant={contractType === 'all' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setContractType('all')}
            >
              Todos
            </Badge>
            <Badge
              variant={contractType === 'principal' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setContractType('principal')}
            >
              Principales
            </Badge>
            <Badge
              variant={contractType === 'subcontrato' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setContractType('subcontrato')}
            >
              Subcontratos
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Contracts List */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="activos">Activos ({stats.activos})</TabsTrigger>
          <TabsTrigger value="pendientes">Pendientes ({stats.pendientes})</TabsTrigger>
          <TabsTrigger value="vencidos">Vencidos ({stats.vencidos})</TabsTrigger>
          <TabsTrigger value="todos">Todos</TabsTrigger>
        </TabsList>

        <TabsContent value="activos" className="space-y-4">
          {filteredContracts.length > 0 ? (
            filteredContracts.map((contract) => (
              <ContractCard key={contract.id} contract={contract} />
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No hay contratos activos
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="pendientes" className="space-y-4">
          {filteredContracts.length > 0 ? (
            filteredContracts.map((contract) => (
              <ContractCard key={contract.id} contract={contract} />
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No hay contratos pendientes
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="vencidos" className="space-y-4">
          {filteredContracts.length > 0 ? (
            filteredContracts.map((contract) => (
              <ContractCard key={contract.id} contract={contract} />
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No hay contratos vencidos
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="todos" className="space-y-4">
          {filteredContracts.length > 0 ? (
            filteredContracts.map((contract) => (
              <ContractCard key={contract.id} contract={contract} />
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No se encontraron contratos
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ContractCard({ contract }: { contract: Contract }) {
  const statusConfig = {
    activo: { color: 'bg-green-500/10 text-green-700', label: 'Activo' },
    pendiente: { color: 'bg-yellow-500/10 text-yellow-700', label: 'Pendiente' },
    vencido: { color: 'bg-red-500/10 text-red-700', label: 'Vencido' },
    suspendido: { color: 'bg-gray-500/10 text-gray-700', label: 'Suspendido' },
  };

  const ApprovalIcon = approvalConfig[contract.approvalStatus].icon;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="font-mono text-sm font-semibold">{contract.number}</span>
              <Badge variant="outline">{contract.type === 'principal' ? 'Principal' : 'Subcontrato'}</Badge>
            </div>
            <CardTitle>{contract.title}</CardTitle>
            <CardDescription className="mt-1">{contract.contractor}</CardDescription>
          </div>
          <div className="text-right">
            <Badge className={statusConfig[contract.status].color}>{statusConfig[contract.status].label}</Badge>
            <div className="mt-2 flex items-center justify-end gap-1">
              <ApprovalIcon
                className={`h-4 w-4 ${approvalConfig[contract.approvalStatus].color}`}
              />
              <span className="text-xs text-muted-foreground">{approvalConfig[contract.approvalStatus].label}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-xs text-muted-foreground">Monto</p>
            <p className="font-semibold">${(contract.amount / 1000000).toFixed(1)}M</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Inicio</p>
            <p className="font-semibold text-sm">{new Date(contract.startDate).toLocaleDateString('es-CL')}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Termino</p>
            <p className="font-semibold text-sm">{new Date(contract.endDate).toLocaleDateString('es-CL')}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Documentos</p>
            <p className="font-semibold">{contract.documents} archivos</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Eye className="h-4 w-4" />
            Ver Detalles
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Descargar
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <FileText className="h-4 w-4" />
            Enmiendas
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
