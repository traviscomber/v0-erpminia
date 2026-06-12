'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BrandCard } from '@/components/ui/brand-card';
import { ChevronRight, Plus, Wrench } from 'lucide-react';

const vehicles = [
  {
    id: '1',
    code: 'EXC-001',
    name: 'Excavadora CAT 390F',
    type: 'Excavadora',
    model: 'CAT 390F',
    status: 'Operativo',
    site: 'Faena Central',
    year: 2019,
  },
];

export default function VehiclesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Vehículos</h1>
        <p className="mt-2 text-muted-foreground">
          Administra vehículos y árbol de fallas para diagnóstico de mantenimiento.
        </p>
        <div className="mt-4 rounded-lg border border-[var(--secondary)]/30 bg-[var(--secondary)]/5 p-4 dark:border-blue-800 dark:bg-blue-950">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>Cómo funciona:</strong> cada vehículo tiene un árbol jerárquico de componentes
            con modos de falla, síntomas y piezas asociadas. Usa &quot;Ver Árbol de Fallas&quot; para
            diagnosticar problemas y crear órdenes de trabajo.
          </p>
        </div>
      </div>

      <BrandCard variant="default">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-[var(--brand-naranja)]/10 p-2 text-[var(--brand-naranja)]">
              <Wrench className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium">Alta de vehículos</p>
              <p className="text-xs text-muted-foreground">Flujo de carga en consolidación</p>
            </div>
          </div>
          <Button className="gap-2 bg-[var(--brand-naranja)] hover:bg-[var(--brand-naranja)]/90" disabled>
            <Plus className="h-4 w-4" />
            Crear nuevo vehículo
          </Button>
        </div>
      </BrandCard>

      <Card>
        <CardHeader>
          <CardTitle>Vehículos en sistema</CardTitle>
          <CardDescription>{vehicles.length} vehículos registrados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {vehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-3">
                    <h3 className="text-lg font-semibold">{vehicle.name}</h3>
                    <Badge className="bg-accent">{vehicle.status.toUpperCase()}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground md:grid-cols-4">
                    <div>
                      <span className="font-medium text-foreground">{vehicle.code}</span>
                      <p>Código</p>
                    </div>
                    <div>
                      <span className="font-medium text-foreground">{vehicle.model}</span>
                      <p>Modelo</p>
                    </div>
                    <div>
                      <span className="font-medium text-foreground">{vehicle.year}</span>
                      <p>Año</p>
                    </div>
                    <div>
                      <span className="font-medium text-foreground">{vehicle.site}</span>
                      <p>Faena</p>
                    </div>
                  </div>
                </div>
                <Link href={`/dashboard/mantenimiento/vehiculos/${vehicle.id}/arbol`}>
                  <Button variant="outline" className="ml-4 gap-2">
                    Ver Árbol de Fallas
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
