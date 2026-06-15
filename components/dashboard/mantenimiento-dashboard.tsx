import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMantenimientoOrdenes } from '@/hooks/use-module-apis';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle } from 'lucide-react';

export function MantenimientoDashboard() {
  const { ordenes, isLoading, error, mutate } = useMantenimientoOrdenes();

  if (error) return <div className="text-red-500">Error cargando órdenes</div>;
  if (isLoading) return <div>Cargando...</div>;

  const pendientes = ordenes.filter(o => o.status === 'pendiente').length;
  const enProgreso = ordenes.filter(o => o.status === 'en_progreso').length;
  const completadas = ordenes.filter(o => o.status === 'completado').length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Mantenimiento</h1>
          <p className="text-muted-foreground">Gestión de órdenes de trabajo</p>
        </div>
        <Button size="sm" onClick={() => mutate()} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">{pendientes}</div>
            <p className="text-xs text-muted-foreground">Órdenes sin asignar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">En Progreso</CardTitle>
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
            <p className="text-xs text-muted-foreground">Trabajos finalizados</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Órdenes de Trabajo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {ordenes.map(orden => (
              <div key={orden.id} className="border rounded p-3 flex justify-between items-start">
                <div>
                  <div className="font-semibold">{orden.code} - {orden.title}</div>
                  <p className="text-sm text-muted-foreground">{orden.description}</p>
                </div>
                <Badge variant={orden.priority === 'urgente' ? 'destructive' : orden.priority === 'alta' ? 'secondary' : 'outline'}>
                  {orden.priority}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
