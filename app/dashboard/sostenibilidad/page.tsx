'use client';

import { useMemo, type ReactNode } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, Leaf, Shield, Target, Users } from 'lucide-react';
import { SustainabilityKPIDashboard } from '@/components/sostenibilidad/kpi-dashboard';
import { SustainabilityModuleConnections } from '@/components/sostenibilidad/module-connections';
import { SustainabilityWorkflowDiagram } from '@/components/sostenibilidad/sustainability-workflow-diagram';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo obtener la información');
  }

  return data;
};

type OverviewResponse = {
  period: string;
  overview: {
    compliance_score: number;
    total_ncs: number;
    open_ncs: number;
    closed_ncs: number;
    overdue_cas: number;
    trend: 'mejorando' | 'empeorando' | 'stable';
  };
  nc_stats: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  ca_stats: {
    total: number;
    planned: number;
    in_progress: number;
    completed: number;
    overdue: number;
    completionRate: number;
  };
  trends: Array<{ report_period: string; compliance_score: number }>;
  top_risks: Array<{
    id: string;
    nc_number: string | null;
    title: string | null;
    severity: string | null;
    status: string | null;
  }>;
  inspections_completed: number;
  generated_at: string;
};

type ListResponse = {
  data: unknown[];
  total: number;
  items: unknown[];
  count: number;
};

type ModuleItem = {
  name: string;
  path: string;
  count: number;
  status: 'pending' | 'active' | 'completed';
};

type PillarCard = {
  title: string;
  icon: ReactNode;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  modules: ModuleItem[];
};

const normalizeCount = (payload: ListResponse | unknown): number => {
  if (!payload) return 0;
  if (Array.isArray(payload)) return payload.length;
  if (typeof payload === 'object') {
    const typed = payload as ListResponse & { data: unknown[]; items: unknown[] };
    if (Array.isArray(typed.data)) return typed.data.length;
    if (Array.isArray(typed.items)) return typed.items.length;
    if (typeof typed.total === 'number') return typed.total;
    if (typeof typed.count === 'number') return typed.count;
  }
  return 0;
};

const emptyOverview: OverviewResponse = {
  period: '',
  overview: {
    compliance_score: 0,
    total_ncs: 0,
    open_ncs: 0,
    closed_ncs: 0,
    overdue_cas: 0,
    trend: 'stable',
  },
  nc_stats: { critical: 0, high: 0, medium: 0, low: 0 },
  ca_stats: { total: 0, planned: 0, in_progress: 0, completed: 0, overdue: 0, completionRate: 0 },
  trends: [],
  top_risks: [],
  inspections_completed: 0,
  generated_at: '',
};

export default function SostenibilidadDashboard() {
  const { data: overviewData } = useSWR<OverviewResponse>('/api/sostenibilidad/dashboard/overview', fetcher, {
    refreshInterval: 60000,
  });
  const { data: documentosData } = useSWR<ListResponse>('/api/documents/list?module=prevenci%C3%B3n&category=documentos-hse', fetcher);
  const { data: capacitacionesData } = useSWR<ListResponse>('/api/sostenibilidad/capacitaciones', fetcher);
  const { data: eppData } = useSWR<ListResponse>('/api/sostenibilidad/epp', fetcher);
  const { data: inspeccionesData } = useSWR<ListResponse>('/api/sostenibilidad/inspecciones', fetcher);
  const { data: medioAmbienteData } = useSWR<ListResponse>('/api/sostenibilidad/medio-ambiente', fetcher);
  const { data: comunidadesData } = useSWR<ListResponse>('/api/sostenibilidad/comunidades', fetcher);

  const overview = overviewData || emptyOverview;
  const docCount = normalizeCount(documentosData);
  const capCount = normalizeCount(capacitacionesData);
  const eppCount = normalizeCount(eppData);
  const inspeccionesCount = normalizeCount(inspeccionesData) || overview.inspections_completed || 0;
  const ambienteCount = normalizeCount(medioAmbienteData);
  const comunidadesCount = normalizeCount(comunidadesData);
  const complianceScore = overview.overview.compliance_score;
  const openNcs = overview.overview.open_ncs;
  const overdueCas = overview.overview.overdue_cas;
  const totalActions = overview.ca_stats.total || 0;
  const completionRate = overview.ca_stats.completionRate || 0;

  const pillars = useMemo<PillarCard[]>(() => {
    const makeStatus = (count: number): ModuleItem['status'] => {
      if (count > 0) return 'active';
      return 'pending';
    };

    return [
      {
        title: 'Prevención de Riesgos',
        icon: <Shield className="w-8 h-8" />,
        colorClass: 'text-primary',
        bgClass: 'bg-primary/10',
        borderClass: 'border-l-primary',
        modules: [
          { name: 'Documentos HSE', path: '/dashboard/sostenibilidad/prevencion-riesgos/documentos-hse', count: docCount, status: makeStatus(docCount) },
          { name: 'Capacitaciones', path: '/dashboard/sostenibilidad/prevencion-riesgos/capacitaciones', count: capCount, status: makeStatus(capCount) },
          { name: 'Artículos EPP', path: '/dashboard/sostenibilidad/prevencion-riesgos/epp', count: eppCount, status: makeStatus(eppCount) },
          { name: 'Inspecciones', path: '/dashboard/sostenibilidad/prevencion-riesgos/inspecciones', count: inspeccionesCount, status: makeStatus(inspeccionesCount) },
        ],
      },
      {
        title: 'Medio Ambiente',
        icon: <Leaf className="w-8 h-8" />,
        colorClass: 'text-secondary',
        bgClass: 'bg-secondary/10',
        borderClass: 'border-l-secondary',
        modules: [
          { name: 'Monitoreos', path: '/dashboard/sostenibilidad/medio-ambiente', count: ambienteCount, status: makeStatus(ambienteCount) },
          { name: 'Permisos', path: '/dashboard/sostenibilidad/medio-ambiente', count: ambienteCount, status: makeStatus(ambienteCount) },
          { name: 'Planes de Acción', path: '/dashboard/sostenibilidad/medio-ambiente', count: overdueCas, status: makeStatus(overdueCas) },
        ],
      },
      {
        title: 'Comunidades',
        icon: <Users className="w-8 h-8" />,
        colorClass: 'text-muted-foreground',
        bgClass: 'bg-muted',
        borderClass: 'border-l-muted-foreground',
        modules: [
          { name: 'Stakeholders', path: '/dashboard/sostenibilidad/comunidades', count: comunidadesCount, status: makeStatus(comunidadesCount) },
          { name: 'Compromisos', path: '/dashboard/sostenibilidad/comunidades', count: comunidadesCount, status: makeStatus(comunidadesCount) },
          { name: 'Licencia Social', path: '/dashboard/sostenibilidad/comunidades', count: comunidadesCount, status: makeStatus(comunidadesCount) },
        ],
      },
      {
        title: 'Proyectos Sostenibilidad',
        icon: <Target className="w-8 h-8" />,
        colorClass: 'text-destructive',
        bgClass: 'bg-destructive/10',
        borderClass: 'border-l-destructive',
        modules: [
          { name: 'Iniciativas', path: '/dashboard/sostenibilidad/reportes', count: totalActions, status: makeStatus(totalActions) },
          { name: 'Presupuesto', path: '/dashboard/sostenibilidad/reportes', count: totalActions, status: makeStatus(totalActions) },
          { name: 'ROI Tracking', path: '/dashboard/sostenibilidad/reportes', count: Math.round(completionRate), status: makeStatus(completionRate) },
        ],
      },
    ];
  }, [ambienteCount, capCount, comunidadesCount, completionRate, docCount, eppCount, inspeccionesCount, overdueCas, totalActions]);

  const topMetrics = [
    { label: 'Score de compliance', value: `${complianceScore}%`, helper: overview.overview.trend, tone: complianceScore >= 85 ? 'text-secondary' : complianceScore >= 70 ? 'text-primary' : 'text-destructive' },
    { label: 'NC abiertas', value: `${openNcs}`, helper: `${overview.overview.total_ncs} totales`, tone: 'text-primary' },
    { label: 'CAs vencidas', value: `${overdueCas}`, helper: 'Requieren acción', tone: overdueCas > 0 ? 'text-destructive' : 'text-secondary' },
    { label: 'Inspecciones cerradas', value: `${inspeccionesCount}`, helper: 'Fuente real', tone: 'text-secondary' },
    { label: 'Documentos HSE', value: `${docCount}`, helper: 'En el módulo', tone: 'text-primary' },
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/10 text-primary">
              Datos reales
            </Badge>
            <Badge variant="outline" className="rounded-full">
              Periodo {overview.period || 'actual'}
            </Badge>
          </div>
          <h1 className="text-4xl font-bold text-foreground">Departamento de Sostenibilidad</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Gestión integrada de Prevención de Riesgos, Medio Ambiente, Comunidades y Proyectos con datos operativos reales.
          </p>
        </div>
      </div>

      <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {topMetrics.map((metric) => (
          <Card key={metric.label} className="rounded-xl shadow-none">
            <CardHeader className="pb-3">
              <CardDescription>{metric.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${metric.tone}`}>{metric.value}</div>
              <p className="mt-2 text-xs text-muted-foreground">{metric.helper}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {pillars.map((pillar) => (
          <Card key={pillar.title} className={`rounded-xl border shadow-none ${pillar.borderClass}`}>
            <CardHeader>
              <div className="mb-4 flex items-center gap-3">
                <div className={`rounded-lg p-3 ${pillar.bgClass}`}>
                  <div className={pillar.colorClass}>{pillar.icon}</div>
                </div>
                <div>
                  <CardTitle className="text-xl">{pillar.title}</CardTitle>
                  <CardDescription>{pillar.modules.length} módulos conectados</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="mb-3 text-sm font-semibold text-foreground">Módulos</h3>
                <div className="space-y-2">
                  {pillar.modules.map((module) => (
                    <Link key={module.name} href={module.path}>
                      <div className="flex cursor-pointer items-center justify-between rounded-xl border border-border px-3 py-3 transition hover:bg-muted/40">
                        <span className="text-sm font-medium">{module.name}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="rounded-full text-xs">
                            {module.count}
                          </Badge>
                          {module.status === 'active' ? (
                            <CheckCircle className="h-4 w-4 text-secondary" />
                          ) : (
                            <Clock className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-12">
        <SustainabilityKPIDashboard />
      </div>

      <div className="mb-12">
        <SustainabilityWorkflowDiagram />
      </div>

      <SustainabilityModuleConnections />
    </div>
  );
}
