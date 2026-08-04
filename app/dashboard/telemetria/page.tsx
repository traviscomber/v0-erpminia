'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Activity, ArrowRight, Cpu, RadioTower } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const TelemetryExecutiveSummary = dynamic(
  () => import('@/components/telemetry/telemetry-executive-summary').then((mod) => mod.TelemetryExecutiveSummary),
  { ssr: false, loading: () => <div className="h-28 animate-pulse rounded-xl bg-muted" /> },
);

const EquipmentMonitor = dynamic(
  () => import('@/components/telemetry/equipment-monitor').then((mod) => mod.EquipmentMonitor),
  { ssr: false, loading: () => <div className="h-64 animate-pulse rounded-xl bg-muted" /> },
);

const SensorAlerts = dynamic(
  () => import('@/components/production/sensor-alerts').then((mod) => mod.SensorAlerts),
  { ssr: false, loading: () => <div className="h-40 animate-pulse rounded-xl bg-muted" /> },
);

export default function TelemetriaPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/70 bg-card p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Operaciones · Telemetría</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Monitoreo de sensores</h1>
            <p className="mt-2 text-sm text-muted-foreground md:text-base">
              Consulta lecturas históricas, alarmas y estado de equipos conectados desde las integraciones existentes.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="gap-2">
              <Link href="/dashboard/produccion">
                Ver producción
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild className="gap-2">
              <Link href="/dashboard/telemetria/integracion">
                Configurar integración
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <TelemetryExecutiveSummary />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4" />Alertas de sensores</CardTitle>
            <CardDescription>Lecturas que requieren atención o una revisión operacional.</CardDescription>
          </CardHeader>
          <CardContent><SensorAlerts /></CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Cpu className="h-4 w-4" />Equipos monitoreados</CardTitle>
            <CardDescription>Disponibilidad, alarmas y última lectura registrada.</CardDescription>
          </CardHeader>
          <CardContent><EquipmentMonitor /></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base"><RadioTower className="h-4 w-4" />Integración LAN</CardTitle>
              <CardDescription className="mt-1">Punto de ingreso disponible para gateways autorizados de la red local.</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link href="/dashboard/telemetria/integracion">
                Ver configuración
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-border/70 p-4">
            <p className="text-xs text-muted-foreground">Endpoint</p>
            <p className="mt-1 break-all text-sm font-medium">POST /api/telemetry/ingest</p>
          </div>
          <div className="rounded-lg border border-border/70 p-4">
            <p className="text-xs text-muted-foreground">Autenticación</p>
            <p className="mt-1 break-all text-sm font-medium">x-telemetry-token</p>
          </div>
          <div className="rounded-lg border border-border/70 p-4">
            <p className="text-xs text-muted-foreground">Origen esperado</p>
            <p className="mt-1 text-sm font-medium">Gateway local autorizado</p>
          </div>
          <div className="rounded-lg border border-border/70 p-4">
            <p className="text-xs text-muted-foreground">Identificación mínima</p>
            <p className="mt-1 text-sm font-medium">ID o código operacional</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
