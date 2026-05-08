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
          EPP - Equipos Protección Personal
        </CardTitle>
        <CardDescription>{entregas.length} entregas registradas {cargo ? `(${cargo})` : ''}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingDevoluciones.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm font-semibold text-yellow-900">
              {pendingDevoluciones.length} devolución(es) pendiente(s)
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              Personal debe devolver equipo antiguo para recibir reemplazo
            </p>
          </div>
        )}

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {entregas.slice(0, 8).map((entrega) => (
            <div key={entrega.id} className="border rounded-lg p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="font-semibold text-sm">{entrega.personal_nombre}</p>
                  <p className="text-sm text-muted-foreground">{entrega.epp_elemento}</p>
                </div>
                <Badge className={estadoColores[entrega.estado_anterior]}>
                  {entrega.cantidad}x {entrega.estado_anterior}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-xs">
                <p className="text-muted-foreground">
                  Entregado: {new Date(entrega.fecha_entrega).toLocaleDateString('es-CL')}
                </p>
                {entrega.devolucion_requerida && !entrega.fecha_devolucion && (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                    Pendiente devolución
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>

        <Button className="w-full" size="sm" variant="outline">
          <Plus className="h-3 w-3 mr-1" />
          Nueva Entrega EPP
        </Button>
      </CardContent>
    </Card>
  );
}
