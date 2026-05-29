'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Scale, CheckCircle2, AlertCircle, Plus } from 'lucide-react';

export default function LegalPage() {
  const [activeTab, setActiveTab] = useState('documents');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Módulo Legal</h1>
          <p className="text-muted-foreground mt-2">
            Gestión de documentos legales, contratos y cumplimiento normativo
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
            <div className="text-3xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">Sistema (desarrollo)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Contratos Vigentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">Sistema (desarrollo)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Normativas SERNAGEOMIN
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">Sistema (desarrollo)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cumplimiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0%</div>
            <p className="text-xs text-muted-foreground mt-1">Sistema (desarrollo)</p>
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
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Documentos Legales</CardTitle>
              <CardDescription>
                Contratos, resoluciones, permisos y otros documentos legales
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  No hay documentos aún. Sistema en desarrollo.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contratos */}
        <TabsContent value="contracts">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Contratos</CardTitle>
              <CardDescription>
                Control de contratos proveedores, servicios y subcontratistas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Scale className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  No hay contratos aún. Sistema en desarrollo.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cumplimiento */}
        <TabsContent value="compliance">
          <Card>
            <CardHeader>
              <CardTitle>Matriz de Cumplimiento</CardTitle>
              <CardDescription>
                Seguimiento de cumplimiento con normativas SERNAGEOMIN
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  No hay datos aún. Sistema en desarrollo.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Normativas */}
        <TabsContent value="normativas">
          <Card>
            <CardHeader>
              <CardTitle>Normativas SERNAGEOMIN</CardTitle>
              <CardDescription>
                Requisitos regulatorios y normativas aplicables
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  No hay normativas registradas aún. Sistema en desarrollo.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
