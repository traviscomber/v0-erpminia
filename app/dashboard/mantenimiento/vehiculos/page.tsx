'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BrandCard } from '@/components/ui/brand-card';
import { ChevronRight, FileSearch, Plus, Wrench } from 'lucide-react';
import { AssetImport } from '@/components/mantenimiento/asset-import';

type MaintenanceAsset = {
  id: string;
  assetCode: string;
  assetName: string;
  assetType: string;
  location: string;
  status: string;
  manufacturer: string;
  model: string;
  criticality: string;
  mtbfHours?: number;
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar los activos');
  return payload;
};

export default function VehiclesPage() {
  const { data, error, isLoading } = useSWR('/api/maintenance/assets', fetcher);
  const { data: machineCatalogData } = useSWR('/api/maintenance/cost-center-machines', fetcher);
  const vehicles = (data?.assets || []) as MaintenanceAsset[];
  const derivedMachines = Array.isArray(machineCatalogData?.machines) ? machineCatalogData.machines : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestion de vehiculos</h1>
        <p className="mt-2 text-muted-foreground">
          Administra vehiculos y arbol de fallas con datos reales del sistema.
        </p>
        <div className="mt-4 rounded-lg border border-[var(--secondary)]/30 bg-[var(--secondary)]/5 p-4 dark:border-blue-800 dark:bg-blue-950">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>Como funciona:</strong> cada activo trae su informacion operacional y puedes abrir el
            arbol de fallas para diagnosticar problemas y crear ordenes de trabajo.
          </p>
        </div>
      </div>

      <AssetImport onSuccess={() => window.location.reload()} />

      <BrandCard variant="default">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-[var(--brand-naranja)]/10 p-2 text-[var(--brand-naranja)]">
              <Wrench className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium">Alta de vehiculos</p>
              <p className="text-xs text-muted-foreground">Disponible cuando el flujo operativo lo habilite</p>
            </div>
          </div>
          <Button className="gap-2 bg-[var(--brand-naranja)] hover:bg-[var(--brand-naranja)]/90" disabled>
            <Plus className="h-4 w-4" />
            Crear nuevo vehiculo
          </Button>
        </div>
      </BrandCard>

      <Card>
        <CardHeader>
          <CardTitle>Vehiculos en sistema</CardTitle>
          <CardDescription>
            {isLoading ? 'Cargando activos...' : `${vehicles.length} vehiculos registrados`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              No fue posible cargar los vehiculos reales.
            </div>
          ) : (
            <div className="space-y-4">
              {vehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{vehicle.assetName}</h3>
                      <Badge className="bg-accent">{String(vehicle.status || 'operativo').toUpperCase()}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground md:grid-cols-4">
                      <div>
                        <span className="font-medium text-foreground">{vehicle.assetCode}</span>
                        <p>Codigo</p>
                      </div>
                      <div>
                        <span className="font-medium text-foreground">{vehicle.assetType || '-'}</span>
                        <p>Tipo</p>
                      </div>
                      <div>
                        <span className="font-medium text-foreground">{vehicle.model || '-'}</span>
                        <p>Modelo</p>
                      </div>
                      <div>
                        <span className="font-medium text-foreground">{vehicle.location || '-'}</span>
                        <p>Ubicacion</p>
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 flex flex-col gap-2 sm:flex-row">
                    <Link href={`/dashboard/mantenimiento/vehiculos/${vehicle.id}/ficha`}>
                      <Button variant="outline" className="gap-2">
                        Ver ficha completa
                        <FileSearch className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={`/dashboard/mantenimiento/vehiculos/${vehicle.id}/arbol`}>
                      <Button variant="outline" className="gap-2">
                        Ver arbol de fallas
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}

              {!isLoading && vehicles.length === 0 && (
                <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
                  Todavia no hay vehiculos cargados desde la base real.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Modelos derivados desde centros de costo</CardTitle>
          <CardDescription>
            {derivedMachines.length > 0
              ? `${derivedMachines.length} modelos detectados desde la base de centros de costo`
              : 'Todavia no se detectaron modelos en los centros de costo'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {derivedMachines.length > 0 ? (
            <div className="max-h-[720px] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {derivedMachines.map((machine: any) => (
                <div key={machine.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{machine.family}</p>
                      <h3 className="truncate text-base font-semibold">{machine.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{machine.code}</p>
                    </div>
                    <Badge variant="outline">{machine.source}</Badge>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Este modelo viene del centro de costo y puede usarse como base del maestro de maquinas.
                  </p>
                </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
              No se encontraron modelos claros desde centros de costo.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
