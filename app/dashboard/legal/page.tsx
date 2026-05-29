'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Scale, CheckCircle2, AlertCircle, Plus, Search, Download, Eye } from 'lucide-react';
import Link from 'next/link';

// Mock data for initial development
const mockLegalDocuments = [
  {
    id: '1',
    title: 'Contrato Principal La Patagua',
    category: 'contract',
    type: 'principal',
    status: 'active',
    expiry_date: '2025-12-31',
    sernageomin_req: true,
  },
  {
    id: '2',
    title: 'Resolución SERNAGEOMIN 2024',
    category: 'normativa',
    type: 'regulatory',
    status: 'active',
    issue_date: '2024-01-15',
    sernageomin_req: true,
  },
  {
    id: '3',
    title: 'Política de Cumplimiento SERNAGEOMIN',
    category: 'document',
    type: 'policy',
    status: 'active',
    version: 3,
    sernageomin_req: true,
  },
  {
    id: '4',
    title: 'Contrato Servicios Terceros XYZ',
    category: 'contract',
    type: 'services',
    status: 'active',
    expiry_date: '2025-06-30',
    sernageomin_req: false,
  },
  {
    id: '5',
    title: 'Permiso de Explotación Minera',
    category: 'permit',
    type: 'permit',
    status: 'active',
    expiry_date: '2026-03-15',
    sernageomin_req: true,
  },
];

const mockComplianceItems = [
  { requirement: 'Cumplimiento SERNAGEOMIN Resolución 2024', status: 'compliant', percentage: 100 },
  { requirement: 'Documentación de Permisos Vigentes', status: 'compliant', percentage: 100 },
  { requirement: 'Contratos Actualizados', status: 'compliant', percentage: 95 },
  { requirement: 'Políticas Documentadas', status: 'at_risk', percentage: 85 },
  { requirement: 'Auditorías Completadas', status: 'pending', percentage: 60 },
];

export default function LegalPage() {
  const [activeTab, setActiveTab] = useState('documents');
  const [searchQuery, setSearchQuery] = useState('');

  const legalDocs = mockLegalDocuments.filter(
    doc =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-secondary/10 text-secondary">Activo</Badge>;
      case 'expiring':
        return <Badge className="bg-primary/10 text-primary">Próx. Vencer</Badge>;
      case 'expired':
        return <Badge className="bg-destructive/10 text-destructive">Vencido</Badge>;
      case 'pending':
        return <Badge className="bg-muted">Pendiente</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getComplianceColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'bg-secondary/10 text-secondary';
      case 'at_risk':
        return 'bg-primary/10 text-primary';
      case 'pending':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Módulo Legal & Compliance</h1>
          <p className="text-muted-foreground mt-2">
            Gestión de documentos legales, contratos y cumplimiento normativo SERNAGEOMIN
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nuevo Documento
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Documentos Legales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{legalDocs.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Documentos registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Contratos Vigentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {legalDocs.filter(d => d.category === 'contract').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Contratos activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Normativas SERNAGEOMIN
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {legalDocs.filter(d => d.sernageomin_req).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Requerimientos aplicables</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cumplimiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">92%</div>
            <p className="text-xs text-muted-foreground mt-1">Compliance global</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Documentos</span>
          </TabsTrigger>
          <TabsTrigger value="contracts" className="flex items-center gap-2">
            <Scale className="w-4 h-4" />
            <span className="hidden sm:inline">Contratos</span>
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span className="hidden sm:inline">Cumplimiento</span>
          </TabsTrigger>
          <TabsTrigger value="normativas" className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Normativas</span>
          </TabsTrigger>
        </TabsList>

        {/* Documentos Legales */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Documentos Legales</CardTitle>
                  <CardDescription>Contratos, resoluciones, permisos y documentación</CardDescription>
                </div>
                <div className="flex-1 max-w-sm ml-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar documentos..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {legalDocs.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.category} • {doc.type}
                          {doc.sernageomin_req && ' • SERNAGEOMIN'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getStatusBadge(doc.status)}
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contratos */}
        <TabsContent value="contracts">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Contratos</CardTitle>
              <CardDescription>Control de contratos proveedores, servicios y subcontratistas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {legalDocs.filter(d => d.category === 'contract').map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Scale className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Vence: {doc.expiry_date}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(doc.status)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cumplimiento */}
        <TabsContent value="compliance">
          <Card>
            <CardHeader>
              <CardTitle>Matriz de Cumplimiento</CardTitle>
              <CardDescription>Seguimiento de cumplimiento con normativas SERNAGEOMIN</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockComplianceItems.map((item, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.requirement}</span>
                      <Badge className={getComplianceColor(item.status)}>
                        {item.percentage}%
                      </Badge>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-secondary h-2 rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Normativas */}
        <TabsContent value="normativas">
          <Card>
            <CardHeader>
              <CardTitle>Normativas SERNAGEOMIN</CardTitle>
              <CardDescription>Requisitos regulatorios y normativas aplicables</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {legalDocs.filter(d => d.sernageomin_req).map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border border-primary/20 rounded-lg bg-primary/5">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium text-sm">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">Requerimiento SERNAGEOMIN</p>
                      </div>
                    </div>
                    {getStatusBadge(doc.status)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
