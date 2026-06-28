'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Activity, ArrowRight, Cpu, RadioTower } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const TelemetryExecutiveSummary = dynamic(
  () => import('@/components/telemetry/telemetry-executive-summary').then((mod) => mod.TelemetryExecutiveSummary),
  { ssr: false, loading: () => <div className="text-sm text-muted-foreground">Cargando resumen de telemetria...</div> }
);

const EquipmentMonitor = dynamic(
  () => import('@/components/telemetry/equipment-monitor').then((mod) => mod.EquipmentMonitor),
  { ssr: false, loading: () => <div className="text-sm text-muted-foreground">Cargando monitoreo de equipos...</div> }
);

const SensorAlerts = dynamic(
  () => import('@/components/production/sensor-alerts').then((mod) => mod.SensorAlerts),
  { ssr: false, loading: () => <div className="text-sm text-muted-foreground">Cargando alertas sugeridas...</div> }
);

export default function TelemetriaPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Telemetria de sensores</h1>
          <p className="mt-2 text-muted-foreground">
            Monitoreo real de equipos, alertas activas y sugerencias de orden de trabajo desde datos vivos.
          </p>
        </div>
        <Link href="/dashboard/produccion">
          <Button variant="outline" className="gap-2">
            <ArrowRight className="h-4 w-4" />
            Volver a produccion
          </Button>
        </Link>
        <Link href="/dashboard/mantenimiento">
          <Button variant="outline" className="gap-2">
            <ArrowRight className="h-4 w-4" />
            Ir a mantenimiento
          </Button>
        </Link>
      </div>

      <TelemetryExecutiveSummary />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-border/70 bg-card/90">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Monitoreo real</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">Sensores vivos</div>
            <p className="text-xs text-muted-foreground">Lecturas desde Supabase sin datos de prueba.</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/90">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Alertas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--secondary)]">OT sugerida</div>
            <p className="text-xs text-muted-foreground">Generacion directa desde la alerta de sensor.</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/90">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Cobertura</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-verde)]">Equipo + lectura</div>
            <p className="text-xs text-muted-foreground">Vista simple para operar y reaccionar a tiempo.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/90">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[var(--brand-naranja)]" />
            Acceso rapido al flujo operativo
          </CardTitle>
          <CardDescription>Salta entre produccion, mantenimiento, bodega y legal sin perder el contexto.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/mantenimiento">
                Mantenimiento
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/bodega">
                Bodega
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/legal">
                Legal
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/produccion">
                Produccion
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/90">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RadioTower className="h-4 w-4 text-[var(--brand-verde)]" />
            Integracion LAN
          </CardTitle>
          <CardDescription>
            Preparado para recibir lecturas desde otra maquina de la red local de la Patagua.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-xs text-muted-foreground">Endpoint de ingreso</p>
            <p className="mt-1 font-semibold">POST /api/telemetry/ingest</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-xs text-muted-foreground">Autenticacion</p>
            <p className="mt-1 font-semibold">x-telemetry-token</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-xs text-muted-foreground">Modo de uso</p>
            <p className="mt-1 font-semibold">Push desde gateway local</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-xs text-muted-foreground">Campos minimos</p>
            <p className="mt-1 font-semibold">equipment_id o equipment_code</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-[var(--brand-naranja)]" />
              Sensor activo
            </CardTitle>
            <CardDescription>Lectura resumida y alertas del equipo seleccionado.</CardDescription>
          </CardHeader>
          <CardContent>
            <SensorAlerts />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-[var(--brand-verde)]" />
              Equipos monitoreados
            </CardTitle>
            <CardDescription>Estado vivo de disponibilidad, alarmas y ultima lectura.</CardDescription>
          </CardHeader>
          <CardContent>
            <EquipmentMonitor />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
