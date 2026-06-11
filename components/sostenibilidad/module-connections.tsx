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
    { name: 'Inspecciones', path: '/dashboard/sostenibilidad/prevencion-riesgos/inspecciones' },
    { name: 'No-Conformidades', path: '/dashboard/sostenibilidad/no-conformidades' },
    { name: 'Acciones Correctivas', path: '/dashboard/sostenibilidad' },
    { name: 'Documentos HSE', path: '/dashboard/sostenibilidad/prevencion-riesgos/documentos-hse' },
  ];

  const connections: ConnectionFlow[] = [
    { from: 'Inspecciones', to: 'No-Conformidades', action: 'Genera NC desde hallazgos de inspección' },
    { from: 'No-Conformidades', to: 'Acciones Correctivas', action: 'Genera CA cuando NC es aprobada' },
    { from: 'Acciones Correctivas', to: 'Documentos HSE', action: 'Vincula evidencia y planes de acción' },
    { from: 'Todas las áreas', to: 'Calendario', action: 'Sincronización de eventos y hitos' },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Módulos del Área
          </CardTitle>
          <CardDescription>
            Módulos operacionales de Sostenibilidad
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {modules.map((module) => (
              <Link key={module.name} href={module.path}>
                <div className="p-4 border border-border rounded-lg hover:bg-muted transition cursor-pointer">
                  <h3 className="font-semibold text-sm text-foreground">{module.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Ver módulo</p>
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
            Flujos entre Módulos
          </CardTitle>
          <CardDescription>
            Cómo se conectan los módulos del área de Sostenibilidad
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {connections.map((connection, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">{connection.from}</Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="outline" className="text-xs">{connection.to}</Badge>
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
