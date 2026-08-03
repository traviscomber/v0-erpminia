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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const data = await response.json().catch(() => null);
  if (!response.ok) return null;
  return data;
};

const PREVENCION_MODULE = 'prevención';
const DOCUMENTOS_HSE_CATEGORY = 'documentos-hse';

type ListResponse<T = unknown> = {
  data?: T[];
  total?: number;
  items?: T[];
  count?: number;
};

type WorkspaceItem = {
  title: string;
  description: string;
  href: string;
  icon: typeof Shield;
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

function WorkspaceSection({ title, description, items }: { title: string; description: string; items: WorkspaceItem[] }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="group">
              <Card className="h-full border-border/70 shadow-none transition-colors hover:border-foreground/20 hover:bg-muted/20">
                <CardHeader className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="rounded-lg bg-muted p-2.5">
                      <Icon className="h-5 w-5 text-foreground" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="rounded-full font-medium">
                        {item.count}
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                  <div>
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    <CardDescription className="mt-1.5 leading-relaxed">{item.description}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default function PrevencionRiesgosPage() {
  const { data: documentosData } = useSWR<ListResponse>(
    `/api/documents/list?module=${encodeURIComponent(PREVENCION_MODULE)}&category=${encodeURIComponent(DOCUMENTOS_HSE_CATEGORY)}`,
    fetcher,
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

  const immediateControl: WorkspaceItem[] = [
    {
      title: 'No conformidades',
      description: 'Revisar hallazgos, criticidad, estado y trazabilidad de cierre.',
      href: '/dashboard/sostenibilidad/prevencion-riesgos/no-conformidades',
      icon: AlertTriangle,
      count: nonConformanceCount,
    },
    {
      title: 'Acciones correctivas',
      description: 'Controlar responsables, plazos y acciones vencidas o pendientes.',
      href: '/dashboard/sostenibilidad/prevencion-riesgos/acciones-correctivas',
      icon: ClipboardCheck,
      count: correctiveActionCount,
    },
    {
      title: 'Indicadores de prevención',
      description: 'Consultar desempeño, evolución y señales operacionales del área.',
      href: '/dashboard/sostenibilidad/prevencion-riesgos/kpi',
      icon: Activity,
      count: kpiCount,
    },
  ];

  const preventiveExecution: WorkspaceItem[] = [
    {
      title: 'Inspecciones',
      description: 'Planificar, ejecutar y hacer seguimiento de inspecciones internas.',
      href: '/dashboard/sostenibilidad/prevencion-riesgos/inspecciones',
      icon: ClipboardCheck,
      count: inspectionCount,
    },
    {
      title: 'Inspecciones externas',
      description: 'Concentrar revisiones externas, evidencia y observaciones asociadas.',
      href: '/dashboard/sostenibilidad/prevencion-riesgos/inspecciones-externas',
      icon: Shield,
      count: externalInspectionCount,
    },
    {
      title: 'Capacitaciones',
      description: 'Administrar cursos, entrenamientos y certificaciones del personal.',
      href: '/dashboard/sostenibilidad/prevencion-riesgos/capacitaciones',
      icon: GraduationCap,
      count: trainingCount,
    },
    {
      title: 'Elementos de EPP',
      description: 'Controlar catálogo, asignaciones y disponibilidad de protección personal.',
      href: '/dashboard/sostenibilidad/prevencion-riesgos/epp',
      icon: HardHat,
      count: eppCount,
    },
  ];

  const documentation: WorkspaceItem[] = [
    {
      title: 'Documentos HSE',
      description: 'Políticas, procedimientos, instructivos y programas de seguridad.',
      href: '/dashboard/sostenibilidad/prevencion-riesgos/documentos-hse',
      icon: FileText,
      count: documentCount,
    },
    {
      title: 'Carpeta de Arranque',
      description: 'Validar documentación requerida para contratistas y subcontratistas.',
      href: '/dashboard/sostenibilidad/prevencion-riesgos/carpeta-arranque',
      icon: FolderOpen,
      count: documentCount,
    },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-5 border-b border-border/70 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Sostenibilidad y HSE · Seguridad y salud</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Prevención de Riesgos</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Control operacional de hallazgos, acciones correctivas, inspecciones, capacitación, EPP y documentación preventiva.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/sostenibilidad/prevencion-riesgos/documentos-hse">
              <FileText className="mr-2 h-4 w-4" />
              Documentos HSE
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/sostenibilidad/prevencion-riesgos/inspecciones">
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Nueva inspección
            </Link>
          </Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="shadow-none">
          <CardHeader className="pb-2"><CardDescription>No conformidades</CardDescription></CardHeader>
          <CardContent><div className="text-3xl font-semibold">{nonConformanceCount}</div><p className="mt-1 text-xs text-muted-foreground">Hallazgos registrados</p></CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2"><CardDescription>Acciones correctivas</CardDescription></CardHeader>
          <CardContent><div className="text-3xl font-semibold">{correctiveActionCount}</div><p className="mt-1 text-xs text-muted-foreground">Seguimientos operativos</p></CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2"><CardDescription>Inspecciones</CardDescription></CardHeader>
          <CardContent><div className="text-3xl font-semibold">{inspectionCount}</div><p className="mt-1 text-xs text-muted-foreground">Registros disponibles</p></CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2"><CardDescription>Capacitaciones</CardDescription></CardHeader>
          <CardContent><div className="text-3xl font-semibold">{trainingCount}</div><p className="mt-1 text-xs text-muted-foreground">Cursos y certificaciones</p></CardContent>
        </Card>
      </div>

      <WorkspaceSection
        title="Control inmediato"
        description="Lo que requiere revisión, decisión o seguimiento prioritario."
        items={immediateControl}
      />
      <WorkspaceSection
        title="Ejecución preventiva"
        description="Actividades recurrentes para controlar riesgos y mantener cumplimiento operativo."
        items={preventiveExecution}
      />
      <WorkspaceSection
        title="Documentación y habilitación"
        description="Respaldo documental y requisitos de ingreso para operación propia y contratista."
        items={documentation}
      />
    </div>
  );
}
