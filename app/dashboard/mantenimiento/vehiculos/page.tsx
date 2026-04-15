'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BrandCard } from '@/components/ui/brand-card';
import { BrandBadge } from '@/components/ui/brand-badge';
import { ChevronRight, Plus, AlertTriangle, CheckCircle2, Zap } from 'lucide-react';

export default function VehiclesPage() {
  const [vehicles] = useState([
    {
      id: '1',
      code: 'EXC-001',
      name: 'Excavadora CAT 390F',
      type: 'excavadora',
      model: 'CAT 390F',
      status: 'operativo',
      site: 'Faena Central',
      year: 2019,
    },
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Vehículos</h1>
        <p className="text-muted-foreground mt-2">
          Administra vehículos y árbol de fallas para diagnóstico de mantenimiento
        </p>
        <div className="mt-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>💡 Cómo funciona:</strong> Cada vehículo tiene un árbol jerárquico de componentes (Motor, Hidráulica, etc.) 
            con modos de falla, síntomas y piezas asociadas. Haz click en "Ver Árbol de Fallas" para diagnosticar problemas y crear órdenes de trabajo.
          </p>
        </div>
      </div>

      {/* Create Vehicle Button */}
      <BrandCard variant="default">
        <Button className="gap-2 bg-[var(--brand-naranja)] hover:bg-[var(--brand-naranja)]/90" onClick={() => alert('Crear nuevo vehículo - Funcionalidad próximamente')}>
          <Plus className="h-4 w-4" />
          Crear Nuevo Vehículo
        </Button>
      </BrandCard>

      {/* Vehicles List */}
      <Card>
        <CardHeader>
          <CardTitle>Vehículos en Sistema</CardTitle>
          <CardDescription>{vehicles.length} vehículos registrados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {vehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{vehicle.name}</h3>
                    <Badge className={vehicle.status === 'operativo' ? 'bg-accent' : 'bg-orange-600'}>
                      {vehicle.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-sm text-muted-foreground">
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
                  <Button variant="outline" className="gap-2 ml-4">
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
