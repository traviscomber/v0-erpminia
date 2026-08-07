'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { Activity, FileText, Gauge, GitBranch, QrCode, RefreshCw, Timer, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatePanel } from '@/components/ui/state-panel';

type WorkOrder = {
  id: string;
  status?: string | null;
  priority?: string | null;
  start_date?: string | null;
  completion_date?: string | null;
  scheduled_date?: string | null;
  work_type?: string | null;
};

type AssetResponse = {
  asset?: {
    id: string;
    asset_code?: string | null;
    name?: string | null;
    asset_type?: string | null;
    category?: string | null;
    manufacturer?: string | null;
    model?: string | null;
    serial_number?: string | null;
    license_plate?: string | null;
    is_active?: boolean | null;
  };
  workOrders?: WorkOrder[];
  installedParts?: Array<{ id: string }>;
  totals?: { totalCost?: number };
};

const fetcher = async (url: string): Promise<AssetResponse> => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la ficha 360 del equipo');
  return payload;
};

const hoursBetween = (start?: string | null, end?: string | null) => {
  if (!start || !end) return 0;
  const value = (new Date(end).getTime() - new Date(start).getTime()) / 3_600_000;
  return Number.isFinite(value) && value > 0 ? value : 0;
};

const money = (value: number | null | undefined) =>
  `$${Number(value || 0).toLocaleString('es-CL', { maximumFractionDigits: 0 })}`;

export function Asset360Overview({ assetId }: { assetId: string }) {
  const { data, error, isLoading, mutate } = useSWR<AssetResponse>(
    assetId ? `/api/maintenance/assets/${encodeURIComponent(assetId)}/timeline` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  if (isLoading) {
    return <StatePanel tone="loading" title="Preparando Equipo 360°" description="Reuniendo historial, tiempos, componentes y costos registrados." />;
  }

  if (error || !data?.asset) {
    return (
      <StatePanel
        tone="error"
        title="No fue posible preparar Equipo 360°"
        description={error instanceof Error ? error.message : 'No se encontró el equipo solicitado.'}
        actions={<Button variant="outline" onClick={() => void mutate()}><RefreshCw className="h-4 w-4" />Reintentar</Button>}
      />
    );
  }

  const orders = data.workOrders || [];
  const completed = orders.filter((order) => order.status === 'completed');
  const active = orders.filter((order) => !['completed', 'cancelled'].includes(order.status || ''));
  const critical = active.filter((order) => order.priority === 'critical').length;
  const durations = completed
    .map((order) => hoursBetween(order.start_date, order.completion_date))
    .filter((value) => value > 0);
  const downtimeHours = durations.reduce((sum, value) => sum + value, 0);
  const mttr = durations.length > 0 ? downtimeHours / durations.length : 0;

  const completedDates = completed
    .map((order) => order.completion_date || order.start_date)
    .filter(Boolean)
    .map((value) => new Date(value as string).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  const intervals = completedDates.slice(1).map((value, index) => (value - completedDates[index]) / 3_600_000).filter((value) => value > 0);
  const mtbf = intervals.length > 0 ? intervals.reduce((sum, value) => sum + value, 0) / intervals.length : 0;

  const encodedId = encodeURIComponent(assetId);
  const links = [
    { href: `/dashboard/mantenimiento/equipos/${encodedId}/arbol`, label: 'Árbol técnico', icon: GitBranch },
    { href: `/dashboard/mantenimiento/equipos/${encodedId}/ficha-tecnica`, label: 'Ficha técnica', icon: Gauge },
    { href: `/dashboard/mantenimiento/equipos/${encodedId}/documentos`, label: 'Documentos', icon: FileText },
    { href: `/dashboard/mantenimiento/equipos/${encodedId}/qr`, label: 'Código QR', icon: QrCode },
  ];

  return (
    <Card className="shadow-none">
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Equipo 360°</p>
          <CardTitle className="mt-1 text-xl">{data.asset.asset_code || data.asset.name || 'Equipo'}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {[data.asset.manufacturer, data.asset.model, data.asset.serial_number].filter(Boolean).join(' · ') || 'Identificación técnica no informada'}
          </p>
        </div>
        <div className="rounded-md border px-3 py-2 text-sm">
          <span className={`mr-2 inline-block h-2 w-2 rounded-full ${data.asset.is_active ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
          {data.asset.is_active ? 'Equipo activo' : 'Equipo inactivo'}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-6">
          {[
            ['Órdenes activas', active.length.toLocaleString('es-CL'), Wrench],
            ['Críticas abiertas', critical.toLocaleString('es-CL'), Activity],
            ['Tiempo registrado', `${downtimeHours.toLocaleString('es-CL', { maximumFractionDigits: 1 })} h`, Timer],
            ['Promedio reparación', mttr > 0 ? `${mttr.toLocaleString('es-CL', { maximumFractionDigits: 1 })} h` : 'Sin base', Timer],
            ['Entre intervenciones', mtbf > 0 ? `${mtbf.toLocaleString('es-CL', { maximumFractionDigits: 0 })} h` : 'Sin base', Gauge],
            ['Costo acumulado', money(data.totals?.totalCost), Activity],
          ].map(([label, value, Icon]) => (
            <div key={String(label)} className="bg-card p-4">
              <div className="flex items-center justify-between gap-2 text-muted-foreground">
                <span className="text-xs">{String(label)}</span>
                <Icon className="h-4 w-4" />
              </div>
              <p className="mt-2 text-lg font-semibold">{String(value)}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Los tiempos se calculan únicamente con órdenes que tienen inicio y término registrados. “Entre intervenciones” usa la separación entre cierres históricos disponibles.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {links.map(({ href, label, icon: Icon }) => (
            <Button key={href} asChild variant="outline" className="h-auto justify-start py-3">
              <Link href={href}><Icon className="h-4 w-4" />{label}</Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
