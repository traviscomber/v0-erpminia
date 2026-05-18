'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Zap, Database, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface ModuleStatus {
  name: string;
  path: string;
  count: number;
  status: 'active' | 'pending' | 'alert';
  lastUpdated: string;
}

interface ConnectionFlow {
  from: string;
  to: string;
  action: string;
  automated: boolean;
}

export function SustainabilityModuleConnections() {
  const modules: ModuleStatus[] = [
    {
      name: 'Inspecciones',
      path: '/dashboard/sostenibilidad/prevencion-riesgos/inspecciones-internas',
      count: 12,
      status: 'active',
      lastUpdated: 'Hace 2 horas',
    },
    {
      name: 'No-Conformidades',
      path: '/dashboard/sostenibilidad/no-conformidades',
      count: 8,
      status: 'active',
      lastUpdated: 'Hace 45 min',
    },
    {
      name: 'Acciones Correctivas',
      path: '/dashboard/sostenibilidad',
      count: 5,
      status: 'pending',
      lastUpdated: 'Hace 1 hora',
    },
    {
      name: 'Documentos',
      path: '/dashboard/sostenibilidad/documentos-flujo',
      count: 3,
      status: 'active',
      lastUpdated: 'Hace 30 min',
    },
  ];

  const connections: ConnectionFlow[] = [
    {
      from: 'Inspecciones',
      to: 'No-Conformidades',
      action: 'Auto-genera NC desde hallazgos',
      automated: true,
    },
    {
      from: 'No-Conformidades',
      to: 'Acciones Correctivas',
      action: 'Auto-genera CA cuando NC es aprobada',
      automated: true,
    },
    {
      from: 'Acciones Correctivas',
      to: 'Documentos',
      action: 'Vincula evidencia y planes de acción',
      automated: true,
    },
    {
      from: 'Todas',
      to: 'Calendario',
      action: 'Sincronización de eventos y hitos',
      automated: true,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-secondary/10 border-secondary text-secondary';
      case 'pending':
        return 'bg-primary/10 border-primary text-primary';
      case 'alert':
        return 'bg-destructive/10 border-destructive text-destructive';
      default:
        return 'bg-muted/10 border-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return '✓';
      case 'pending':
        return '⏳';
      case 'alert':
        return '⚠';
      default:
        return '○';
    }
  };

  return (
    <div className="space-y-6">
      {/* Modules Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Módulos Conectados
          </CardTitle>
          <CardDescription>
            Estado en tiempo real de todos los módulos de sostenibilidad
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {modules.map((module) => (
              <Link key={module.name} href={module.path}>
                <div
                  className={`p-4 border rounded-lg transition hover:shadow-md cursor-pointer ${getStatusColor(
                    module.status
                  )}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-sm">{module.name}</h3>
                    <span className="text-lg">{getStatusIcon(module.status)}</span>
                  </div>
                  <p className="text-2xl font-bold mb-2">{module.count}</p>
                  <p className="text-xs text-muted-foreground">{module.lastUpdated}</p>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Connections Flow */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Flujos Automatizados
          </CardTitle>
          <CardDescription>
            Conexiones automáticas entre módulos y acciones desencadenadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {connections.map((connection, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
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
                {connection.automated && (
                  <Badge className="bg-secondary text-secondary-foreground">
                    Automático
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Real-time Sync Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Estado de Sincronización
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between p-2 bg-secondary/10 rounded">
              <span>Sincronización de Calendario</span>
              <Badge className="bg-secondary text-secondary-foreground">Activo</Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-secondary/10 rounded">
              <span>Event Log (Auditoría)</span>
              <Badge className="bg-secondary text-secondary-foreground">Activo</Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-secondary/10 rounded">
              <span>Alertas de Incumplimiento</span>
              <Badge className="bg-secondary text-secondary-foreground">Activo</Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-primary/10 rounded">
              <span>Webhooks (Slack/Email)</span>
              <Badge variant="outline">Pendiente</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
