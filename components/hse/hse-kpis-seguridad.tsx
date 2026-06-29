import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface KPISeguridadProps {
  mes: string;
  tasa_accidentabilidad: number;
  tasa_frecuencia: number;
  tasa_gravedad: number;
  iirl: number;
  odi: number;
  dias_sin_accidentes: number;
}

type KPIHistorico = Partial<KPISeguridadProps> & {
  mes?: string;
};

function toNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function formatNumber(value: unknown, digits: number, fallback = '-') {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : fallback;
}

export function HSEKPIsSeguridad({ kpis, meta_iirl = 1.0 }: { kpis: KPISeguridadProps[]; meta_iirl: number }) {
  const ultimoMes: KPIHistorico = kpis[kpis.length - 1] || {};
  const mesPrevio: KPIHistorico = kpis[kpis.length - 2] || {};

  const ultimoIirl = toNumber(ultimoMes.iirl);
  const previoIirl = toNumber(mesPrevio.iirl);
  const cambioIirl = ultimoIirl - previoIirl;
  const esBien = cambioIirl < 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Indicadores de seguridad</CardTitle>
        <CardDescription>Tendencias de los ultimos 12 meses</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {ultimoIirl > meta_iirl && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              IIRL por encima de meta (Actual: {formatNumber(ultimoMes.iirl, 2, '0.00')}, Meta: {meta_iirl})
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded bg-blue-50 p-3">
            <p className="mb-1 text-xs text-muted-foreground">IIRL (indice)</p>
            <div className="flex items-end justify-between">
              <p className="text-lg font-bold">{formatNumber(ultimoMes.iirl, 2)}</p>
              <div className={`flex items-center gap-1 text-xs ${esBien ? 'text-green-600' : 'text-red-600'}`}>
                {esBien ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                {Math.abs(cambioIirl).toFixed(2)}
              </div>
            </div>
          </div>

          <div className="rounded bg-orange-50 p-3">
            <p className="mb-1 text-xs text-muted-foreground">ODI (indice)</p>
            <p className="text-lg font-bold">{formatNumber(ultimoMes.odi, 2)}</p>
          </div>

          <div className="rounded bg-green-50 p-3">
            <p className="mb-1 text-xs text-muted-foreground">Dias sin accidentes</p>
            <p className="text-lg font-bold">{toNumber(ultimoMes.dias_sin_accidentes, 0)}</p>
          </div>

          <div className="rounded bg-purple-50 p-3">
            <p className="mb-1 text-xs text-muted-foreground">Tasa frecuencia</p>
            <p className="text-lg font-bold">{formatNumber(ultimoMes.tasa_frecuencia, 1)}</p>
          </div>
        </div>

        {kpis.length > 0 && (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={kpis}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line yAxisId="left" type="monotone" dataKey="iirl" stroke="#8b5cf6" name="IIRL" strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="dias_sin_accidentes" stroke="#10b981" name="Dias sin accidentes" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
