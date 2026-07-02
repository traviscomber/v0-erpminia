'use client';

import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';
import { AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NonconformanceForm } from '@/components/sostenibilidad/nonconformances/nonconformance-form';
import { NonconformanceCard } from '@/components/sostenibilidad/nonconformances/nonconformance-card';
import { CorrectiveActionModal } from '@/components/sostenibilidad/nonconformances/corrective-action-modal';
import { NonconformanceTable } from '@/components/sostenibilidad/nonconformances/nonconformance-table';
import type { NonconformanceRecord } from '@/components/sostenibilidad/nonconformance-types';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  return res.ok ? res.json() : null;
};

type NonconformanceResponse = {
  nonconformances?: unknown;
  stats?: {
    open?: number;
    closed?: number;
    overdue?: number;
    by_severity?: Record<string, number>;
  };
};

type ReportResponse = {
  compliance_score?: number;
  by_severity?: Record<string, number>;
};

const severityLevels = ['critical', 'high', 'medium', 'low'] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toText = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback);

const normalizeNonconformance = (value: unknown): NonconformanceRecord | null => {
  if (!isRecord(value)) return null;

  const id = toText(value.id);
  if (!id) return null;

  return {
    id,
    title: toText(value.title || value.nc_title || value.nc_number, 'No conformidad'),
    nc_number: toText(value.nc_number || value.number || value.code || id, id),
    status: toText(value.status || value.state, 'open').toLowerCase(),
    severity: toText(value.severity, 'medium').toLowerCase(),
    description: toText(value.description || value.detail || value.descripcion, 'Sin descripción'),
    root_cause: toText(value.root_cause || value.causa_raiz || value.rootCause, ''),
    ...value,
  };
};

export default function NonconformanceDashboard() {
  const [showForm, setShowForm] = useState(false);
  const [showCAModal, setShowCAModal] = useState(false);
  const [selectedNC, setSelectedNC] = useState<NonconformanceRecord | null>(null);

  const severityColors = {
    critical: 'bg-destructive/20 text-destructive',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-blue-100 text-blue-800',
  };

  const { data: ncData, mutate: mutateNCs } = useSWR<NonconformanceResponse | null>(
    '/api/sostenibilidad/nonconformances',
    fetcher
  );
  const { data: reportData, mutate: mutateReport } = useSWR<ReportResponse | null>(
    '/api/sostenibilidad/compliance-report',
    fetcher
  );

  const ncs = Array.isArray(ncData?.nonconformances)
    ? ncData.nonconformances
        .map(normalizeNonconformance)
        .filter((nc): nc is NonconformanceRecord => nc !== null)
    : [];
  const stats = ncData?.stats || {};
  const report = reportData || {};
  const openCount = stats.open ?? 0;
  const closedCount = stats.closed ?? 0;
  const overdueCount = stats.overdue ?? 0;

  const openNCs = ncs.filter((nc) => nc.status === 'open');
  const inProgressNCs = ncs.filter((nc) => nc.status === 'in_progress');

  const handleCreateNC = async (formData: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/sostenibilidad/nonconformances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('No se pudo crear la no conformidad');
      await mutateNCs();
      await mutateReport();
      setShowForm(false);
      setSelectedNC(null);
      toast.success('No conformidad creada correctamente');
    } catch (error) {
      toast.error('No se pudo crear la no conformidad');
      throw error;
    }
  };

  const handleCreateCA = async (caData: Record<string, unknown>) => {
    if (!selectedNC?.id) return;
    try {
      const res = await fetch('/api/sostenibilidad/corrective-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...caData, ncId: selectedNC.id }),
      });
      if (!res.ok) throw new Error('No se pudo crear la accion correctiva');
      await mutateNCs();
      await mutateReport();
      setShowCAModal(false);
      setSelectedNC(null);
      toast.success('Accion correctiva creada correctamente');
    } catch (error) {
      toast.error('No se pudo crear la accion correctiva');
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-foreground">Gestión de no conformidades</h1>
          <p className="text-muted-foreground">
            Seguimiento, control y cierre de no conformidades con acciones correctivas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/sostenibilidad/no-conformidades/importar">Plantilla</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/sostenibilidad/no-conformidades/importar">Importar Excel</Link>
          </Button>
          <Button onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancelar' : 'Reportar no conformidad'}</Button>
        </div>
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
            <p className="text-2xl font-bold">{openCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Casos activos</p>
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
            <p className="text-xs text-muted-foreground mt-1">En tratamiento</p>
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
            <p className="text-2xl font-bold text-secondary">{closedCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Resueltas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Cumplimiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{report.compliance_score || 0}%</p>
            <p className="text-xs text-muted-foreground mt-1">Puntaje global</p>
          </CardContent>
        </Card>
      </div>

      {overdueCount > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">{overdueCount} no conformidades vencidas</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="open">NC activas ({openCount})</TabsTrigger>
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
                    nc={nc}
                    onViewDetails={(id) => setSelectedNC(ncs.find((item) => item.id === id) || nc)}
                    onCreateCA={(id) => {
                      setSelectedNC(ncs.find((item) => item.id === id) || nc);
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
                <CardTitle>Distribución por severidad</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {severityLevels.map((sev) => (
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
              <NonconformanceTable data={openNCs} onRowClick={(nc) => setSelectedNC(nc)} onEdit={(nc) => setSelectedNC(nc)} />
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
              <NonconformanceTable data={ncs} onRowClick={(nc) => setSelectedNC(nc)} onEdit={(nc) => setSelectedNC(nc)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="severity">
          <div className="grid gap-4 md:grid-cols-2">
            {severityLevels.map((sev) => {
              const filtered = ncs.filter((nc) => nc.severity === sev && nc.status !== 'closed');
              return (
                <Card key={sev}>
                  <CardHeader>
                    <CardTitle className="capitalize">{sev} severidad</CardTitle>
                    <CardDescription>{filtered.length} activas</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {filtered.slice(0, 5).map((nc) => (
                      <button key={nc.id} onClick={() => setSelectedNC(nc)} className="w-full rounded p-2 text-left text-sm hover:bg-muted">
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
