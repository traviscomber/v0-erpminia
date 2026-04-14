'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
      </div>

      {/* Create Vehicle Button */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Crear Nuevo Vehículo
          </Button>
        </CardContent>
      </Card>

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
                <Button variant="outline" className="gap-2 ml-4">
                  Ver Árbol de Fallas
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
