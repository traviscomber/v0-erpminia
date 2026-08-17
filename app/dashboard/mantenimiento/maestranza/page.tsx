import { Gauge, Wrench } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatePanel } from '@/components/ui/state-panel';

export default function MaestranzaPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Mantenimiento · Planta</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Maestranza</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Taller de mantenimiento de planta. La sensorización de MOTIL se concentra aquí y no se utiliza para monitorear equipos móviles, maquinaria ni activos productivos.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Wrench className="h-4 w-4" />Operación de Maestranza</CardTitle>
            <CardDescription>Órdenes, trabajos, disponibilidad del taller e historial de intervenciones.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Las intervenciones permanecen vinculadas a las OT y al historial de mantenimiento, sin borrar antecedentes cuando un activo se inactiva o se da de baja.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Gauge className="h-4 w-4" />Sensores de Maestranza</CardTitle>
            <CardDescription>Monitoreo reservado a infraestructura y condiciones del taller.</CardDescription>
          </CardHeader>
          <CardContent>
            <StatePanel
              tone="neutral"
              title="Sensores restringidos a Maestranza"
              description="La futura integración de sensores se asociará a la Maestranza y su infraestructura. No se asociará telemetría a camiones, cargadores, perforadoras u otras maquinarias productivas."
              className="min-h-0 py-5"
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
