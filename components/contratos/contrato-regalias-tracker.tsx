import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface RegaliaControl {
  propiedad: number;
  mes_ano: string;
  monto_bruto: number;
  monto_neto: number;
  monto_retenido: number;
  porcentaje_neto: number;
  estado: 'pendiente' | 'pagado';
}

export function ContratoRegaliasTracker({ regalias }: { regalias: RegaliaControl[] }) {
  const totalBruto = regalias.reduce((sum, r) => sum + r.monto_bruto, 0);
  const totalNeto = regalias.reduce((sum, r) => sum + r.monto_neto, 0);
  const totalRetenido = regalias.reduce((sum, r) => sum + r.monto_retenido, 0);

  const porPropiedad = regalias.reduce((acc, r) => {
    if (!acc[r.propiedad]) acc[r.propiedad] = { neto: 0, retenido: 0, count: 0 };
    acc[r.propiedad].neto += r.monto_neto;
    acc[r.propiedad].retenido += r.monto_retenido;
    acc[r.propiedad].count += 1;
    return acc;
  }, {} as Record<number, any>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Control de Regalías/Arriendo
        </CardTitle>
        <CardDescription>Análisis por propiedad {regalias.length} registros</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-blue-50 rounded p-3">
            <p className="text-xs text-muted-foreground">Bruto Total</p>
            <p className="font-bold">CLP {(totalBruto / 1000000).toFixed(1)}M</p>
          </div>
          <div className="bg-green-50 rounded p-3">
            <p className="text-xs text-muted-foreground">Neto Pagado</p>
            <p className="font-bold">CLP {(totalNeto / 1000000).toFixed(1)}M</p>
          </div>
          <div className="bg-orange-50 rounded p-3">
            <p className="text-xs text-muted-foreground">Retenido</p>
            <p className="font-bold">CLP {(totalRetenido / 1000000).toFixed(1)}M</p>
          </div>
        </div>

        {/* By Property */}
        <div className="space-y-2">
          {Object.entries(porPropiedad).map(([prop, data]) => (
            <div key={prop} className="border rounded p-3">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold">Propiedad {prop}</h4>
                <Badge variant="outline">{data.count} periodos</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Neto</p>
                  <p className="font-semibold">CLP {(data.neto / 1000000).toFixed(1)}M</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Retención</p>
                  <p className="font-semibold">{((data.retenido / (data.neto + data.retenido)) * 100).toFixed(1)}%</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
