'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NonconformanceForm } from '@/components/sostenibilidad/nonconformances/nonconformance-form';
import { NonconformanceCard } from '@/components/sostenibilidad/nonconformances/nonconformance-card';
import { CorrectiveActionModal } from '@/components/sostenibilidad/nonconformances/corrective-action-modal';
import { NonconformanceTable } from '@/components/sostenibilidad/nonconformances/nonconformance-table';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || 'Request failed');
  return data;
};

type Nonconformance = {
  id: string;
  nc_number: string;
  title: string;
  description?: string | null;
  category?: string | null;
  severity?: string | null;
  status?: string | null;
  discovered_date?: string | null;
  target_closure_date?: string | null;
  root_cause?: string | null;
};

type CorrectiveAction = {
  id: string;
  nc_id?: string | null;
  ca_number?: string | null;
  action_description?: string | null;
  responsible_person_name?: string | null;
  scheduled_completion_date?: string | null;
  actual_completion_date?: string | null;
  status?: string | null;
  verification_method?: string | null;
};

type ComplianceReport = {
  compliance_score?: number;
  overdue_actions?: number;
  by_severity?: Record<string, number>;
};

export default function NonconformanceDashboard() {
  const [showForm, setShowForm] = useState(false);
  const [showCAModal, setShowCAModal] = useState(false);
  const [selectedNC, setSelectedNC] = useState<Nonconformance | null>(null);

  const { data: ncData, mutate: mutateNCs } = useSWR('/api/sostenibilidad/nonconformances', fetcher);
  const { data: caData, mutate: mutateCAs } = useSWR('/api/sostenibilidad/corrective-actions', fetcher);
  const { data: reportData } = useSWR('/api/sostenibilidad/compliance-report', fetcher);

  const ncs = (ncData?.nonconformances || ncData?.data || []) as Nonconformance[];
  const stats = ncData?.stats || {};
  const correctiveActions = (caData?.corrective_actions || caData?.data || []) as CorrectiveAction[];
  const report = (reportData || {}) as ComplianceReport;

  const handleCreateNC = async (formData: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/sostenibilidad/nonconformances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('No se pudo crear la NC');

      await mutateNCs();
      setShowForm(false);
      toast.success('No conformidad creada correctamente');
    } catch (error) {
      toast.error('No fue posible crear la no conformidad');
      throw error;
    }
  };

  const handleCreateCA = async (caData: Record<string, unknown>) => {
    if (!selectedNC) {
      return;
    }

    try {
      const res = await fetch('/api/sostenibilidad/corrective-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...caData, ncId: selectedNC.id }),
      });
      if (!res.ok) throw new Error('No se pudo crear la acción correctiva');

      await mutateCAs();
      setShowCAModal(false);
      toast.success('Acción correctiva creada correctamente');
    } catch (error) {
      toast.error('No fue posible crear la acción correctiva');
      throw error;
    }
  };

  const openNCs = ncs.filter((nc) => nc.status === 'open');
  const inProgressNCs = ncs.filter((nc) => nc.status === 'in_progress');
  const closedNCs = ncs.filter((nc) => nc.status === 'closed');
  const activeCAs = correctiveActions.filter((action) => action.status !== 'completed' && action.status !== 'verified');
  const overdueCAs = report.overdue_actions || 0;

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="mb-2 text-4xl font-bold text-foreground">Gestión de no conformidades</h1>
          <p className="max-w-2xl text-muted-foreground">
            Seguimiento, cierre y trazabilidad de acciones correctivas con datos reales del módulo.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline">Abiertas {stats.open || 0}</Badge>
            <Badge variant="outline">En progreso {inProgressNCs.length}</Badge>
            <Badge variant="outline">Cerradas {closedNCs.length || stats.closed || 0}</Badge>
            <Badge className="bg-secondary/10 text-secondary border-secondary/30">
              CA activas {activeCAs.length}
            </Badge>
          </div>
        </div>
        <Button onClick={() => setShowForm((value) => !value)} className="bg-primary">
          {showForm ? 'Cancelar' : 'Registrar NC'}
        </Button>
      </div>

      {showForm && <NonconformanceForm onSubmit={handleCreateNC} />}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              Abiertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.open || 0}</p>
            <p className="mt-1 text-xs text-muted-foreground">Casos activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="h-4 w-4" />
              En progreso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{inProgressNCs.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">En atención</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CheckCircle className="h-4 w-4" />
              Cerradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-secondary">{closedNCs.length || stats.closed || 0}</p>
            <p className="mt-1 text-xs text-muted-foreground">Resueltas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{report.compliance_score || 0}%</p>
            <p className="mt-1 text-xs text-muted-foreground">Score general</p>
          </CardContent>
        </Card>
      </div>

      {stats.overdue > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
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
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>NC abiertas recientes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {openNCs.slice(0, 5).map((nc) => (
                  <NonconformanceCard
                    key={nc.id}
                    ncNumber={nc.nc_number}
                    title={nc.title}
                    category={nc.category || 'safety'}
                    severity={nc.severity || 'medium'}
                    status={nc.status || 'open'}
                    discoveredDate={nc.discovered_date || new Date().toISOString()}
                    targetClosureDate={nc.target_closure_date || undefined}
                    onViewDetails={() => setSelectedNC(nc)}
                  />
                ))}
                {openNCs.length === 0 && (
                  <p className="text-sm text-muted-foreground">No hay no conformidades abiertas</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribución por severidad</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {['critical', 'high', 'medium', 'low'].map((sev) => (
                  <div key={sev} className="flex justify-between text-sm">
                    <span className="capitalize">{sev}</span>
                    <span className="font-medium">
                      {report.by_severity?.[sev] || ncs.filter((nc) => nc.severity === sev).length}
                    </span>
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
              <CardDescription>Casos abiertos y en progreso</CardDescription>
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
              <CardDescription>Historial completo de no conformidades</CardDescription>
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
          <div className="grid gap-4 md:grid-cols-2">
            {['critical', 'high', 'medium', 'low'].map((sev) => {
              const filtered = ncs.filter((nc) => nc.severity === sev && nc.status !== 'closed');
              return (
                <Card key={sev}>
                  <CardHeader>
                    <CardTitle className="text-base capitalize">Severidad {sev}</CardTitle>
                    <CardDescription>{filtered.length} activas</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {filtered.slice(0, 5).map((nc) => (
                      <button
                        key={nc.id}
                        onClick={() => setSelectedNC(nc)}
                        className="w-full rounded p-2 text-left text-sm transition-colors hover:bg-muted"
                      >
                        <p className="truncate font-medium">{nc.title}</p>
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
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{selectedNC.title}</CardTitle>
                <CardDescription className="mt-1 font-mono text-xs">{selectedNC.nc_number}</CardDescription>
              </div>
              <Button variant="outline" onClick={() => setSelectedNC(null)}>
                Cerrar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Descripción</p>
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

      {activeCAs.length > 0 && (
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Acciones correctivas activas</CardTitle>
            <CardDescription>Seguimiento de acciones abiertas o en progreso</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeCAs.slice(0, 5).map((action) => (
              <div key={action.id} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                <div>
                  <p className="font-medium">{action.ca_number || 'Acción correctiva'}</p>
                  <p className="text-sm text-muted-foreground">
                    {action.action_description || 'Sin descripción'}
                  </p>
                </div>
                <Badge variant="outline">{action.status}</Badge>
              </div>
            ))}
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
