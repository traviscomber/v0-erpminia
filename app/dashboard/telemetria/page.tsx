'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Activity, ArrowRight, Cpu, RadioTower } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader, PageHeaderActions, PageHeaderContent, PageHeaderDescription, PageHeaderEyebrow, PageHeaderTitle } from '@/components/ui/page-header';

const TelemetryExecutiveSummary = dynamic(
  () => import('@/components/telemetry/telemetry-executive-summary').then((mod) => mod.TelemetryExecutiveSummary),
  { ssr: false, loading: () => <div className="h-28 animate-pulse rounded-lg bg-muted" /> },
);
const EquipmentMonitor = dynamic(
  () => import('@/components/telemetry/equipment-monitor').then((mod) => mod.EquipmentMonitor),
  { ssr: false, loading: () => <div className="h-64 animate-pulse rounded-lg bg-muted" /> },
);
const SensorAlerts = dynamic(
  () => import('@/components/production/sensor-alerts').then((mod) => mod.SensorAlerts),
  { ssr: false, loading: () => <div className="h-40 animate-pulse rounded-lg bg-muted" /> },
);

export default function TelemetriaPage() {
  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Operaciones</PageHeaderEyebrow>
          <PageHeaderTitle>Monitoreo de sensores</PageHeaderTitle>
          <PageHeaderDescription>
            Lecturas históricas, alarmas y estado de equipos conectados desde las integraciones existentes.
          </PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button asChild variant="outline">
            <Link href="/dashboard/produccion">Ver producción<ArrowRight className="h-4 w-4" /></Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/telemetria/integracion">Configurar integración<ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </PageHeaderActions>
      </PageHeader>

      <TelemetryExecutiveSummary />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm"><Activity className="h-4 w-4" />Alertas de sensores</CardTitle>
            <CardDescription>Lecturas que requieren atención operacional.</CardDescription>
          </CardHeader>
          <CardContent><SensorAlerts /></CardContent>
        </Card>
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm"><Cpu className="h-4 w-4" />Equipos monitoreados</CardTitle>
            <CardDescription>Disponibilidad, alarmas y última lectura registrada.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto"><EquipmentMonitor /></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm"><RadioTower className="h-4 w-4" />Integración LAN</CardTitle>
              <CardDescription className="mt-1">Punto de ingreso para gateways autorizados de la red local.</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/telemetria/integracion">Ver configuración<ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid divide-y rounded-md border border-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          {[
            ['Endpoint', 'POST /api/telemetry/ingest'],
            ['Autenticación', 'x-telemetry-token'],
            ['Origen esperado', 'Gateway local autorizado'],
            ['Identificación mínima', 'ID o código operacional'],
          ].map(([label, value]) => (
            <div key={label} className="min-w-0 p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 break-all text-sm font-medium">{value}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
