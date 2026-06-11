'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { 
  Shield, 
  GraduationCap, 
  HardHat, 
  Activity,
  ClipboardCheck,
  FileText,
  ArrowRight,
  FolderOpen
} from 'lucide-react';

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
    description: 'Indicadores de seguridad y tendencias (sin datos aún)',
    href: '/dashboard/sostenibilidad/prevencion-riesgos/kpi',
    icon: Activity,
    color: 'text-secondary',
    bgColor: 'bg-secondary/10',
  },
  {
    title: 'Inspecciones Internas',
    description: 'Planificación, ejecución y seguimiento de inspecciones de seguridad',
    href: '/dashboard/sostenibilidad/prevencion-riesgos/inspecciones-internas',
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
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-lg bg-primary/10">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Prevención de Riesgos</h1>
          <p className="text-muted-foreground">Pilar 1 de Sostenibilidad - Gestión integral de seguridad y salud ocupacional</p>
        </div>
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <Link key={module.href} href={module.href}>
              <Card className="h-full hover:shadow-lg transition-all cursor-pointer group">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className={`p-2 rounded-lg ${module.bgColor}`}>
                      <Icon className={`w-6 h-6 ${module.color}`} />
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
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
