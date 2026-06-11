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
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
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
  kpis: KPI[];
  alerts: Alert[];
}

interface Module {
  name: string;
  path: string;
  count: number;
  status: 'pending' | 'active' | 'completed';
}

interface KPI {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'stable';
}

interface Alert {
  type: 'warning' | 'error' | 'info';
  message: string;
}

export default function SostenibilidadDashboard() {
  const [loading, setLoading] = useState(true);
  const [moduleCounts, setModuleCounts] = useState<Record<string, number>>({
    'documentos-hse': 24,
    'capacitaciones': 8,
    'epp': 15,
    'kpi': 12,
  });

  useEffect(() => {
    fetchModuleCounts();
  }, []);

  const fetchModuleCounts = async () => {
    try {
      const categories = ['documentos-hse', 'capacitaciones', 'epp', 'kpi'];
      const counts: Record<string, number> = {};

      for (const category of categories) {
        const response = await fetch(
          `/api/documents/list?module=prevención&category=${category}`,
          { credentials: 'include' }
        );
        const data = await response.json();
        counts[category] = Array.isArray(data) ? data.length : 0;
      }

      setModuleCounts(counts);
    } catch (error) {
      console.error('[v0] Error fetching module counts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Brandbook: 4 colors only - primary (naranja), secondary (verde), destructive (rojo), muted (gris)
  const pillars: PillarData[] = [
    {
      title: 'Prevención de Riesgos',
      icon: <Shield className="w-8 h-8" />,
      colorClass: 'text-primary',
      bgClass: 'bg-primary/10',
      borderClass: 'border-l-primary',
      modules: [
        { name: 'Documentos HSE', path: '/dashboard/sostenibilidad/prevencion-riesgos/documentos', count: moduleCounts['documentos-hse'], status: 'active' },
        { name: 'Capacitaciones', path: '/dashboard/sostenibilidad/prevencion-riesgos/capacitaciones', count: moduleCounts['capacitaciones'], status: 'active' },
        { name: 'Artículos EPP', path: '/dashboard/sostenibilidad/prevencion-riesgos/epp', count: moduleCounts['epp'], status: 'pending' },
        { name: 'KPI Prevención', path: '/dashboard/sostenibilidad/prevencion-riesgos/kpi', count: moduleCounts['kpi'], status: 'active' },
      ],
      kpis: [
        { label: 'Días sin accidentes', value: 145, trend: 'up' },
        { label: 'Tasa frecuencia', value: '2.3%', trend: 'down' },
        { label: 'Capacitaciones mes', value: 3, trend: 'stable' },
      ],
      alerts: [
        { type: 'warning', message: '2 EPP requieren renovación' },
        { type: 'info', message: 'Capacitación ACHS próxima semana' },
      ],
    },
    {
      title: 'Medio Ambiente',
      icon: <Leaf className="w-8 h-8" />,
      colorClass: 'text-secondary',
      bgClass: 'bg-secondary/10',
      borderClass: 'border-l-secondary',
      modules: [
        { name: 'Monitoreos', path: '/dashboard/sostenibilidad/medio-ambiente/monitoreos', count: 12, status: 'active' },
        { name: 'Permisos', path: '/dashboard/sostenibilidad/medio-ambiente/permisos', count: 5, status: 'active' },
        { name: 'Planes Acción', path: '/dashboard/sostenibilidad/medio-ambiente/planes-accion', count: 3, status: 'pending' },
      ],
      kpis: [
        { label: 'Emisiones (ton CO2)', value: '1,245', trend: 'down' },
        { label: 'Consumo agua (m³)', value: '8,500', trend: 'stable' },
        { label: 'Residuos reciclados %', value: '65%', trend: 'up' },
      ],
      alerts: [
        { type: 'info', message: 'Reporte ambiental mensual debido' },
      ],
    },
    {
      title: 'Comunidades',
      icon: <Users className="w-8 h-8" />,
      colorClass: 'text-muted-foreground',
      bgClass: 'bg-muted',
      borderClass: 'border-l-muted-foreground',
      modules: [
        { name: 'Stakeholders', path: '/dashboard/sostenibilidad/comunidades/stakeholders', count: 18, status: 'active' },
        { name: 'Compromisos', path: '/dashboard/sostenibilidad/comunidades/compromisos', count: 7, status: 'active' },
        { name: 'Licencia Social', path: '/dashboard/sostenibilidad/comunidades/licencia-social', count: 2, status: 'active' },
      ],
      kpis: [
        { label: 'Comunidades activas', value: 4, trend: 'stable' },
        { label: 'Compromisos cumplidos %', value: '92%', trend: 'up' },
        { label: 'Reuniones realizadas', value: 12, trend: 'up' },
      ],
      alerts: [],
    },
    {
      title: 'Proyectos Sostenibilidad',
      icon: <Target className="w-8 h-8" />,
      colorClass: 'text-destructive',
      bgClass: 'bg-destructive/10',
      borderClass: 'border-l-destructive',
      modules: [
        { name: 'Iniciativas', path: '/dashboard/sostenibilidad/proyectos/iniciativas', count: 6, status: 'active' },
        { name: 'Presupuesto', path: '/dashboard/sostenibilidad/proyectos/presupuesto', count: 1, status: 'active' },
        { name: 'ROI Tracking', path: '/dashboard/sostenibilidad/proyectos/roi', count: 6, status: 'pending' },
      ],
      kpis: [
        { label: 'Proyectos activos', value: 6, trend: 'stable' },
        { label: 'Presupuesto utilizado %', value: '72%', trend: 'up' },
        { label: 'Proyectos completados', value: 3, trend: 'up' },
      ],
      alerts: [
        { type: 'warning', message: 'Proyecto fotovoltaico requiere revisión' },
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

              {/* KPIs */}
              <div className="pt-4 border-t border-border">
                <h3 className="text-sm font-semibold mb-3 text-foreground">KPIs Principales</h3>
                <div className="grid grid-cols-1 gap-2">
                  {pillar.kpis.map((kpi, kidx) => (
                    <div key={kidx} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{kpi.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{kpi.value}</span>
                        {kpi.trend === 'up' && <TrendingUp className="w-4 h-4 text-secondary" />}
                        {kpi.trend === 'down' && <TrendingUp className="w-4 h-4 text-destructive rotate-180" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alerts */}
              {pillar.alerts.length > 0 && (
                <div className="pt-4 border-t border-border">
                  <h3 className="text-sm font-semibold mb-3 text-foreground">Alertas</h3>
                  <div className="space-y-2">
                    {pillar.alerts.map((alert, aidx) => (
                      <div key={aidx} className="flex items-start gap-2 p-2 rounded bg-muted">
                        <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${alert.type === 'error' ? 'text-destructive' : alert.type === 'warning' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <p className="text-xs text-muted-foreground">{alert.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
