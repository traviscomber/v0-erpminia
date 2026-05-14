'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BrandCard } from '@/components/ui/brand-card';
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Eye,
  Plus,
  Zap,
  MapPin,
  Users,
  Wrench,
  RefreshCw,
  BookOpen,
  HelpCircle,
  Shield,
  FolderOpen,
} from 'lucide-react';

interface CriticalTask {
  id: string;
  title: string;
  site: string;
  assigned_to: string;
  due_time: string;
  priority: 'critical' | 'high' | 'medium';
  type: 'incident' | 'approval' | 'task' | 'delay';
}

export default function DashboardPage() {
  const [tasks] = useState<CriticalTask[]>([
    {
      id: '1',
      title: 'Equipo excavadora sin mantenimiento hace 30 días',
      site: 'Faena Mapocho',
      assigned_to: 'Carlos Mendoza',
      due_time: 'Hoy 14:00',
      priority: 'critical',
      type: 'incident',
    },
    {
      id: '2',
      title: 'Aprobación de orden de compra emergencia',
      site: 'Central',
      assigned_to: 'Juan López',
      due_time: 'Pendiente desde ayer',
      priority: 'high',
      type: 'approval',
    },
    {
      id: '3',
      title: 'Inspección HSE retrasada - región norte',
      site: 'Faena Antacaña',
      assigned_to: 'María García',
      due_time: 'Hace 2 días',
      priority: 'high',
      type: 'delay',
    },
  ]);

  const statusIndicators = [
    {
      label: 'Incidentes Hoy',
      value: '3',
      status: 'critical',
      icon: AlertCircle,
    },
    {
      label: 'Aprobaciones Pendientes',
      value: '2',
      status: 'warning',
      icon: Clock,
    },
    {
      label: 'Equipos en Mantención',
      value: '5',
      status: 'info',
      icon: AlertTriangle,
    },
    {
      label: 'Tasks Completadas Hoy',
      value: '14',
      status: 'success',
      icon: CheckCircle2,
    },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'high':
        return 'bg-primary/10 text-primary border-primary/20';
      default:
        return 'bg-muted text-muted-foreground border-muted';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical':
        return 'text-destructive';
      case 'warning':
        return 'text-primary';
      case 'info':
        return 'text-muted-foreground';
      case 'success':
        return 'text-secondary';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header with trust markers */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Centro de Operaciones</h1>
        <p className="text-muted-foreground mt-2">
          Visión en tiempo real de incidentes, aprobaciones y estado operacional
        </p>
        {/* Trust markers */}
        <div className="flex flex-wrap gap-3 mt-4">
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium">
            <Zap className="w-3 h-3" />
            <span>Producción</span>
          </div>
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <MapPin className="w-3 h-3" />
            <span>Faena Central</span>
          </div>
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-secondary/10 text-secondary-foreground text-xs font-medium">
            <Clock className="w-3 h-3" />
            <span>Turno 1 (06:00-14:00)</span>
          </div>
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
            <RefreshCw className="w-3 h-3" />
            <span>Sincronizado hace 2 min</span>
          </div>
        </div>
      </div>

      {/* Educational Info Card */}
      <BrandCard>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[var(--brand-naranja)]" />
            ¿Necesitas ayuda?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            ERP SegurIA tiene guías paso a paso para cada función. Aprende cómo crear órdenes de trabajo, usar el árbol de fallas y gestionar inventario.
          </p>
          <Link href="/dashboard/guias">
            <Button variant="outline" size="sm" className="gap-2 border-[var(--brand-naranja)] text-[var(--brand-naranja)] hover:bg-[var(--brand-naranja)]/10">
              <HelpCircle className="h-4 w-4" />
              Ver Guías Educativas
            </Button>
          </Link>
        </CardContent>
      </BrandCard>

      {/* Status Indicators Strip - 4 KPIs only */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statusIndicators.map((indicator, idx) => {
          const Icon = indicator.icon;
          return (
            <Card key={idx} className="border-border">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">
                      {indicator.label}
                    </p>
                    <p className={`text-3xl font-bold mt-2 ${getStatusColor(indicator.status)}`}>
                      {indicator.value}
                    </p>
                  </div>
                  <Icon className={`h-8 w-8 ${getStatusColor(indicator.status)} opacity-60`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Critical Tasks Panel */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Tareas Críticas de Hoy
              </CardTitle>
              <CardDescription>Acciones inmediatas requeridas</CardDescription>
            </div>
            <Link href="/dashboard/alertas">
              <Button variant="outline" size="sm" className="gap-2 bg-[var(--brand-verde)] text-white hover:bg-[var(--brand-verde)]/90 border-0">
                Ver todas
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 mx-auto text-accent opacity-50 mb-4" />
              <p className="text-muted-foreground">No hay tareas críticas pendientes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start justify-between p-4 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <Badge className={getPriorityColor(task.priority)} variant="outline">
                        {task.priority.toUpperCase()}
                      </Badge>
                      <div>
                        <p className="font-medium leading-tight">{task.title}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {task.site}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {task.assigned_to}
                          </span>
                          <span className="font-semibold text-destructive flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {task.due_time}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Modules Quick Access */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Nuevos Módulos Operacionales</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link href="/dashboard/produccion">
            <BrandCard className="cursor-pointer hover:shadow-lg transition-shadow h-full">
              <CardHeader>
                <Zap className="h-6 w-6 text-[var(--brand-naranja)] mb-2" />
                <CardTitle>Producción</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Monitoreo en tiempo real de equipos, sensores y KPIs operacionales
              </CardContent>
            </BrandCard>
          </Link>

          <Link href="/dashboard/hse">
            <BrandCard className="cursor-pointer hover:shadow-lg transition-shadow h-full">
              <CardHeader>
                <Shield className="h-6 w-6 text-[var(--brand-rojo)] mb-2" />
                <CardTitle>HSE & Compliance</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Gestión de seguridad, incidentes y cumplimiento normativo minero-ambiental
              </CardContent>
            </BrandCard>
          </Link>

          <Link href="/dashboard/documentos-gestion">
            <BrandCard className="cursor-pointer hover:shadow-lg transition-shadow h-full">
              <CardHeader>
                <FolderOpen className="h-6 w-6 text-[var(--brand-verde)] mb-2" />
                <CardTitle>Gestión Documental</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Centraliza contratos, procedimientos, reportes y documentos operacionales
              </CardContent>
            </BrandCard>
          </Link>

          <Link href="/dashboard/integracion-completa">
            <BrandCard className="cursor-pointer hover:shadow-lg transition-shadow h-full">
              <CardHeader>
                <RefreshCw className="h-6 w-6 text-primary mb-2" />
                <CardTitle>Integración</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Ver cómo los 5+ módulos trabajan en cascada automáticamente
              </CardContent>
            </BrandCard>
          </Link>
        </div>
      </div>

      {/* Quick Stats - Shift Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Estado Turno - Faena Mapocho</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Personal Presente</span>
              <span className="font-semibold">43 / 45</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Equipos Operacionales</span>
              <span className="font-semibold">18 / 20</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Producción vs Meta</span>
              <span className="font-semibold text-accent">98%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Alertas de Seguridad Última Hora</CardTitle>
          </CardHeader>
          <CardContent>
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <AlertTriangle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">Temperatura anómala en compresor</p>
                    <p className="text-xs text-muted-foreground mt-1">Reportado a las 11:45 - En revisión</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/10 border border-secondary/20 mt-3">
                  <CheckCircle2 className="h-5 w-5 text-secondary flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">Inspección zona A completada</p>
                    <p className="text-xs text-muted-foreground mt-1">Sin incidencias - 10:30</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>

      {/* Call to Action */}
      <div className="bg-muted/50 border border-border rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Crear nueva tarea o reporte</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Registra incidentes, work orders o solicitudes de aprobación rápidamente
            </p>
          </div>
          <Link href="/dashboard/crear-tarea">
            <Button className="gap-2 bg-[var(--brand-naranja)] hover:bg-[var(--brand-naranja)]/90">
              <Plus className="h-4 w-4" />
              Crear Tarea
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
