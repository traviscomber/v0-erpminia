'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ArrowRight, Activity, ClipboardCheck, FileText, FolderOpen, GraduationCap, HardHat, Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo obtener la información');
  }

  return data;
};

type ListResponse = {
  data: unknown[];
  total: number;
  items: unknown[];
  count: number;
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
    description: 'Políticas, procedimientos, instructivos y programas de seguridad',
    href: '/dashboard/sostenibilidad/prevencion-riesgos/documentos-hse',
    icon: FileText,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    title: 'Capacitaciones',
    description: 'Gestión de cursos, entrenamientos y certificaciones del personal',
    href: '/dashboard/sostenibilidad/prevencion-riesgos/capacitaciones',
    icon: GraduationCap,
    color: 'text-secondary',
    bgColor: 'bg-secondary/10',
  },
  {
    title: 'Artículos EPP',
    description: 'Catálogo maestro, asignaciones y control de equipos de protección',
    href: '/dashboard/sostenibilidad/prevencion-riesgos/epp',
    icon: HardHat,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    title: 'KPI Prevención',
    description: 'Indicadores de seguridad y tendencias operacionales',
    href: '/dashboard/sostenibilidad/prevencion-riesgos/kpi',
    icon: Activity,
    color: 'text-secondary',
    bgColor: 'bg-secondary/10',
  },
  {
    title: 'Inspecciones',
    description: 'Planificación, ejecución y seguimiento de inspecciones de seguridad',
    href: '/dashboard/sostenibilidad/prevencion-riesgos/inspecciones',
    icon: ClipboardCheck,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
  {
    title: 'Carpeta de Arranque',
    description: 'Validación de documentos de empresas contratistas y subcontratistas',
    href: '/dashboard/sostenibilidad/prevencion-riesgos/carpeta-arranque',
    icon: FolderOpen,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
];

export default function PrevencionRiesgosPage() {
  const { data: documentosData } = useSWR<ListResponse>('/api/documents/listmodule=prevenci%C3%B3n&category=documentos-hse', fetcher);
  const { data: capacitacionesData } = useSWR<ListResponse>('/api/sostenibilidad/capacitaciones', fetcher);
  const { data: eppData } = useSWR<ListResponse>('/api/sostenibilidad/epp', fetcher);
  const { data: inspeccionesData } = useSWR<ListResponse>('/api/sostenibilidad/inspecciones', fetcher);

  const documentCount = normalizeCount(documentosData);
  const trainingCount = normalizeCount(capacitacionesData);
  const eppCount = normalizeCount(eppData);
  const inspectionCount = normalizeCount(inspeccionesData);

  const summaryCards = [
    { label: 'Documentos HSE', value: documentCount },
    { label: 'Capacitaciones', value: trainingCount },
    { label: 'EPP activos', value: eppCount },
    { label: 'Inspecciones', value: inspectionCount },
  ];

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
            <h1 className="text-2xl font-bold">Prevención de Riesgos</h1>
            <p className="text-muted-foreground">Gestión integral de seguridad y salud ocupacional dentro de Sostenibilidad</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.label} className="rounded-xl shadow-none">
            <CardHeader className="pb-3">
              <CardDescription>{card.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{card.value}</div>
              <p className="mt-2 text-xs text-muted-foreground">Fuente conectada al módulo</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => {
          const Icon = module.icon;
          const count =
            module.title === 'Documentos HSE'
               documentCount
              : module.title === 'Capacitaciones'
                 trainingCount
                : module.title === 'Artículos EPP'
                   eppCount
                  : module.title === 'Inspecciones'
                     inspectionCount
                    : Math.max(documentCount, trainingCount, eppCount, inspectionCount);

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
