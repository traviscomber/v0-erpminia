'use client';

import { useMemo } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { ArrowRight, FileText, History, Link2, PackageOpen, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type AssetSummary = {
  id: string;
  code: string | null;
  name: string | null;
  type: string | null;
  location: string | null;
  status: string | null;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  criticality: string | null;
  mtbfHours: number | null;
  purchaseDate: string | null;
  lastMaintenance: string | null;
  nextMaintenance: string | null;
};

type TechnicalField = {
  key: string;
  value: string;
};

type ComponentFaultMode = {
  id: string;
  code: string | null;
  name: string | null;
  severity: string | null;
};

type ComponentTemplate = {
  id: string;
  code: string | null;
  name: string | null;
  vehicleType: string | null;
  level: number | string | null;
  description: string | null;
  faultModes: ComponentFaultMode[];
};

type TechnicalSheetResponse = {
  asset?: AssetSummary;
  technicalSheet?: {
    family?: string | null;
    sourceUrl?: string | null;
    fields?: TechnicalField[];
    rawSpecs?: Record<string, unknown> | null;
  };
  componentProfile?: ComponentTemplate[];
  error?: string;
};

type AssetTechnicalSheetViewProps = {
  scope?: 'vehiculos' | 'equipos';
};

const fetcher = async (url: string): Promise<TechnicalSheetResponse> => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || 'No fue posible cargar la ficha tecnica');
  }
  return payload;
};

function badgeVariant(severity: string | null | undefined): 'default' | 'secondary' | 'destructive' | 'outline' {
  const value = String(severity || '').toLowerCase();
  if (['critical', 'critico', 'critica'].includes(value)) return 'destructive';
  if (['high', 'alto'].includes(value)) return 'secondary';
  return 'outline';
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString('es-CL') : '-';
}

export function AssetTechnicalSheetView({ scope }: AssetTechnicalSheetViewProps) {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const assetId = decodeURIComponent(String(params.id || ''));
  const resolvedScope = scope || (pathname.includes('/mantenimiento/equipos/') ? 'equipos' : 'vehiculos');

  const { data, error, isLoading, mutate } = useSWR(
    assetId ? `/api/maintenance/assets/${assetId}/technical-sheet` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const asset = data?.asset;
  const sheet = data?.technicalSheet;
  const componentProfile = Array.isArray(data?.componentProfile) ? data?.componentProfile : [];

  const faultModesCount = useMemo(
    () => componentProfile.reduce((sum, item) => sum + item.faultModes.length, 0),
    [componentProfile],
  );

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Cargando ficha tecnica...</div>;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          No se pudo cargar la ficha tecnica real del activo.
        </div>
        <Button variant="outline" onClick={() => void mutate()}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activo no encontrado</h1>
          <p className="mt-2 text-muted-foreground">No se encontro la informacion tecnica solicitada.</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{asset.name || 'Ficha tecnica'}</h1>
          <p className="mt-2 text-muted-foreground">
            Base tecnica real del activo, con especificaciones, componentes sugeridos y fallas asociadas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/dashboard/work-orders/create?assetId=${asset.id}`}>
              <Wrench className="mr-2 h-4 w-4" />
              Crear OT
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/dashboard/mantenimiento/${resolvedScope}/${asset.id}/ficha`}>
              <FileText className="mr-2 h-4 w-4" />
              Ficha completa
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/dashboard/mantenimiento/${resolvedScope}/${asset.id}/arbol`}>
              <History className="mr-2 h-4 w-4" />
              Arbol de fallas
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Modelo</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{asset.model || '-'}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Familia</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{sheet?.family || 'Sin derivacion'}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Componentes</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{componentProfile.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fallas</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{faultModesCount}</CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Resumen tecnico</CardTitle>
            <CardDescription>Datos del activo y enlace a la fuente base, si existe.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-lg border border-border p-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground">Codigo</p>
                  <p className="font-medium">{asset.code || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tipo</p>
                  <p className="font-medium">{asset.type || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fabricante</p>
                  <p className="font-medium">{asset.manufacturer || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Serie</p>
                  <p className="font-medium">{asset.serialNumber || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Compra</p>
                  <p className="font-medium">{formatDate(asset.purchaseDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Ultima mantencion</p>
                  <p className="font-medium">{formatDate(asset.lastMaintenance)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border p-4">
              <p className="text-muted-foreground">Fuente tecnica</p>
              {sheet?.sourceUrl ? (
                <a
                  href={sheet.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-2 break-all font-medium text-primary underline-offset-4 hover:underline"
                >
                  <Link2 className="h-4 w-4" />
                  {sheet.sourceUrl}
                </a>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  Sin enlace oficial cargado. Se puede completar desde la ficha tecnica o desde el importador.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Ficha tecnica</CardTitle>
            <CardDescription>Especificaciones cargadas en el activo, listas para completar con fuentes oficiales.</CardDescription>
          </CardHeader>
          <CardContent>
            {sheet?.fields && sheet.fields.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {sheet.fields.map((field) => (
                  <div key={field.key} className="rounded-lg border border-border p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{field.key}</p>
                    <p className="mt-1 break-words font-medium">{field.value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                <PackageOpen className="h-4 w-4" />
                Todavia no hay especificaciones tecnicas cargadas para este activo.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Componentes y fallas sugeridas</CardTitle>
          <CardDescription>
            Bloque tecnico basado en la familia detectada. Sirve para armar la ficha de falla por componente del activo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {componentProfile.length > 0 ? (
            componentProfile.map((component) => (
              <div key={component.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{component.vehicleType || 'Componente'}</p>
                    <h3 className="text-base font-semibold">{component.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {component.code || '-'} | Nivel {component.level || '-'}
                    </p>
                  </div>
                  <Badge variant="outline">{component.faultModes.length} fallas</Badge>
                </div>
                {component.description ? <p className="mt-3 text-sm text-muted-foreground">{component.description}</p> : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {component.faultModes.length > 0 ? (
                    component.faultModes.map((fault) => (
                      <Badge key={fault.id} variant={badgeVariant(fault.severity)}>
                        {fault.name || fault.code || 'Falla'}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">Sin fallas definidas para este componente.</span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              No hay componentes sugeridos para esta familia todavia. Se puede completar con el maestro tecnico.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Datos crudos de referencia</CardTitle>
          <CardDescription>Salida directa del registro para validar la carga tecnica sin perder trazabilidad.</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg border bg-muted p-4 text-xs leading-6">
            {JSON.stringify(sheet?.rawSpecs || {}, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
