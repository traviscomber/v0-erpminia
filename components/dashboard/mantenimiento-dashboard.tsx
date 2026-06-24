'use client';

import Link from 'next/link';
import { AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMantenimientoOrdenes } from '@/hooks/use-module-apis';

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    pendiente: 'Pendiente',
    en_progreso: 'En progreso',
    completado: 'Completada',
    open: 'Abierta',
    pending: 'Pendiente',
    in_progress: 'En progreso',
    completed: 'Completada',
  };

  return labels[status] || status;
}

function priorityLabel(priority: string) {
  const labels: Record<string, string> = {
    urgente: 'Urgente',
    critical: 'Critica',
    alta: 'Alta',
    high: 'Alta',
    media: 'Media',
    medium: 'Media',
    baja: 'Baja',
    low: 'Baja',
  };

  return labels[priority] || priority;
}

function priorityVariant(priority: string) {
  if (priority === 'urgente' || priority === 'critical') return 'destructive' as const;
  if (priority === 'alta' || priority === 'high') return 'secondary' as const;
  return 'outline' as const;
}

export function MantenimientoDashboard() {
  const { ordenes, isLoading, error, mutate } = useMantenimientoOrdenes();

  if (error) {
    return <div className="text-lg font-semibold text-destructive">Error cargando ordenes</div>;
  }

  if (isLoading) {
    return <div>Cargando...</div>;
  }

  const pendientes = ordenes.filter((o) => o.status === 'pendiente' || o.status === 'open' || o.status === 'pending').length;
  const enProgreso = ordenes.filter((o) => o.status === 'en_progreso' || o.status === 'in_progress').length;
  const completadas = ordenes.filter((o) => o.status === 'completado' || o.status === 'completed').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mantenimiento</h1>
          <p className="text-muted-foreground">Gestion simple de ordenes de trabajo</p>
        </div>
        <Button size="sm" onClick={() => mutate()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">{pendientes}</div>
            <p className="text-xs text-muted-foreground">Ordenes por iniciar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">En progreso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-500">{enProgreso}</div>
            <p className="text-xs text-muted-foreground">Trabajos activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Completadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">{completadas}</div>
            <p className="text-xs text-muted-foreground">Trabajos cerrados</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/90">
        <CardHeader>
          <CardTitle>Siguiente paso</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Button asChild className="justify-between">
              <Link href="/dashboard/work-orders/create">
                Crear orden de trabajo
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/mantenimiento/vehiculos">
                Ver vehiculos
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/mantenimiento/centro-costo">
                Ver por centro de costo
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/mantenimiento/documentos">
                Revisar documentos
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ordenes de trabajo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {ordenes.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                No hay ordenes registradas todavia.
              </div>
            ) : (
              ordenes.map((orden) => (
                <div key={orden.id} className="flex items-start justify-between gap-4 rounded-lg border border-border bg-background p-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground">
                      {orden.code} - {orden.title}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{orden.description}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Badge variant={priorityVariant(orden.priority)}>{priorityLabel(orden.priority)}</Badge>
                    <span className="text-xs text-muted-foreground">{statusLabel(orden.status)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
