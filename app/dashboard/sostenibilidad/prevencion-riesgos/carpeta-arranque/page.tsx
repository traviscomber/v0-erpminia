'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, CheckCircle2, AlertCircle, Clock, CircleDot } from 'lucide-react';
import CarpetaArranqueForm from '@/components/prevention/carpeta-arranque-form';
import CarpetaArranqueList from '@/components/prevention/carpeta-arranque-list';

interface Stats {
  total: number;
  pendientes: number;
  en_revision: number;
  aprobadas: number;
  rechazadas: number;
}

export default function CarpetaArranquePage() {
  const [showNewForm, setShowNewForm] = useState(false);
  const [activeTab, setActiveTab] = useState('mis-carpetas');
  const [stats, setStats] = useState<Stats>({ total: 0, pendientes: 0, en_revision: 0, aprobadas: 0, rechazadas: 0 });
  const [listKey, setListKey] = useState(0);

  const fetchStats = useCallback(async () => {
    const res = await fetch('/api/carpeta-arranque', { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    const carpetas: Array<{ status: string }> = data.carpetas ?? [];
    setStats({
      total: carpetas.length,
      pendientes: carpetas.filter(c => c.status === 'pendiente').length,
      en_revision: carpetas.filter(c => ['en_revision_l1', 'en_revision_l2'].includes(c.status)).length,
      aprobadas: carpetas.filter(c => c.status === 'aprobado').length,
      rechazadas: carpetas.filter(c => c.status === 'rechazado').length,
    });
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, listKey]);

  const handleFormSuccess = () => {
    setShowNewForm(false);
    setListKey(k => k + 1);
    setActiveTab('mis-carpetas');
  };

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="mb-2 text-4xl font-bold text-foreground">Carpeta de Arranque</h1>
          <p className="max-w-2xl text-muted-foreground">
            Sistema de validación de documentos para empresas contratistas (EECC).
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline">Total {stats.total}</Badge>
            <Badge variant="outline">Pendientes {stats.pendientes}</Badge>
            <Badge variant="outline">En revisión {stats.en_revision}</Badge>
            <Badge className="bg-secondary/10 text-secondary border-secondary/30">
              Aprobadas {stats.aprobadas}
            </Badge>
          </div>
        </div>
        <Button onClick={() => setShowNewForm(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          Nueva carpeta
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="rounded-xl shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats.pendientes}</div>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CircleDot className="h-4 w-4 text-blue-500" />
              En Revision
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats.en_revision}</div>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Aprobadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.aprobadas}</div>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              Rechazadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.rechazadas}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 rounded-xl bg-muted/60 p-1">
          <TabsTrigger value="mis-carpetas" className="font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Mis Carpetas
          </TabsTrigger>
          <TabsTrigger value="en-revision" className="gap-2 font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            En Revision
            {stats.en_revision > 0 && (
              <span className="rounded-full bg-blue-500 text-white text-xs font-bold px-1.5 py-0.5 leading-none">
                {stats.en_revision}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="documentos-std" className="font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Documentos Requeridos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mis-carpetas" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-foreground">Carpetas de Arranque</h2>
            <Button onClick={() => setShowNewForm(!showNewForm)} className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Carpeta
            </Button>
          </div>
          {showNewForm && (
            <Card className="rounded-xl shadow-none">
              <CardHeader>
                <CardTitle>Crear Nueva Carpeta de Arranque</CardTitle>
                <CardDescription>
                  Ingresa los datos de la empresa contratista y carga los 19 documentos requeridos.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CarpetaArranqueForm onSuccess={handleFormSuccess} />
              </CardContent>
            </Card>
          )}
          <CarpetaArranqueList key={listKey} status="todas" />
        </TabsContent>

        <TabsContent value="en-revision" className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Carpetas en Revision</h2>
            <p className="text-sm text-muted-foreground">
              Documentos pendientes de validacion por los revisores asignados.
            </p>
          </div>
          <CarpetaArranqueList key={"rev-" + listKey} status="en-revision" />
        </TabsContent>

        <TabsContent value="documentos-std" className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Documentos Requeridos por la EECC</h2>
          <Card className="rounded-xl shadow-none">
            <CardHeader>
              <CardTitle className="text-base">19 Documentos Obligatorios</CardTitle>
              <CardDescription>
                Toda empresa contratista debe cargar estos documentos en su carpeta de arranque.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  'Certificado de afiliacion y cotizacion a Organismo Administrador',
                  'Certificado de Accidentabilidad (ultimos 2 anos)',
                  'Reglamento interno de orden, higiene y seguridad',
                  'Copia IRL de todos sus colaboradores',
                  'Contratos de trabajos de su personal',
                  'Registro de entrega de EPP',
                  'Registro interno de la empresa contratista',
                  'Recepcion firmada del Sistema de Gestion y Seguridad en el Trabajo',
                  'Examenes pre-ocupacionales (ultimos 3 anos)',
                  'Examenes ocupacionales (agentes como ruido, silice)',
                  'Documentacion de trabajadores extranjeros',
                  'Procedimientos de trabajos actualizados con NRCT',
                  'Procedimiento en caso de accidente',
                  'Politica de empresa contratista en control de riesgos',
                  'Copia carnet de identidad de todos los colaboradores',
                  'Licencias de conduccion vigentes',
                  'Recepcion de conductores por reglamento interno',
                  'Programa de supervision a cargo personal',
                  'Matriz de Identificacion de Peligros (MIPER)',
                ].map((doc, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 border rounded-md">
                    <FileText className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
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
