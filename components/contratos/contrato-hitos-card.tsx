import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Clock, CheckCircle2, XCircle } from 'lucide-react';

interface ContratoHito {
  id: string;
  hito_number: number;
  hito_name: string;
  monto_neto: number;
  monto_anticipo: number;
  fecha_programada: string;
  fecha_real: string;
  estado: 'pendiente' | 'parcial' | 'pagado';
  descripcion: string;
}

const statusColors = {
  pendiente: { badge: 'bg-yellow-100 text-yellow-800', icon: Clock, color: 'text-yellow-600' },
  parcial: { badge: 'bg-blue-100 text-blue-800', icon: Clock, color: 'text-blue-600' },
  pagado: { badge: 'bg-green-100 text-green-800', icon: CheckCircle2, color: 'text-green-600' },
};

export function ContratoHitosCard({ hitos }: { hitos: ContratoHito[] }) {
  if (!hitos || hitos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Hitos de Pago</CardTitle>
          <CardDescription>Sin hitos registrados</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hitos de Pago</CardTitle>
        <CardDescription>{hitos.length} hitos registrados</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hitos.map((hito) => {
          const StatusIcon = statusColors[hito.estado].icon;
          return (
            <div key={hito.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold flex items-center gap-2">
                    <StatusIcon className={`h-4 w-4 ${statusColors[hito.estado].color}`} />
                    Hito {hito.hito_number}: {hito.hito_name}
                  </h4>
                  {hito.descripcion && <p className="text-sm text-muted-foreground mt-1">{hito.descripcion}</p>}
                </div>
                <Badge className={statusColors[hito.estado].badge}>{hito.estado}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <p className="text-sm text-muted-foreground">Monto Neto</p>
                  <p className="font-semibold">
                    {new Intl.NumberFormat('es-CL', {
                      style: 'currency',
                      currency: 'CLP',
                      minimumFractionDigits: 0,
                    }).format(hito.monto_neto)}
                  </p>
                </div>
                {hito.monto_anticipo > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground">Anticipo</p>
                    <p className="font-semibold">
                      {new Intl.NumberFormat('es-CL', {
                        style: 'currency',
                        currency: 'CLP',
                        minimumFractionDigits: 0,
                      }).format(hito.monto_anticipo)}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 text-sm text-muted-foreground mt-2">
                <span>Programado: {new Date(hito.fecha_programada).toLocaleDateString('es-CL')}</span>
                {hito.fecha_real && <span>Realizado: {new Date(hito.fecha_real).toLocaleDateString('es-CL')}</span>}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
