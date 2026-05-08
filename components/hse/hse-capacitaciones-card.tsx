import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Clock, CheckCircle2 } from 'lucide-react';

interface HSECapacitacion {
  id: string;
  nombre: string;
  tipo: string;
  fecha_programada: string;
  duracion_horas: number;
  proveedor?: string;
  estado: 'programada' | 'realizada' | 'cancelada';
  asistentes_count?: number;
  cargos_aplica?: string;
}

const estadoColores = {
  programada: 'bg-blue-100 text-blue-800',
  realizada: 'bg-green-100 text-green-800',
  cancelada: 'bg-red-100 text-red-800',
};

export function HSECapacitacionesCard({ capacitaciones }: { capacitaciones: HSECapacitacion[] }) {
  const proximas = capacitaciones.filter((c) => {
    const fecha = new Date(c.fecha_programada);
    const hoy = new Date();
    return fecha >= hoy && c.estado === 'programada';
  });

  const proxima = proximas.length > 0 ? proximas[0] : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Capacitaciones
        </CardTitle>
        <CardDescription>{capacitaciones.length} capacitaciones registradas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {proxima && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm font-semibold text-blue-900 mb-1">Próxima Capacitación</p>
            <p className="text-sm font-bold text-blue-800">{proxima.nombre}</p>
            <p className="text-xs text-blue-700 mt-1">
              {new Date(proxima.fecha_programada).toLocaleDateString('es-CL', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </p>
          </div>
        )}

        <div className="space-y-2">
          {capacitaciones.slice(0, 5).map((cap) => (
            <div key={cap.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-sm">{cap.nombre}</h4>
                  <p className="text-xs text-muted-foreground">{cap.proveedor || 'Interno'}</p>
                </div>
                <Badge className={estadoColores[cap.estado]}>{cap.estado}</Badge>
              </div>

              <div className="flex gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {cap.duracion_horas}h
                </div>
                {cap.asistentes_count !== undefined && (
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {cap.asistentes_count} asistentes
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                {new Date(cap.fecha_programada).toLocaleDateString('es-CL')}
              </p>
            </div>
          ))}
        </div>

        {capacitaciones.length > 5 && (
          <Button variant="outline" className="w-full" size="sm">
            Ver todas ({capacitaciones.length})
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
