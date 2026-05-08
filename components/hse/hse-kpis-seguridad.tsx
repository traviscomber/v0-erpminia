import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

export function HSEKPIsSeguridad({ kpis, meta_iirl = 1.0 }: { kpis: KPISeguridadProps[]; meta_iirl?: number }) {
  const ultimoMes = kpis[kpis.length - 1] || {};
  const mesPrevio = kpis[kpis.length - 2] || {};

  const cambioIirl = ultimoMes.iirl - mesPrevio.iirl;
  const esBien = cambioIirl < 0; // Menor es mejor

  return (
    <Card>
      <CardHeader>
        <CardTitle>Indicadores de Seguridad</CardTitle>
        <CardDescription>Tendencias últimos 12 meses</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {ultimoMes.iirl > meta_iirl && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              IIRL por encima de meta (Actual: {ultimoMes.iirl}, Meta: {meta_iirl})
            </AlertDescription>
          </Alert>
        )}

        {/* Main KPIs */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 rounded p-3">
            <p className="text-xs text-muted-foreground mb-1">IIRL (Índice)</p>
            <div className="flex items-end justify-between">
              <p className="font-bold text-lg">{ultimoMes.iirl?.toFixed(2) || '-'}</p>
              <div
                className={`flex items-center gap-1 text-xs ${esBien ? 'text-green-600' : 'text-red-600'}`}
              >
                {esBien ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                {Math.abs(cambioIirl).toFixed(2)}
              </div>
            </div>
          </div>

          <div className="bg-orange-50 rounded p-3">
            <p className="text-xs text-muted-foreground mb-1">ODI (Índice)</p>
            <p className="font-bold text-lg">{ultimoMes.odi?.toFixed(2) || '-'}</p>
          </div>

          <div className="bg-green-50 rounded p-3">
            <p className="text-xs text-muted-foreground mb-1">Días sin Accidentes</p>
            <p className="font-bold text-lg">{ultimoMes.dias_sin_accidentes || '0'}</p>
          </div>

          <div className="bg-purple-50 rounded p-3">
            <p className="text-xs text-muted-foreground mb-1">Tasa Frecuencia</p>
            <p className="font-bold text-lg">{ultimoMes.tasa_frecuencia?.toFixed(1) || '-'}</p>
          </div>
        </div>

        {/* Trend Chart */}
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
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="dias_sin_accidentes"
                  stroke="#10b981"
                  name="Días Sin Accidentes"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
