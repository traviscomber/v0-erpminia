'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, FileText, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import CarpetaArranqueForm from '@/components/prevention/carpeta-arranque-form';
import CarpetaArranqueList from '@/components/prevention/carpeta-arranque-list';

export default function CarpetaArranquePage() {
  const [showNewForm, setShowNewForm] = useState(false);
  const [activeTab, setActiveTab] = useState('mis-carpetas');

  const stats = {
    total: 8,
    pendientes: 3,
    aprobadas: 4,
    rechazadas: 1,
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Carpeta de Arranque</h1>
        <p className="text-muted-foreground">
          Sistema de validación de documentos para empresas contratistas
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Carpetas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pendientes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Aprobadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.aprobadas}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              Rechazadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rechazadas}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="mis-carpetas">Mis Carpetas</TabsTrigger>
          <TabsTrigger value="en-revision">En Revisión</TabsTrigger>
          <TabsTrigger value="documentos-std">Documentos Estándar</TabsTrigger>
        </TabsList>

        {/* Tab: Mis Carpetas */}
        <TabsContent value="mis-carpetas" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Mis Carpetas de Arranque</h2>
            <Button
              onClick={() => setShowNewForm(!showNewForm)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Nueva Carpeta
            </Button>
          </div>

          {showNewForm && (
            <Card>
              <CardHeader>
                <CardTitle>Crear Nueva Carpeta de Arranque</CardTitle>
                <CardDescription>
                  Selecciona tu empresa y comienza a cargar los documentos requeridos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CarpetaArranqueForm onSuccess={() => {
                  setShowNewForm(false);
                }} />
              </CardContent>
            </Card>
          )}

          <CarpetaArranqueList status="todas" />
        </TabsContent>

        {/* Tab: En Revisión */}
        <TabsContent value="en-revision" className="space-y-4">
          <h2 className="text-lg font-semibold">Carpetas en Revisión</h2>
          <p className="text-sm text-muted-foreground">
            Documentos pendientes de validación por los revisores asignados
          </p>
          <CarpetaArranqueList status="en-revision" />
        </TabsContent>

        {/* Tab: Documentos Estándar */}
        <TabsContent value="documentos-std" className="space-y-4">
          <h2 className="text-lg font-semibold">Documentos Requeridos</h2>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">19 Documentos Obligatorios</CardTitle>
              <CardDescription>
                Estos son los documentos que debe cargar toda empresa contratista
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  'Certificado de afiliación y cotización a Organismo Administrador',
                  'Certificado de Accidentabilidad (últimos 2 años)',
                  'Reglamento interno de orden, higiene y seguridad',
                  'Copia IRL de todos sus colaboradores',
                  'Contratos de trabajos de su personal',
                  'Registro de entrega de EPP',
                  'Registro interno de la empresa contratista',
                  'Recepción firmada del Sistema de Gestión y Seguridad en el Trabajo',
                  'Exámenes pre-ocupacionales (últimos 3 años)',
                  'Exámenes ocupacionales (agentes como ruido, sílice)',
                  'Documentación de trabajadores extranjeros',
                  'Procedimientos de trabajos actualizados con NRCT',
                  'Procedimiento en caso de accidente',
                  'Política de empresa contratista en control de riesgos',
                  'Copia carnet de identidad de todos los colaboradores',
                  'Licencias de conducción vigentes',
                  'Recepción de conductores por reglamento interno',
                  'Programa de supervisión a cargo personal',
                  'Matriz de Identificación de Peligros (MIPER)',
                ].map((doc, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 border rounded">
                    <FileText className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{idx + 1}. {doc}</span>
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
