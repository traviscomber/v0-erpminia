'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Zap, Database } from 'lucide-react';
import Link from 'next/link';

interface ConnectionFlow {
  from: string;
  to: string;
  action: string;
}

export function SustainabilityModuleConnections() {
  const modules = [
    { name: 'Acciones Correctivas', path: '/dashboard/sostenibilidad' },
    { name: 'Documentos HSE', path: '/dashboard/sostenibilidad/prevencion-riesgos/documentos-hse' },
    { name: 'Inspecciones', path: '/dashboard/sostenibilidad/prevencion-riesgos/inspecciones' },
    { name: 'No Conformidades', path: '/dashboard/sostenibilidad/no-conformidades' },
  ];

  const connections: ConnectionFlow[] = [
    { from: 'Inspecciones', to: 'No Conformidades', action: 'Genera NC desde hallazgos de inspección' },
    { from: 'No Conformidades', to: 'Acciones Correctivas', action: 'Activa acciones cuando la NC es aprobada' },
    { from: 'Acciones Correctivas', to: 'Documentos HSE', action: 'Vincula evidencia y planes de acción' },
    { from: 'Todas las áreas', to: 'Calendario', action: 'Sincroniza eventos y hitos del área' },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Módulos del área
          </CardTitle>
          <CardDescription>Módulos operacionales de Sostenibilidad</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {modules.map((module) => (
              <Link key={module.name} href={module.path}>
                <div className="cursor-pointer rounded-lg border border-border p-4 transition hover:bg-muted">
                  <h3 className="text-sm font-semibold text-foreground">{module.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Ver módulo</p>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Flujos entre módulos
          </CardTitle>
          <CardDescription>Cómo se conectan los módulos del área de Sostenibilidad</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {connections.map((connection) => (
              <div key={`${connection.from}-${connection.to}`} className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {connection.from}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="outline" className="text-xs">
                      {connection.to}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{connection.action}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
