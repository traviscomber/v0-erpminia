'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { ArrowRight, Search, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderTitle,
} from '@/components/ui/page-header';
import { StatePanel } from '@/components/ui/state-panel';

type CanonicalVehicle = {
  id: string;
  code: string | null;
  name: string | null;
  model: string | null;
  type: string | null;
  status: string | null;
  specs?: {
    manufacturer?: string | null;
    category?: string | null;
    license_plate?: string | null;
    cost_center_code?: string | null;
    validation_status?: string | null;
    updated_at?: string | null;
  };
};

type EquipmentPayload = {
  equipment?: CanonicalVehicle[];
};

const fetcher = async (url: string): Promise<EquipmentPayload> => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar los vehículos');
  return payload;
};

function isVehicle(asset: CanonicalVehicle) {
  const text = [asset.type, asset.specs?.category, asset.name, asset.code, asset.specs?.license_plate]
    .filter(Boolean)
    .join(' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  return Boolean(asset.specs?.license_plate) || /(vehiculo|camion|camioneta|pickup|bus|furgon|tractor|tolva|aljibe|minibus)/.test(text);
}

function statusLabel(value: string | null | undefined) {
  const normalized = String(value || '').toLowerCase();
  if (['activo', 'active', 'operativo'].includes(normalized)) return 'Activo';
  if (['inactivo', 'inactive'].includes(normalized)) return 'Inactivo';
  return value || 'Sin estado';
}

export default function VehiclesPage() {
  const { data, error, isLoading, mutate } = useSWR<EquipmentPayload>('/api/maintenance/equipment', fetcher, { revalidateOnFocus: false });
  const [query, setQuery] = useState('');

  const vehicles = useMemo(() => (data?.equipment || []).filter(isVehicle), [data?.equipment]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter((vehicle) => [vehicle.code, vehicle.name, vehicle.model, vehicle.type, vehicle.specs?.manufacturer, vehicle.specs?.license_plate, vehicle.specs?.cost_center_code]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q));
  }, [query, vehicles]);

  return (
    <div className="space-y-5">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Mantenimiento · Activos móviles</PageHeaderEyebrow>
          <PageHeaderTitle>Vehículos</PageHeaderTitle>
          <PageHeaderDescription>
            Abre un vehículo para revisar su ficha 360°, órdenes de trabajo, costos, componentes e historial completo.
          </PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button asChild>
            <Link href="/dashboard/mantenimiento/vehiculos/importar"><Upload className="h-4 w-4" />Importar vehículos</Link>
          </Button>
        </PageHeaderActions>
      </PageHeader>

      {error ? (
        <StatePanel tone="error" title="No fue posible cargar los vehículos" description={error.message} actions={<Button variant="outline" onClick={() => void mutate()}>Reintentar</Button>} />
      ) : null}

      {!error ? (
        <section className="space-y-3">
          <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">{isLoading ? 'Cargando…' : `${vehicles.length} vehículos canónicos`}</p>
              <p className="text-xs text-muted-foreground">Fuente única para ficha, OT e historial de mantenimiento.</p>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar código, patente, modelo…" className="pl-9" />
            </div>
          </div>

          {isLoading ? <StatePanel tone="loading" title="Cargando vehículos" description="Consultando el maestro canónico de activos." /> : null}

          {!isLoading && filtered.length === 0 ? (
            <StatePanel tone="neutral" title={query ? 'Sin coincidencias' : 'No hay vehículos identificados'} description={query ? 'Prueba con otro código, patente, fabricante o modelo.' : 'El maestro canónico no contiene activos clasificados como vehículos.'} />
          ) : null}

          {filtered.length > 0 ? (
            <div className="divide-y border-y">
              {filtered.map((vehicle) => (
                <Link
                  key={vehicle.id}
                  href={`/dashboard/mantenimiento/vehiculos/${encodeURIComponent(vehicle.id)}/ficha`}
                  className="group grid gap-3 px-1 py-4 transition-colors hover:bg-muted/40 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,.8fr)_auto] sm:items-center sm:px-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{vehicle.code || 'Sin código'}</p>
                      <Badge variant="outline">{statusLabel(vehicle.status)}</Badge>
                    </div>
                    <p className="mt-1 truncate text-sm">{vehicle.name || 'Vehículo sin nombre'}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{vehicle.specs?.license_plate || 'Sin patente registrada'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Fabricante / modelo</p>
                    <p className="mt-1 text-sm font-medium">{[vehicle.specs?.manufacturer, vehicle.model].filter(Boolean).join(' · ') || 'Sin dato'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Centro de costo</p>
                    <p className="mt-1 text-sm font-medium">{vehicle.specs?.cost_center_code || 'Sin asignar'}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground group-hover:text-foreground">
                    Ver ficha <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
