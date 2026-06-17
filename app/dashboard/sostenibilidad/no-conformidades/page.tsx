'use client';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { NonconformanceForm } from '@/components/sostenibilidad/nonconformances/nonconformance-form';
import { NonconformanceCard } from '@/components/sostenibilidad/nonconformances/nonconformance-card';
import { CorrectiveActionModal } from '@/components/sostenibilidad/nonconformances/corrective-action-modal';
import { NonconformanceTable } from '@/components/sostenibilidad/nonconformances/nonconformance-table';

export default function NonconformanceDashboard() {
  const [showForm, setShowForm] = useState(false);
  const [showCAModal, setShowCAModal] = useState(false);
  const [selectedNC, setSelectedNC] = useState<any>(null);
  const severityColors = {
    critical: 'bg-destructive/20 text-destructive',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-blue-100 text-blue-800',
  };

  const { data: ncData, mutate: mutateNCs } = useSWR('/api/sostenibilidad/nonconformances', async (url: string) => {
    const res = await fetch(url);
    return res.ok ? res.json() : null;
  });

  const { data: reportData } = useSWR('/api/sostenibilidad/compliance-report', async (url: string) => {
    const res = await fetch(url);
    return res.ok ? res.json() : null;
  });

  const ncs = Array.isArray(ncData?.nonconformances) ? ncData.nonconformances : [];
  const stats = ncData?.stats || {};
  const report = reportData || {};

  const handleCreateNC = async (formData: any) => {
    try {
      const res = await fetch('/api/sostenibilidad/nonconformances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('No se pudo crear la no conformidad');
      
      await mutateNCs();
      setShowForm(false);
      toast.success('No conformidad creada correctamente');
    } catch (error) {
      toast.error('No se pudo crear la no conformidad');
      throw error;
    }
  };

  const handleCreateCA = async (caData: any) => {
    if (!selectedNC?.id) return;
    try {
      const res = await fetch('/api/sostenibilidad/corrective-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...caData, ncId: selectedNC.id }),
      });
      if (!res.ok) throw new Error('No se pudo crear la acción correctiva');
      
      setShowCAModal(false);
      toast.success('Corrective action created successfully');
    } catch (error) {
      toast.error('No se pudo crear la acción correctiva');
      throw error;
    }
  };

  const openNCs = ncs.filter((nc: any) => nc.status === 'open');
  const inProgressNCs = ncs.filter((nc: any) => nc.status === 'in_progress');
  const overdueCAs = report.overdue_actions || 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Gestion de no conformidades</h1>
          <p className="text-muted-foreground">Seguimiento, control y cierre de no conformidades con acciones correctivas</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-primary">
          {showForm ? 'Cancelar' : 'Reportar NC'}
        </Button>
      </div>

      {showForm && <NonconformanceForm onSubmit={handleCreateNC} />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              No conformidades abiertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.open || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Casos activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              En progreso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{inProgressNCs.length}</p>
            <p className="text-xs text-muted-foreground mt-1">En tratamiento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Cerradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-secondary">{stats.closed || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Resueltas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Cumplimiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{report.compliance_score || 0}%</p>
            <p className="text-xs text-muted-foreground mt-1">Puntaje global</p>
          </CardContent>
        </Card>
      </div>

      {stats.overdue > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">{stats.overdue} no conformidades vencidas</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="open">NC activas ({stats.open || 0})</TabsTrigger>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="severity">Por severidad</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>NC abiertas recientes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {openNCs.slice(0, 5).map((nc: any) => (
                  <NonconformanceCard
                    key={nc.id}
                    nc={nc}
                    onViewDetails={(id) => {
                      const currentNC = ncs.find((item: any) => item.id === id) || nc;
                      setSelectedNC(currentNC);
                    }}
                    onCreateCA={(id) => {
                      const currentNC = ncs.find((item: any) => item.id === id) || nc;
                      setSelectedNC(currentNC);
                      setShowCAModal(true);
                    }}
                    severityColors={severityColors}
                  />
                ))}
                {openNCs.length === 0 && <p className="text-sm text-muted-foreground">No hay no conformidades abiertas</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribucion por severidad</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {['critical', 'high', 'medium', 'low'].map((sev: any) => (
                  <div key={sev} className="flex justify-between text-sm">
                    <span className="capitalize">{sev}</span>
                    <span className="font-medium">{report.by_severity?.[sev] || 0}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

          <TabsContent value="open">
          <Card>
            <CardHeader>
              <CardTitle>No conformidades activas</CardTitle>
              <CardDescription>Casos abiertos y en curso</CardDescription>
            </CardHeader>
            <CardContent>
              <NonconformanceTable
                data={openNCs}
                onRowClick={(nc) => setSelectedNC(nc)}
                onEdit={(nc) => {
                  setSelectedNC(nc);
                  setShowCAModal(true);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>Todas las no conformidades</CardTitle>
              <CardDescription>Historial completo de casos registrados</CardDescription>
            </CardHeader>
            <CardContent>
              <NonconformanceTable
                data={ncs}
                onRowClick={(nc) => setSelectedNC(nc)}
                onEdit={(nc) => {
                  setSelectedNC(nc);
                  setShowCAModal(true);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="severity">
          <div className="grid md:grid-cols-2 gap-4">
            {['critical', 'high', 'medium', 'low'].map((sev: any) => {
              const filtered = ncs.filter((nc: any) => nc.severity === sev && nc.status !== 'closed');
              return (
                <Card key={sev}>
                  <CardHeader>
                    <CardTitle className="text-base capitalize">{sev} severidad</CardTitle>
                    <CardDescription>{filtered.length} activas</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {filtered.slice(0, 5).map((nc: any) => (
                      <button
                        key={nc.id}
                        onClick={() => setSelectedNC(nc)}
                        className="w-full text-left text-sm p-2 rounded hover:bg-muted transition-colors"
                      >
                        <p className="font-medium truncate">{nc.title}</p>
                        <p className="text-xs text-muted-foreground">{nc.nc_number}</p>
                      </button>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {selectedNC && !showCAModal && (
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{selectedNC.title}</CardTitle>
                <CardDescription className="font-mono text-xs mt-1">{selectedNC.nc_number}</CardDescription>
              </div>
                <Button variant="outline" onClick={() => setSelectedNC(null)}>
                Cerrar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Descripcion</p>
                <p className="text-sm">{selectedNC.description}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Causa raíz</p>
                <p className="text-sm">{selectedNC.root_cause || 'No especificada'}</p>
              </div>
            </div>
            <Button onClick={() => setShowCAModal(true)} className="w-full">
              Crear acción correctiva
            </Button>
          </CardContent>
        </Card>
      )}

      {showCAModal && selectedNC && (
        <CorrectiveActionModal
          ncNumber={selectedNC.nc_number}
          onSubmit={handleCreateCA}
          onCancel={() => setShowCAModal(false)}
        />
      )}
    </div>
  );
}
