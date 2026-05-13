'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, BarChart3, TrendingDown } from 'lucide-react';

export default function MedioAmbientePage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Gestión Ambiental</h1>
          <p className="text-muted-foreground">Monitoreos, permisos y planes de acción ambiental</p>
        </div>
        <Button className="bg-[var(--brand-naranja)] text-white hover:bg-[var(--brand-naranja)]/90">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Monitoreo
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Monitoreos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground mt-1">Registros este mes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Permisos Vigentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground mt-1">Autorizaciones activas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Planes de Acción
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground mt-1">En ejecución</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Matriz de Monitoreos Ambientales</CardTitle>
          <CardDescription>Bajo desarrollo - Funcionalidad completa próximamente</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-12">
            Este módulo incluirá seguimiento de emisiones, consumo de agua, residuos y cumplimiento normativo ambiental.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
