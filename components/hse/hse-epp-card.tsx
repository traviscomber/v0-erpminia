import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, Plus } from 'lucide-react';

interface HSEEPPEntrega {
  id: string;
  personal_nombre: string;
  epp_elemento: string;
  cantidad: number;
  fecha_entrega: string;
  estado_anterior: 'nuevo' | 'usado' | 'descarte';
  devolucion_requerida: boolean;
  fecha_devolucion?: string;
}

const estadoColores = {
  nuevo: 'bg-green-100 text-green-800',
  usado: 'bg-yellow-100 text-yellow-800',
  descarte: 'bg-red-100 text-red-800',
};

export function HSEEPPCard({ entregas, cargo }: { entregas: HSEEPPEntrega[]; cargo?: string }) {
  const pendingDevoluciones = entregas.filter((e) => e.devolucion_requerida && !e.fecha_devolucion);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          EPP - Equipos de Proteccion Personal
        </CardTitle>
        <CardDescription>{entregas.length} registros {cargo ? `(${cargo})` : ''}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingDevoluciones.length > 0 && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
            <p className="text-sm font-semibold text-yellow-900">
              {pendingDevoluciones.length} devolucion(es) pendiente(s)
            </p>
            <p className="mt-1 text-xs text-yellow-700">
              Hay entregas que todavia no cierran su devolucion anterior.
            </p>
          </div>
        )}

        <div className="max-h-64 space-y-2 overflow-y-auto">
          {entregas.slice(0, 8).map((entrega) => (
            <div key={entrega.id} className="rounded-lg border p-3">
              <div className="mb-2 flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold">{entrega.personal_nombre}</p>
                  <p className="text-sm text-muted-foreground">{entrega.epp_elemento}</p>
                </div>
                <Badge className={estadoColores[entrega.estado_anterior]}>
                  {entrega.cantidad}x {entrega.estado_anterior}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-xs">
                <p className="text-muted-foreground">
                  Actualizado: {new Date(entrega.fecha_entrega).toLocaleDateString('es-CL')}
                </p>
                {entrega.devolucion_requerida && !entrega.fecha_devolucion && (
                  <Badge variant="outline" className="border-red-300 bg-red-50 text-red-700">
                    Pendiente devolucion
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>

        <Button className="w-full" size="sm" variant="outline">
          <Plus className="mr-1 h-3 w-3" />
          Nuevo registro EPP
        </Button>
      </CardContent>
    </Card>
  );
}
