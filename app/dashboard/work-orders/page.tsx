'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Clock, CheckCircle2, AlertCircle, Edit, Eye, Wrench, Filter } from 'lucide-react';

export default function WorkOrdersPage() {
  const { data } = useSWR('/api/maintenance/work-orders', async (url: string) => {
    const res = await fetch(url);
    return res.ok ? res.json() : null;
  });

  const workOrders = data?.workOrders || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-accent/10 text-accent';
      case 'in_progress':
        return 'bg-primary/10 text-primary';
      case 'open':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted/50 text-muted-foreground';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'border-destructive/50 bg-destructive/5';
      case 'high':
        return 'border-orange-500/50 bg-orange-500/5';
      default:
        return 'border-border';
    }
  };

  const inProgress = workOrders.filter((wo: any) => wo.status === 'in_progress').length;
  const critical = workOrders.filter((wo: any) => wo.priority === 'critical').length;
  const completed = workOrders.filter((wo: any) => wo.status === 'completed').length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Ordenes de Trabajo</h1>
          <p className="text-muted-foreground">Gestion de mantenimiento y seguimiento operativo</p>
        </div>
        <Link href="/dashboard/work-orders/create">
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> Crear Nueva Orden
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-3xl font-bold text-primary mt-2">{workOrders.length}</p>
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
                <p className="text-3xl font-bold text-primary mt-2">{inProgress}</p>
              </div>
              <Clock className="h-8 w-8 text-primary opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Criticas</p>
                <p className="text-3xl font-bold text-destructive mt-2">{critical}</p>
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
                <p className="text-3xl font-bold text-accent mt-2">{completed}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-accent opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" /> Filtrar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ordenes Activas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {workOrders.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
                No hay ordenes de trabajo registradas todavia
              </div>
            )}
            {workOrders.map((wo: any) => (
              <Link key={wo.id} href={`/dashboard/work-orders/${wo.id}`}>
                <div className={`border-2 ${getPriorityColor(wo.priority)} rounded-lg p-4 hover:bg-muted/30 transition-colors cursor-pointer`}>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-xs font-mono bg-muted px-2 py-1 rounded">{wo.work_order_number}</code>
                        <Badge className={getStatusColor(wo.status)} variant="outline">{String(wo.status).replace('_', ' ').toUpperCase()}</Badge>
                        <Badge variant="outline">{String(wo.work_type || 'preventive').toUpperCase()}</Badge>
                      </div>
                      <h3 className="font-semibold">{wo.title}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span>{wo.asset_name || 'Activo no asociado'}</span>
                        <span>Asignado: {wo.assigned_to_name || 'Sin asignar'}</span>
                        <span>Vence: {wo.scheduled_date ? new Date(wo.scheduled_date).toLocaleDateString('es-CL') : 'Sin fecha'}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${wo.progress_percentage || 0}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{wo.progress_percentage || 0}% completado</p>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
