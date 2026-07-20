'use client';

import Link from 'next/link';
import useSWR from 'swr';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ClipboardCheck,
  FileText,
  FolderOpen,
  GraduationCap,
  HardHat,
  Shield,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return null;
  }

  return data;
};

const PREVENCION_MODULE = 'prevenci\u00f3n';
const DOCUMENTOS_HSE_CATEGORY = 'documentos-hse';

type ListResponse<T = unknown> = {
  data?: T[];
  total?: number;
  items?: T[];
  count?: number;
};

const normalizeCount = (payload: ListResponse | unknown): number => {
  if (!payload) return 0;
  if (Array.isArray(payload)) return payload.length;
  if (typeof payload === 'object') {
    const typed = payload as ListResponse;
    if (Array.isArray(typed.data)) return typed.data.length;
    if (Array.isArray(typed.items)) return typed.items.length;
    if (typeof typed.total === 'number') return typed.total;
    if (typeof typed.count === 'number') return typed.count;
  }
  return 0;
};

const modules = [
  {
    title: 'Documentos HSE',
    description: 'Politicas, procedimientos, instructivos y programas de seguridad.',
    href: '/dashboard/sostenibilidad/prevencion-riesgos/documentos-hse',
    icon: FileText,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    title: 'Capacitaciones',
    description: 'Gestion de cursos, entrenamientos y certificaciones del personal.',
    href: '/dashboard/sostenibilidad/prevencion-riesgos/capacitaciones',
    icon: GraduationCap,
    color: 'text-secondary',
    bgColor: 'bg-secondary/10',
  },
  {
    title: 'Elementos de EPP',
    description: 'Catalogo maestro, asignaciones y control de equipos de proteccion.',
    href: '/dashboard/sostenibilidad/prevencion-riesgos/epp',
    icon: HardHat,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    title: 'No conformidades',
    description: 'Registro, clasificacion y trazabilidad de hallazgos preventivos.',
    href: '/dashboard/sostenibilidad/prevencion-riesgos/no-conformidades',
    icon: AlertTriangle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
  },
  {
    title: 'Acciones correctivas',
    description: 'Seguimiento de responsables, plazos y cierres asociados a hallazgos.',
    href: '/dashboard/sostenibilidad/prevencion-riesgos/acciones-correctivas',
    icon: ClipboardCheck,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    title: 'Indicadores de prevencion',
    description: 'Indicadores de seguridad y tendencias operacionales.',
    href: '/dashboard/sostenibilidad/prevencion-riesgos/kpi',
    icon: Activity,
    color: 'text-secondary',
    bgColor: 'bg-secondary/10',
  },
  {
    title: 'Inspecciones',
    description: 'Planificacion, ejecucion y seguimiento de inspecciones de seguridad.',
    href: '/dashboard/sostenibilidad/prevencion-riesgos/inspecciones',
    icon: ClipboardCheck,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
  {
    title: 'Inspecciones externas',
    description: 'Control documental de inspecciones externas y evidencia asociada.',
    href: '/dashboard/sostenibilidad/prevencion-riesgos/inspecciones-externas',
    icon: Shield,
    color: 'text-secondary',
    bgColor: 'bg-secondary/10',
  },
  {
    title: 'Carpeta de Arranque',
    description: 'Validacion de documentos de empresas contratistas y subcontratistas.',
    href: '/dashboard/sostenibilidad/prevencion-riesgos/carpeta-arranque',
    icon: FolderOpen,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
];

export default function PrevencionRiesgosPage() {
  const { data: documentosData } = useSWR<ListResponse>(
    `/api/documents/list?module=${encodeURIComponent(PREVENCION_MODULE)}&category=${encodeURIComponent(DOCUMENTOS_HSE_CATEGORY)}`,
    fetcher
  );
  const { data: capacitacionesData } = useSWR<ListResponse>('/api/sostenibilidad/capacitaciones', fetcher);
  const { data: eppData } = useSWR<ListResponse>('/api/sostenibilidad/epp', fetcher);
  const { data: inspeccionesData } = useSWR<ListResponse>('/api/sostenibilidad/inspecciones', fetcher);
  const { data: inspeccionesExternasData } = useSWR<ListResponse>('/api/sostenibilidad/inspecciones?tipo=externas', fetcher);
  const { data: kpiData } = useSWR<ListResponse>('/api/sostenibilidad/kpi', fetcher);
  const { data: noConformidadesData } = useSWR<ListResponse>('/api/sostenibilidad/no-conformidades', fetcher);
  const { data: accionesCorrectivasData } = useSWR<ListResponse>('/api/sostenibilidad/corrective-actions', fetcher);

  const documentCount = normalizeCount(documentosData);
  const trainingCount = normalizeCount(capacitacionesData);
  const eppCount = normalizeCount(eppData);
  const inspectionCount = normalizeCount(inspeccionesData);
  const externalInspectionCount = normalizeCount(inspeccionesExternasData);
  const kpiCount = normalizeCount(kpiData);
  const nonConformanceCount = normalizeCount(noConformidadesData);
  const correctiveActionCount = normalizeCount(accionesCorrectivasData);

  const summaryCards = [
    { label: 'Documentos HSE', value: documentCount },
    { label: 'Capacitaciones', value: trainingCount },
    { label: 'EPP activos', value: eppCount },
    { label: 'Inspecciones', value: inspectionCount },
    { label: 'No conformidades', value: nonConformanceCount },
    { label: 'Acciones correctivas', value: correctiveActionCount },
  ];

  const countsByModule: Record<string, number> = {
    'Documentos HSE': documentCount,
    Capacitaciones: trainingCount,
    'Elementos de EPP': eppCount,
    'No conformidades': nonConformanceCount,
    'Acciones correctivas': correctiveActionCount,
    Inspecciones: inspectionCount,
    'Inspecciones externas': externalInspectionCount,
    'Carpeta de Arranque': documentCount,
    'Indicadores de prevencion': kpiCount,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="rounded-lg bg-primary/10 p-3">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/10 text-primary">
                Datos reales
              </Badge>
            </div>
            <h1 className="text-2xl font-bold">Prevencion de Riesgos</h1>
            <p className="text-muted-foreground">Gestion integral de seguridad y salud ocupacional dentro de Sostenibilidad.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        {summaryCards.map((card) => (
          <Card key={card.label} className="rounded-xl shadow-none">
            <CardHeader className="pb-3">
              <CardDescription>{card.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{card.value}</div>
              <p className="mt-2 text-xs text-muted-foreground">Fuente conectada al modulo</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => {
          const Icon = module.icon;
          const count = countsByModule[module.title] ?? 0;

          return (
            <Link key={module.href} href={module.href}>
              <Card className="group h-full rounded-xl shadow-none transition hover:bg-muted/20">
                <CardHeader>
                  <div className="mb-4 flex items-start justify-between">
                    <div className={`rounded-lg p-2 ${module.bgColor}`}>
                      <Icon className={`h-6 w-6 ${module.color}`} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="rounded-full text-xs">
                        {count}
                      </Badge>
                      <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  </div>
                  <CardTitle className="text-lg">{module.title}</CardTitle>
                  <CardDescription className="text-sm">{module.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
