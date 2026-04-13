'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Zap,
  MapPin,
  Users,
  Wrench,
  TrendingDown,
  RefreshCw,
} from 'lucide-react';

// Trust markers component
function TrustMarkers() {
  return (
    <div className="flex flex-wrap gap-4 text-xs font-medium">
      <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-accent/10 text-accent">
        <Zap className="w-3 h-3" />
        <span>Producción</span>
      </div>
      <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary">
        <MapPin className="w-3 h-3" />
        <span>Faena Central</span>
      </div>
      <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-secondary/10 text-secondary-foreground">
        <Clock className="w-3 h-3" />
        <span>Turno 1 (06:00-14:00)</span>
      </div>
      <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-muted text-muted-foreground">
        <RefreshCw className="w-3 h-3" />
        <span>Sincronizado hace 2 min</span>
      </div>
    </div>
  );
}

// Status strip - critical at-a-glance view
function StatusStrip() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Active Incidents */}
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-muted-foreground">INCIDENTES ACTIVOS</p>
            <p className="text-2xl font-bold text-destructive mt-1">3</p>
            <p className="text-xs text-muted-foreground mt-1">2 críticos, 1 en proceso</p>
          </div>
        </CardContent>
      </Card>

      {/* Delayed Work Orders */}
      <Card className="border-yellow-600/30 bg-yellow-600/5">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-muted-foreground">ÓRDENES ATRASADAS</p>
            <p className="text-2xl font-bold text-yellow-600 mt-1">5</p>
            <p className="text-xs text-muted-foreground mt-1">Promedio 3.2 hrs retraso</p>
          </div>
        </CardContent>
      </Card>

      {/* Equipment Unavailable */}
      <Card className="border-orange-600/30 bg-orange-600/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Wrench className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-muted-foreground">EQUIPOS FUERA</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">2</p>
            <p className="text-xs text-muted-foreground mt-1">Excavadora 4, Pala 12</p>
          </div>
        </CardContent>
      </Card>

      {/* Pending Approvals */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Clock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-muted-foreground">APROBACIONES</p>
            <p className="text-2xl font-bold text-primary mt-1">7</p>
            <p className="text-xs text-muted-foreground mt-1">4 hoy, 3 mañana</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Critical tasks panel
function CriticalTasksPanel() {
  const tasks = [
    {
      id: 1,
      title: 'Revisión pre-turno Excavadora 4',
      owner: 'Carlos Meneses',
      site: 'Faena Central',
      dueTime: '06:30',
      priority: 'critica',
      status: 'pendiente',
    },
    {
      id: 2,
      title: 'Inspección seguridad área norte',
      owner: 'María González',
      site: 'Faena Central',
      dueTime: '08:00',
      priority: 'alta',
      status: 'en_progreso',
    },
    {
      id: 3,
      title: 'Cambio de aceite Pala 12',
      owner: 'Roberto Silva',
      site: 'Faena Central',
      dueTime: '10:00',
      priority: 'alta',
      status: 'pendiente',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-destructive" />
              Tareas Críticas Hoy
            </CardTitle>
            <CardDescription>3 tareas que requieren atención inmediata</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            + Crear Tarea
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-sm">{task.title}</p>
                  {task.priority === 'critica' && (
                    <Badge className="bg-destructive text-white text-xs">Crítica</Badge>
                  )}
                  {task.priority === 'alta' && (
                    <Badge className="bg-orange-600 text-white text-xs">Alta</Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {task.owner}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {task.site}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Vence {task.dueTime}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {task.status === 'en_progreso' && (
                  <Badge variant="outline" className="text-primary">
                    En Curso
                  </Badge>
                )}
                {task.status === 'pendiente' && (
                  <Badge variant="outline" className="text-muted-foreground">
                    Pendiente
                  </Badge>
                )}
                <Button variant="ghost" size="sm">
                  Actuar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Shift status by site
function ShiftStatus() {
  const sites = [
    {
      id: 1,
      name: 'Faena Central',
      shift: 'Turno 1',
      active: true,
      crew: 24,
      equipment: 8,
      incidents: 0,
      efficiency: 94,
    },
    {
      id: 2,
      name: 'Faena Norte',
      shift: 'Turno 1',
      active: true,
      crew: 18,
      equipment: 5,
      incidents: 1,
      efficiency: 87,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estado Operacional por Sitio</CardTitle>
        <CardDescription>Resumen de operaciones activas</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sites.map((site) => (
            <div key={site.id} className="p-3 rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium">{site.name}</p>
                  <p className="text-xs text-muted-foreground">{site.shift}</p>
                </div>
                <Badge className="bg-accent">Activo</Badge>
              </div>
              <div className="grid grid-cols-4 gap-2 text-sm">
                <div className="text-center">
                  <p className="text-lg font-bold">{site.crew}</p>
                  <p className="text-xs text-muted-foreground">Personal</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{site.equipment}</p>
                  <p className="text-xs text-muted-foreground">Equipos</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-yellow-600">{site.incidents}</p>
                  <p className="text-xs text-muted-foreground">Incidentes</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-accent">{site.efficiency}%</p>
                  <p className="text-xs text-muted-foreground">Eficiencia</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header with trust markers */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Dashboard Operacional</h1>
        <p className="text-muted-foreground mb-4">
          Estado en tiempo real de operaciones mineras
        </p>
        <TrustMarkers />
      </div>

      {/* Critical status strip */}
      <StatusStrip />

      {/* Critical tasks and shift status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CriticalTasksPanel />
        </div>
        <div>
          <ShiftStatus />
        </div>
      </div>
    </div>
  );
}
