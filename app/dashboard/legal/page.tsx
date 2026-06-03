'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Scale, CheckCircle2, AlertCircle, Plus, Search, Download, Eye } from 'lucide-react';
import { ContractsTracker } from '@/components/legal/contracts-tracker';

export default function LegalPage() {
  const [activeTab, setActiveTab] = useState('documents');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock legal documents
  const mockLegalDocuments = [
    {
      id: '1',
      title: 'Política Integrada de Seguridad, Salud y Ambiente',
      description: 'Política corporativa que establece los principios de seguridad',
      category: 'policy',
      type: 'Policy',
      status: 'active',
      version: '3.2',
    },
    {
      id: '2',
      title: 'Procedimiento de Investigación de Incidentes',
      description: 'Procedimiento estándar para investigación de incidentes de seguridad',
      category: 'procedure',
      type: 'Procedure',
      status: 'active',
      version: '2.1',
    },
    {
      id: '3',
      title: 'Protocolo de Bioseguridad y COVID-19',
      description: 'Medidas y protocolos para prevención de enfermedades',
      category: 'protocol',
      type: 'Protocol',
      status: 'active',
      version: '1.8',
    },
    {
      id: '4',
      title: 'Estándar de Seguridad en Trabajos en Altura',
      description: 'Requisitos de seguridad para trabajos en altura',
      category: 'standard',
      type: 'Standard',
      status: 'active',
      version: '2.5',
    },
    {
      id: '5',
      title: 'Plan de Respuesta a Emergencias y Evacuación',
      description: 'Plan integral de respuesta a emergencias en faena minera',
      category: 'plan',
      type: 'Plan',
      status: 'active',
      version: '4.0',
    },
  ];

  const mockComplianceItems = [
    { requirement: 'Cumplimiento SERNAGEOMIN Resolución 2024', status: 'compliant', percentage: 100 },
    { requirement: 'Documentación de Permisos Vigentes', status: 'compliant', percentage: 100 },
    { requirement: 'Contratos Actualizados', status: 'compliant', percentage: 95 },
    { requirement: 'Políticas Documentadas', status: 'at_risk', percentage: 85 },
  ];

  const legalDocs = mockLegalDocuments.filter(
    doc =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
      case 'vigente':
        return <Badge className="bg-secondary/10 text-secondary">Activo</Badge>;
      case 'pending':
      case 'pendiente':
        return <Badge className="bg-primary/10 text-primary">Pendiente</Badge>;
      case 'expired':
      case 'vencido':
        return <Badge className="bg-destructive/10 text-destructive">Vencido</Badge>;
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
      <div>
        <h1 className="text-3xl font-bold text-foreground">Módulo Legal & Compliance</h1>
        <p className="text-muted-foreground mt-2">
          Gestión de documentos legales, contratos y cumplimiento normativo SERNAGEOMIN
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Documentos Legales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{legalDocs.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Registrados en el sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Contratos Vigentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">5</div>
            <p className="text-xs text-muted-foreground mt-1">Activos y en seguimiento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Normativas SERNAGEOMIN
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">4</div>
            <p className="text-xs text-muted-foreground mt-1">Regulaciones aplicables</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cumplimiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">96%</div>
            <p className="text-xs text-muted-foreground mt-1">Compliance global</p>
          </CardContent>
        </Card>
      </div>

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

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Documentos Legales</CardTitle>
                  <CardDescription>
                    Políticas, procedimientos, protocolos y planes documentados
                  </CardDescription>
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
                          {doc.type} • v{doc.version}
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

        <TabsContent value="contracts">
          <ContractsTracker />
        </TabsContent>

        <TabsContent value="compliance">
          <Card>
            <CardHeader>
              <CardTitle>Matriz de Cumplimiento</CardTitle>
              <CardDescription>
                Seguimiento de cumplimiento con normativas SERNAGEOMIN
              </CardDescription>
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

        <TabsContent value="normativas">
          <Card>
            <CardHeader>
              <CardTitle>Normativas SERNAGEOMIN</CardTitle>
              <CardDescription>
                Requisitos regulatorios minería, permisos ambientales y normativas aplicables
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border border-primary/20 rounded-lg bg-primary/5">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">Resolución 1999 SERNAGEOMIN</p>
                      <p className="text-xs text-muted-foreground">Seguridad minera - Vigente</p>
                    </div>
                  </div>
                  {getStatusBadge('active')}
                </div>
                <div className="flex items-center justify-between p-3 border border-primary/20 rounded-lg bg-primary/5">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">Auditoría Anual SERNAGEOMIN</p>
                      <p className="text-xs text-muted-foreground">Inspección - Vigente</p>
                    </div>
                  </div>
                  {getStatusBadge('active')}
                </div>
                <div className="flex items-center justify-between p-3 border border-primary/20 rounded-lg bg-primary/5">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">Evaluación Impacto Ambiental</p>
                      <p className="text-xs text-muted-foreground">Ambiental - Vigente</p>
                    </div>
                  </div>
                  {getStatusBadge('active')}
                </div>
                <div className="flex items-center justify-between p-3 border border-primary/20 rounded-lg bg-primary/5">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">Certificación ISO 45001</p>
                      <p className="text-xs text-muted-foreground">Seguridad - Vigente</p>
                    </div>
                  </div>
                  {getStatusBadge('active')}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
