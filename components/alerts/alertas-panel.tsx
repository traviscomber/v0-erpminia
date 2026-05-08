import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface ContratoAlerta {
  id: string;
  tipo: string;
  titulo: string;
  descripcion?: string;
  severidad: 'baja' | 'media' | 'alta' | 'critica';
  fecha_alerta: string;
  fecha_vencimiento?: string;
  estado: 'activa' | 'resuelta' | 'ignorada';
  leida: boolean;
}

const severidadColores = {
  baja: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', badge: 'bg-blue-100 text-blue-800' },
  media: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', badge: 'bg-yellow-100 text-yellow-800' },
  alta: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', badge: 'bg-orange-100 text-orange-800' },
  critica: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', badge: 'bg-red-100 text-red-800' },
};

const tipoIconos = {
  vencimiento: AlertCircle,
  pago_rojo: AlertTriangle,
  garantia_vence: AlertTriangle,
  regalias_discrepancia: AlertTriangle,
  documento_vence: AlertCircle,
  capacitacion_vence: AlertCircle,
};

export function AlertasContratos({ alertas }: { alertas: ContratoAlerta[] }) {
  const alertasActivas = alertas.filter((a) => a.estado === 'activa');
  const alertasCriticas = alertasActivas.filter((a) => a.severidad === 'critica');
  const alertasAltas = alertasActivas.filter((a) => a.severidad === 'alta');

  return (
    <Card className="border-2 border-red-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          Alertas del Sistema
        </CardTitle>
        <CardDescription>
          {alertasCriticas.length} crítica(s), {alertasAltas.length} alta(s), {alertasActivas.length} total
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {alertasCriticas.length === 0 && alertasAltas.length === 0 && alertasActivas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Sin alertas activas - Sistema operacional normal</p>
          </div>
        ) : (
          alertasActivas.map((alerta) => {
            const IconoTipo = tipoIconos[alerta.tipo as keyof typeof tipoIconos] || AlertCircle;
            const colores = severidadColores[alerta.severidad];

            return (
              <div
                key={alerta.id}
                className={`${colores.bg} ${colores.border} border rounded-lg p-3 space-y-1 ${!alerta.leida ? 'ring-2 ring-offset-1 ring-red-400' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2 flex-1">
                    <IconoTipo className={`h-4 w-4 ${colores.text} flex-shrink-0 mt-0.5`} />
                    <div className="flex-1">
                      <p className={`font-semibold text-sm ${colores.text}`}>{alerta.titulo}</p>
                      {alerta.descripcion && (
                        <p className={`text-xs ${colores.text} opacity-80 mt-1`}>{alerta.descripcion}</p>
                      )}
                    </div>
                  </div>
                  <Badge className={colores.badge}>{alerta.severidad}</Badge>
                </div>

                <p className="text-xs text-muted-foreground">
                  {new Date(alerta.fecha_alerta).toLocaleDateString('es-CL')}
                  {alerta.fecha_vencimiento && ` - Vence: ${new Date(alerta.fecha_vencimiento).toLocaleDateString('es-CL')}`}
                </p>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
