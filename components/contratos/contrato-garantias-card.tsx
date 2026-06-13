import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Clock } from 'lucide-react';

interface ContratoGarantia {
  id: string;
  hito_id: string;
  porcentaje_retencion: number;
  monto_retenido: number;
  fecha_vencimiento: string;
  estado: 'retenida' | 'devuelta' | 'vencida';
  fecha_devolucion: string;
  notas: string;
}

export function ContratoGarantiasCard({ garantias }: { garantias: ContratoGarantia[] }) {
  const garantiasVencidas = garantias.filter((g) => g.estado === 'vencida');
  const garantiasPorVencer = garantias.filter((g) => {
    const vencimiento = new Date(g.fecha_vencimiento);
    const hoy = new Date();
    const diasRestantes = Math.floor((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    return diasRestantes > 0 && diasRestantes <= 30 && g.estado === 'retenida';
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Garantías Retendidas</CardTitle>
        <CardDescription>{garantias.length} garantías registradas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {garantiasVencidas.length > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {garantiasVencidas.length} garantía(s) vencida(s) - Requiere acción inmediata
            </AlertDescription>
          </Alert>
        )}

        {garantiasPorVencer.length > 0 && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <Clock className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              {garantiasPorVencer.length} garantía(s) vencen en próximos 30 días
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {garantias.map((garantia) => (
            <div key={garantia.id} className="border rounded-lg p-3">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold">Retención {garantia.porcentaje_retencion}%</p>
                  <p className="text-sm text-muted-foreground">
                    {new Intl.NumberFormat('es-CL', {
                      style: 'currency',
                      currency: 'CLP',
                      minimumFractionDigits: 0,
                    }).format(garantia.monto_retenido)}
                  </p>
                </div>
                <Badge
                  variant={
                    garantia.estado === 'vencida'
                      ? 'destructive'
                      : garantia.estado === 'devuelta'
                        ? 'secondary'
                        : 'outline'
                  }
                >
                  {garantia.estado}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Vencimiento: {new Date(garantia.fecha_vencimiento).toLocaleDateString('es-CL')}
              </p>
              {garantia.notas && <p className="text-sm mt-2 text-muted-foreground italic">{garantia.notas}</p>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
