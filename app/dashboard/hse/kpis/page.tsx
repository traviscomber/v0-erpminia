'use client';

import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';
import { HSEKPIsSeguridad } from '@/components/hse/hse-kpis-seguridad';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function HSEKPIsPage() {
  const { data: kpiData } = useSWR('/api/hse/kpis', fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 600000, // 10 minutos
  });

  const kpis = kpiData?.kpis || [];
  const ultimoMes = kpis[kpis.length - 1] || {};
  const mesPrevio = kpis[kpis.length - 2] || {};

  const cambioIirl = (ultimoMes.iirl || 0) - (mesPrevio.iirl || 0);
  const esBien = cambioIirl < 0;

  const metaIirl = 1.0;
  const cumpleMeta = (ultimoMes.iirl || 0) <= metaIirl;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">KPIs de Seguridad y Prevención</h1>
        <p className="text-muted-foreground">Indicadores de desempeño HSE últimos 12 meses</p>
      </div>

      {/* Alert Meta */}
      {!cumpleMeta && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            IIRL por encima de meta (Actual: {ultimoMes.iirl?.toFixed(2)}, Meta: {metaIirl})
          </AlertDescription>
        </Alert>
      )}

      {/* Main KPIs Chart */}
      <HSEKPIsSeguridad kpis={kpis} meta_iirl={metaIirl} />

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              Tasa de Accidentabilidad
              {cambioIirl < 0 && <TrendingDown className="h-4 w-4 text-green-600" />}
              {cambioIirl > 0 && <TrendingUp className="h-4 w-4 text-red-600" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{ultimoMes.tasa_accidentabilidad?.toFixed(1) || '-'}%</div>
            <p className="text-xs text-muted-foreground mt-1">Mes actual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Días Sin Accidentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{ultimoMes.dias_sin_accidentes || '0'}</div>
            <p className="text-xs text-muted-foreground mt-1">Marca actual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Tasa de Gravedad</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{ultimoMes.tasa_gravedad?.toFixed(2) || '-'}</div>
            <p className="text-xs text-muted-foreground mt-1">Días por lesión</p>
          </CardContent>
        </Card>
      </div>

      {/* Historical Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Comparativa Histórica (Últimos 6 Meses)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {kpis.slice(-6).map((mes: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded">
                <div>
                  <p className="font-semibold">{mes.mes}</p>
                  <p className="text-xs text-muted-foreground">IIRL: {mes.iirl?.toFixed(2)} | ODI: {mes.odi?.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  {mes.iirl <= metaIirl ? (
                    <Badge className="bg-green-100 text-green-800">Dentro de Meta</Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-800">Fuera de Meta</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Goals & Targets */}
      <Card>
        <CardHeader>
          <CardTitle>Objetivos y Metas 2024</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded">
              <div>
                <p className="font-semibold">IIRL Target</p>
                <p className="text-sm text-muted-foreground">Índice de Lesión Incapacitante</p>
              </div>
              <p className="font-bold text-lg">&lt; 1.0</p>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded">
              <div>
                <p className="font-semibold">Cero Accidentes</p>
                <p className="text-sm text-muted-foreground">Meta aspiracional</p>
              </div>
              <p className="font-bold text-lg">0</p>
            </div>
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded">
              <div>
                <p className="font-semibold">Cumplimiento Normativo</p>
                <p className="text-sm text-muted-foreground">SERNAGEOMIN, SUSESO</p>
              </div>
              <p className="font-bold text-lg">100%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
