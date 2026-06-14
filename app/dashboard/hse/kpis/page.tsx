'use client';

import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';
import { HSEKPIsSeguridad } from '@/components/hse/hse-kpis-seguridad';

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('No se pudieron cargar los KPIs HSE');
  }
  return response.json();
};

export default function HSEKPIsPage() {
  const { data, error, isLoading } = useSWR('/api/hse/kpis', fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 600000,
  });

  if (error) {
    return <div className="text-red-500">Error al cargar KPIs HSE.</div>;
  }

  if (isLoading) {
    return <div className="text-gray-500">Cargando KPIs HSE...</div>;
  }

  const kpis = data?.kpis || [];
  const ultimoMes = kpis[kpis.length - 1] || {};
  const mesPrevio = kpis[kpis.length - 2] || {};
  const metaIirl = data?.meta_iirl || 1;

  const cambioIirl = (ultimoMes.iirl || 0) - (mesPrevio.iirl || 0);
  const cumpleMeta = (ultimoMes.iirl || 0) <= metaIirl;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">KPIs de Seguridad y Prevencion</h1>
        <p className="text-muted-foreground">Indicadores HSE de los ultimos 12 meses calculados sobre incidentes reales.</p>
      </div>

      {!cumpleMeta && (
        <Alert className="border-[var(--brand-rojo)]/30 bg-[var(--brand-rojo)]/5">
          <AlertTriangle className="h-4 w-4 text-[var(--brand-rojo)]" />
          <AlertDescription className="text-[var(--brand-rojo)]">
            IIRL por encima de la meta (Actual: {ultimoMes.iirl?.toFixed(2) || ultimoMes.iirl || 0}, Meta: {metaIirl})
          </AlertDescription>
        </Alert>
      )}

      <HSEKPIsSeguridad kpis={kpis} meta_iirl={metaIirl} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              Tasa de accidentabilidad
              {cambioIirl < 0 && <TrendingDown className="h-4 w-4 text-[var(--brand-verde)]" />}
              {cambioIirl > 0 && <TrendingUp className="h-4 w-4 text-[var(--brand-rojo)]" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {typeof ultimoMes.tasa_accidentabilidad === 'number'
                ? ultimoMes.tasa_accidentabilidad.toFixed(1)
                : ultimoMes.tasa_accidentabilidad ?? 0}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Mes actual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Dias sin accidentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[var(--brand-verde)]">{ultimoMes.dias_sin_accidentes || 0}</div>
            <p className="mt-1 text-xs text-muted-foreground">Marca calculada al cierre del mes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Tasa de gravedad</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {typeof ultimoMes.tasa_gravedad === 'number'
                ? ultimoMes.tasa_gravedad.toFixed(2)
                : ultimoMes.tasa_gravedad ?? 0}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Severidad promedio de incidentes</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Comparativa historica (ultimos 6 meses)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {kpis.slice(-6).map((mes: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between rounded bg-muted p-3">
                <div>
                  <p className="font-semibold">{mes.mes}</p>
                  <p className="text-xs text-muted-foreground">
                    IIRL: {typeof mes.iirl === 'number' ? mes.iirl.toFixed(2) : mes.iirl ?? 0} | ODI:{' '}
                    {typeof mes.odi === 'number' ? mes.odi.toFixed(2) : mes.odi ?? 0}
                  </p>
                </div>
                <div className="text-right">
                  {mes.iirl <= metaIirl ? (
                    <Badge className="bg-[var(--brand-verde)]/10 text-[var(--brand-verde)]">Dentro de meta</Badge>
                  ) : (
                    <Badge className="bg-[var(--brand-rojo)]/10 text-[var(--brand-rojo)]">Fuera de meta</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Objetivos operacionales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded bg-[var(--secondary)]/5 p-3">
              <div>
                <p className="font-semibold">IIRL target</p>
                <p className="text-sm text-muted-foreground">Meta referencial para seguimiento interno</p>
              </div>
              <p className="text-lg font-bold">&lt; {metaIirl}</p>
            </div>
            <div className="flex items-center justify-between rounded bg-[var(--brand-verde)]/5 p-3">
              <div>
                <p className="font-semibold">Cero accidentes incapacitantes</p>
                <p className="text-sm text-muted-foreground">Objetivo de faena</p>
              </div>
              <p className="text-lg font-bold">0</p>
            </div>
            <div className="flex items-center justify-between rounded bg-orange-50 p-3">
              <div>
                <p className="font-semibold">Control de hallazgos HSE</p>
                <p className="text-sm text-muted-foreground">Seguimiento mensual de incidentes y observaciones</p>
              </div>
              <p className="text-lg font-bold">100%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
