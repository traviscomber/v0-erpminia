'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { Activity, AlertTriangle, ArrowRight, Gauge, RefreshCw, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatePanel } from '@/components/ui/state-panel';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la evidencia de disponibilidad');
  return payload;
};

type AvailabilityAsset = {
  id: string;
  assetCode?: string | null;
  assetName?: string | null;
  assetType?: string | null;
  location?: string | null;
  observedStatus: 'operational' | 'maintenance' | 'unavailable' | 'unknown';
  rawStatus?: string | null;
  openWorkOrders: number;
  criticalOpenOrders: number;
  overduePreventives: number;
  runtimeReadingCount: number;
  latestMeterHours?: number | string | null;
  auditedClosures: number;
  auditedDowntimeHours?: number | string | null;
  availabilityPercentage: null;
  nextAction: string;
};

type AvailabilityResponse = {
  summary: {
    totalAssets: number;
    canonicalOperational: number;
    canonicalMaintenance: number;
    canonicalUnavailable: number;
    canonicalStatusUnknown: number;
    assetsWithOpenWorkOrders: number;
    assetsWithOverduePreventive: number;
    assetsWithRuntimeReadings: number;
    assetsWithDowntimeEvidence: number;
    availabilityPercentage: null;
    availabilityCalculableAssets: number;
    evidenceStatus: string;
  };
  assets: AvailabilityAsset[];
  evidence?: { availabilityRule?: string };
  timestamp: string;
};

function statusLabel(status: AvailabilityAsset['observedStatus']) {
  if (status === 'operational') return 'Operacional informado';
  if (status === 'maintenance') return 'En mantenimiento';
  if (status === 'unavailable') return 'No disponible informado';
  return 'Estado no informado';
}

function statusVariant(status: AvailabilityAsset['observedStatus']): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'unavailable') return 'destructive';
  if (status === 'maintenance') return 'secondary';
  return 'outline';
}

export function AvailabilitySemaphore() {
  const { data, error, isLoading, mutate } = useSWR<AvailabilityResponse>('/api/maintenance/availability/summary', fetcher, { revalidateOnFocus: false });

  if (isLoading) return <StatePanel tone="loading" title="Reuniendo evidencia de disponibilidad" description="Consultando activos canónicos, OT, horómetros y detenciones auditadas." />;
  if (error || !data?.summary) return <StatePanel tone="error" title="No fue posible cargar disponibilidad" description={error instanceof Error ? error.message : 'Reintenta la consulta.'} actions={<Button variant="outline" onClick={() => void mutate()}><RefreshCw className="h-4 w-4" />Reintentar</Button>} />;

  const s = data.summary;
  const priorityAssets = (data.assets || []).filter((asset) => asset.nextAction !== 'Sin acción prioritaria').slice(0, 12);

  return (
    <div className="space-y-6">
      <Card className="shadow-none">
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Disponibilidad basada en evidencia</p>
            <CardTitle className="mt-1 text-xl">Porcentaje aún no calculable</CardTitle>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Motil no publicará un porcentaje de disponibilidad hasta contar con una ventana operativa comparable que distinga horas programadas, operación y detención.
            </p>
          </div>
          <Badge variant="outline">Sin base temporal suficiente</Badge>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-6">
            {[
              ['Activos canónicos', s.totalAssets],
              ['Estado operacional', s.canonicalOperational],
              ['En mantenimiento', s.canonicalMaintenance],
              ['Estado sin informar', s.canonicalStatusUnknown],
              ['Con OT abierta', s.assetsWithOpenWorkOrders],
              ['Preventivo vencido', s.assetsWithOverduePreventive],
            ].map(([label, value]) => (
              <div key={String(label)} className="bg-card p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-2 text-xl font-semibold">{String(value)}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm font-medium"><Gauge className="h-4 w-4" />Horómetro utilizable</div>
              <p className="mt-2 text-2xl font-semibold">{s.assetsWithRuntimeReadings}</p>
              <p className="mt-1 text-xs text-muted-foreground">Activos con lectura acumulada real disponible.</p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm font-medium"><Activity className="h-4 w-4" />Detención auditada</div>
              <p className="mt-2 text-2xl font-semibold">{s.assetsWithDowntimeEvidence}</p>
              <p className="mt-1 text-xs text-muted-foreground">Activos con cierres auditados que registran evidencia de detención.</p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm font-medium"><AlertTriangle className="h-4 w-4" />Disponibilidad calculable</div>
              <p className="mt-2 text-2xl font-semibold">{s.availabilityCalculableAssets}</p>
              <p className="mt-1 text-xs text-muted-foreground">Se mantiene en cero mientras no exista una ventana operativa comparable.</p>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
            {data.evidence?.availabilityRule || 'La disponibilidad requiere evidencia temporal compatible.'}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Wrench className="h-4 w-4" />Equipos que requieren atención</CardTitle>
          <p className="text-sm text-muted-foreground">Priorizados por preventivo vencido, OT prioritaria, OT abierta o estado informado de mantenimiento. No es un ranking de impacto productivo.</p>
        </CardHeader>
        <CardContent>
          {priorityAssets.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">No hay acciones operacionales prioritarias derivadas de estas fuentes.</div>
          ) : (
            <div className="divide-y rounded-lg border">
              {priorityAssets.map((asset) => (
                <div key={asset.id} className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1.4fr)_150px_120px_160px_auto] lg:items-center">
                  <div className="min-w-0">
                    <p className="font-medium">{asset.assetCode || asset.assetName || 'Activo'}</p>
                    <p className="truncate text-xs text-muted-foreground">{[asset.assetName, asset.assetType, asset.location].filter(Boolean).join(' · ') || 'Sin detalle adicional'}</p>
                  </div>
                  <Badge variant={statusVariant(asset.observedStatus)} className="w-fit">{statusLabel(asset.observedStatus)}</Badge>
                  <div><p className="text-xs text-muted-foreground">OT abiertas</p><p className="font-medium">{asset.openWorkOrders}</p></div>
                  <div><p className="text-xs text-muted-foreground">Siguiente acción</p><p className="text-sm font-medium">{asset.nextAction}</p></div>
                  <Button asChild size="sm" variant="outline"><Link href={`/dashboard/mantenimiento/equipos/${encodeURIComponent(asset.id)}/ficha`}>Ficha 360<ArrowRight className="h-4 w-4" /></Link></Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">Actualizado: {new Date(data.timestamp).toLocaleString('es-CL')}</p>
    </div>
  );
}
