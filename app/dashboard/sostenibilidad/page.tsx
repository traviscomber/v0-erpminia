'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  Leaf,
  Users,
  Target,
  CheckCircle,
  Clock,
  Calendar,
  FileText,
} from 'lucide-react';
import { SustainabilityWorkflowDiagram } from '@/components/sostenibilidad/sustainability-workflow-diagram';
import { SustainabilityModuleConnections } from '@/components/sostenibilidad/module-connections';

interface PillarData {
  title: string;
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  modules: Module[];
}

interface Module {
  name: string;
  path: string;
  count: number;
  status: 'pending' | 'active' | 'completed';
}

export default function SostenibilidadDashboard() {
  const [loading, setLoading] = useState(true);
  const [docCount, setDocCount] = useState(0);

  useEffect(() => {
    fetch('/api/documents/list?module=prevenci%C3%B3n&category=documentos-hse', {
      credentials: 'include',
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setDocCount(data.length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const pillars: PillarData[] = [
    {
      title: 'Prevención de Riesgos',
      icon: <Shield className="w-8 h-8" />,
      colorClass: 'text-primary',
      bgClass: 'bg-primary/10',
      borderClass: 'border-l-primary',
      modules: [
        { name: 'Documentos HSE', path: '/dashboard/sostenibilidad/prevencion-riesgos/documentos-hse', count: docCount, status: 'active' },
        { name: 'Capacitaciones', path: '/dashboard/sostenibilidad/prevencion-riesgos/capacitaciones', count: 0, status: 'active' },
        { name: 'Artículos EPP', path: '/dashboard/sostenibilidad/prevencion-riesgos/epp', count: 0, status: 'pending' },
        { name: 'KPI Prevención', path: '/dashboard/sostenibilidad/prevencion-riesgos/kpi', count: 0, status: 'active' },
      ],
    },
    {
      title: 'Medio Ambiente',
      icon: <Leaf className="w-8 h-8" />,
      colorClass: 'text-secondary',
      bgClass: 'bg-secondary/10',
      borderClass: 'border-l-secondary',
      modules: [
        { name: 'Monitoreos', path: '/dashboard/sostenibilidad/medio-ambiente', count: 0, status: 'active' },
        { name: 'Permisos', path: '/dashboard/sostenibilidad/medio-ambiente', count: 0, status: 'active' },
        { name: 'Planes Acción', path: '/dashboard/sostenibilidad/medio-ambiente', count: 0, status: 'pending' },
      ],
    },
    {
      title: 'Comunidades',
      icon: <Users className="w-8 h-8" />,
      colorClass: 'text-muted-foreground',
      bgClass: 'bg-muted',
      borderClass: 'border-l-muted-foreground',
      modules: [
        { name: 'Stakeholders', path: '/dashboard/sostenibilidad/comunidades', count: 0, status: 'active' },
        { name: 'Compromisos', path: '/dashboard/sostenibilidad/comunidades', count: 0, status: 'active' },
        { name: 'Licencia Social', path: '/dashboard/sostenibilidad/comunidades', count: 0, status: 'active' },
      ],
    },
    {
      title: 'Proyectos Sostenibilidad',
      icon: <Target className="w-8 h-8" />,
      colorClass: 'text-destructive',
      bgClass: 'bg-destructive/10',
      borderClass: 'border-l-destructive',
      modules: [
        { name: 'Iniciativas', path: '/dashboard/sostenibilidad/reportes', count: 0, status: 'active' },
        { name: 'Presupuesto', path: '/dashboard/sostenibilidad/reportes', count: 0, status: 'active' },
        { name: 'ROI Tracking', path: '/dashboard/sostenibilidad/reportes', count: 0, status: 'pending' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Departamento de Sostenibilidad</h1>
        <p className="text-muted-foreground">
          Gestión integrada de Prevención de Riesgos, Medio Ambiente, Comunidades y Proyectos
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-4 mb-8 flex-wrap">
        <Link href="/dashboard/sostenibilidad/calendario">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Calendar className="w-4 h-4 mr-2" />
            Calendario de Eventos
          </Button>
        </Link>
        <Link href="/dashboard/sostenibilidad/documentos-flujo">
          <Button variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            Flujo Documental
          </Button>
        </Link>
      </div>

      {/* 4 Pillar Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
        {pillars.map((pillar, idx) => (
          <Card key={idx} className={`border-l-4 ${pillar.borderClass}`}>
            <CardHeader>
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-3 rounded-lg ${pillar.bgClass}`}>
                  <div className={pillar.colorClass}>{pillar.icon}</div>
                </div>
                <div>
                  <CardTitle className="text-xl">{pillar.title}</CardTitle>
                  <CardDescription>{pillar.modules.length} módulos</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Modules */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-foreground">Módulos</h3>
                <div className="space-y-2">
                  {pillar.modules.map((module, midx) => (
                    <Link key={midx} href={module.path}>
                      <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted transition cursor-pointer">
                        <span className="text-sm font-medium">{module.name}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {module.count}
                          </Badge>
                          {module.status === 'active' && <CheckCircle className="w-4 h-4 text-secondary" />}
                          {module.status === 'pending' && <Clock className="w-4 h-4 text-primary" />}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* KPIs - sin datos reales aún */}
              <div className="pt-4 border-t border-border">
                <h3 className="text-sm font-semibold mb-2 text-foreground">KPIs Principales</h3>
                <p className="text-xs text-muted-foreground">Sin datos disponibles</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Workflow Integration Diagram */}
      <div className="mt-12 mb-8">
        <SustainabilityWorkflowDiagram />
      </div>

      {/* Module Connections & Real-time Status */}
      <div className="mt-12">
        <SustainabilityModuleConnections />
      </div>
    </div>
  );
}
