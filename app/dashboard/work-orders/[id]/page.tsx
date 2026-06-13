'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function WorkOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data } = useSWR(
    id ? `/api/maintenance/work-orders/${id}` : null,
    async (url: string) => {
      const res = await fetch(url);
      return res.ok ? res.json() : null;
    }
  );

  const workOrder = data.data;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{workOrder.work_order_number || 'Orden de trabajo'}</h1>
          <p className="text-muted-foreground">{workOrder.title || 'Cargando detalle de mantencion'}</p>
        </div>
        <Link href="/dashboard/work-orders">
          <Button variant="outline">Volver</Button>
        </Link>
      </div>

      {!workOrder && (
        <Card>
          <CardContent className="pt-6 text-muted-foreground">
            No se encontro informacion para esta orden de trabajo.
          </CardContent>
        </Card>
      )}

      {workOrder && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
              <CardDescription>Estado actual y datos principales</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <Badge variant="outline">{workOrder.status}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Prioridad</p>
                <p className="font-medium">{workOrder.priority || 'medium'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
                <p className="font-medium">{workOrder.work_type || 'preventive'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Activo</p>
                <p className="font-medium">{workOrder.asset_name || 'Sin activo asociado'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Asignado a</p>
                <p className="font-medium">{workOrder.assigned_to_name || 'Sin asignar'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha programada</p>
                <p className="font-medium">{workOrder.scheduled_date ? new Date(workOrder.scheduled_date).toLocaleDateString('es-CL') : 'Sin fecha'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Codigo activo</p>
                <p className="font-medium">{workOrder.asset_code || 'No disponible'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Horas planificadas</p>
                <p className="font-medium">{workOrder.planned_duration_hours || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Descripcion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">{workOrder.description || 'Sin descripcion adicional.'}</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Causa raiz</p>
                  <p className="font-medium">{workOrder.root_cause || 'No registrada'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Acciones preventivas</p>
                  <p className="font-medium">{workOrder.preventive_actions || 'No registradas'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
