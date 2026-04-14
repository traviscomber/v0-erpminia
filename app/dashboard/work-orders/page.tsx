'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Edit,
  Eye,
  Wrench,
  Filter,
} from 'lucide-react';

export default function WorkOrdersPage() {
  const workOrders = [
    {
      id: 'WO-2024-001',
      title: 'Revisión pala excavadora 4',
      type: 'preventivo',
      priority: 'alta',
      status: 'en_progreso',
      assignee: 'Carlos Mendoza',
      site: 'Faena Central',
      dueDate: '2026-04-15',
      progress: 65,
    },
    {
      id: 'WO-2024-002',
      title: 'Reparación compresor zona B',
      type: 'correctivo',
      priority: 'crítica',
      status: 'pendiente',
      assignee: 'Roberto Silva',
      site: 'Faena Antacaña',
      dueDate: '2026-04-14',
      progress: 0,
    },
    {
      id: 'WO-2024-003',
      title: 'Cambio aceite bomba hidráulica',
      type: 'preventivo',
      priority: 'media',
      status: 'completada',
      assignee: 'Miguel Torres',
      site: 'Faena Central',
      dueDate: '2026-04-12',
      progress: 100,
    },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'completada':
        return 'bg-accent/10 text-accent';
      case 'en_progreso':
        return 'bg-primary/10 text-primary';
      case 'pendiente':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted/50 text-muted-foreground';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'crítica':
        return 'border-destructive/50 bg-destructive/5';
      case 'alta':
        return 'border-orange-500/50 bg-orange-500/5';
      default:
        return 'border-border';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Órdenes de Trabajo</h1>
          <p className="text-muted-foreground">Gestión de mantenimiento con sistema jerárquico por componentes</p>
        </div>
        <Link href="/dashboard/work-orders/create">
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> Crear Nueva Orden
          </Button>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-3xl font-bold text-primary mt-2">247</p>
              </div>
              <Wrench className="h-8 w-8 text-primary opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En Progreso</p>
                <p className="text-3xl font-bold text-primary mt-2">12</p>
              </div>
              <Clock className="h-8 w-8 text-primary opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Críticas</p>
                <p className="text-3xl font-bold text-destructive mt-2">3</p>
              </div>
              <AlertCircle className="h-8 w-8 text-destructive opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completadas</p>
                <p className="text-3xl font-bold text-accent mt-2">142</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-accent opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filtrar
        </Button>
      </div>

      {/* Work Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Órdenes Activas</CardTitle>
          <CardDescription>Tareas de mantenimiento en progreso o pendientes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {workOrders.map((wo) => (
              <Link key={wo.id} href={`/dashboard/work-orders/${wo.id}`}>
                <div
                  className={`border-2 ${getPriorityColor(wo.priority)} rounded-lg p-4 hover:bg-muted/30 transition-colors cursor-pointer`}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                          {wo.id}
                        </code>
                        <Badge className={getStatusColor(wo.status)} variant="outline">
                          {wo.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <Badge variant="outline">{wo.type.toUpperCase()}</Badge>
                      </div>
                      <h3 className="font-semibold">{wo.title}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span>{wo.site}</span>
                        <span>Asignado: {wo.assignee}</span>
                        <span>Vence: {new Date(wo.dueDate).toLocaleDateString('es-CL')}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${wo.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{wo.progress}% completado</p>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
