'use client';

import { useMemo } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { ExternalLink, FileText, History, PackageOpen, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderTitle,
} from '@/components/ui/page-header';
import { StatePanel } from '@/components/ui/state-panel';

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
    fields?: Array<{ key: string; value: string }>;
    status?: string;
  };
  inferredFamily?: string | null;
  referenceAuthority?: 'canonical_identity_match' | 'reference_candidate_pending_validation' | 'none';
  referenceSheet?: {
    brand?: string;
    model?: string;
    family?: string;
    sourceUrl?: string;
    sourceLabel?: string;
    summary?: string;
    keySpecs?: Array<{ label: string; value: string }>;
  } | null;
  preventiveAlerts?: Array<{
    code: string;
    componentCode: string;
    componentName: string;
    severity: string;
    priority: string;
    title: string;
    symptom: string;
    cause: string;
    effect: string;
    recommendedAction: string;
  }>;
  componentProfile?: ComponentTemplate[];
  componentProfileAuthority?: string;
};

type Props = { scope?: 'vehiculos' | 'equipos' };

const fetcher = async (url: string): Promise<TechnicalSheetResponse> => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar la ficha técnica');
  return payload;
};

const display = (value: unknown) => {
  const text = value == null ? '' : String(value).trim();
  return text || 'Sin dato';
};

const formatDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString('es-CL') : 'Sin dato';

const severityVariant = (value: string | null | undefined): 'default' | 'secondary' | 'destructive' | 'outline' => {
  const normalized = String(value || '').toLowerCase();
  if (['critical', 'critico', 'critica'].includes(normalized)) return 'destructive';
  if (['high', 'alto', 'alta'].includes(normalized)) return 'secondary';
  return 'outline';
};

export function AssetTechnicalSheetCleanView({ scope }: Props) {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const assetId = decodeURIComponent(String(params.id || ''));
  const resolvedScope = scope || (pathname.includes('/mantenimiento/equipos/') ? 'equipos' : 'vehiculos');
  const { data, error, isLoading, mutate } = useSWR<TechnicalSheetResponse>(
    assetId ? `/api/maintenance/assets/${encodeURIComponent(assetId)}/technical-sheet` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const asset = data?.asset;
  const sheet = data?.technicalSheet;
  const referenceSheet = data?.referenceSheet;
  const preventiveAlerts = Array.isArray(data?.preventiveAlerts) ? data.preventiveAlerts : [];
  const componentProfile = Array.isArray(data?.componentProfile) ? data.componentProfile : [];
  const faultModesCount = useMemo(
    () => componentProfile.reduce((total, component) => total + component.faultModes.length, 0),
    [componentProfile],
  );

  if (isLoading) {
    return <StatePanel tone="loading" title="Cargando ficha técnica" description="Leyendo la identidad canónica y sus referencias autorizadas." className="min-h-48" />;
  }

  if (error) {
    return (
      <StatePanel
        tone="error"
        title="No fue posible cargar la ficha técnica"
        description={error.message}
        actions={<Button variant="outline" onClick={() => void mutate()}>Reintentar</Button>}
        className="min-h-48"
      />
    );
  }

  if (!asset) {
    return <StatePanel tone="neutral" title="Activo no encontrado" description="No existe una identidad de activo disponible para esta ficha." className="min-h-48" />;
  }

  const metrics = [
    ['Modelo', display(asset.model)],
    ['Fabricante', display(asset.manufacturer)],
    ['Criticidad', display(asset.criticality)],
    ['Próxima mantención', formatDate(asset.nextMaintenance)],
  ] as const;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Mantenimiento · Activo · Ficha técnica</PageHeaderEyebrow>
          <PageHeaderTitle>{asset.name || asset.code || 'Ficha técnica'}</PageHeaderTitle>
          <PageHeaderDescription>
            Identidad materializada del activo y referencias técnicas separadas por nivel de autoridad. Las sugerencias no completan campos canónicos por sí solas.
          </PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button asChild>
            <Link href={`/dashboard/mantenimiento/ordenes-trabajo/create?assetId=${encodeURIComponent(asset.id)}`}>
              <Wrench className="h-4 w-4" />Crear OT
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/dashboard/mantenimiento/${resolvedScope}/${encodeURIComponent(asset.id)}/ficha`}>
              <FileText className="h-4 w-4" />Ficha completa
            </Link>
          </Button>
        </PageHeaderActions>
      </PageHeader>

      <section aria-label="Identidad técnica" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value]) => (
          <Card key={label} className="shadow-none">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-2 text-xl font-semibold tracking-tight">{value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-lg">Identidad del activo</CardTitle>
            <CardDescription>Campos materializados en el maestro. Los vacíos permanecen explícitos.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            {[
              ['Código', asset.code],
              ['Tipo', asset.type],
              ['Estado operacional', asset.status],
              ['Ubicación', asset.location],
              ['Serie', asset.serialNumber],
              ['Fecha de compra', formatDate(asset.purchaseDate)],
            ].map(([label, value]) => (
              <div key={String(label)} className="border-b pb-3 last:border-0 sm:last:border-b">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 font-medium">{display(value)}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-lg">Especificaciones autorizadas</CardTitle>
            <CardDescription>
              Sólo aparecen cuando la identidad del maestro permite confiar en la referencia técnica asociada.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sheet?.fields?.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {sheet.fields.map((field) => (
                  <div key={field.key} className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">{field.key}</p>
                    <p className="mt-1 font-medium">{field.value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                <PackageOpen className="mt-0.5 h-4 w-4 shrink-0" />
                No hay especificaciones autorizadas para este activo. Una coincidencia por nombre o familia queda como candidata hasta validarse.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {referenceSheet ? (
        <Card className="shadow-none">
          <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-lg">Referencia técnica validada</CardTitle>
              <CardDescription className="mt-1">
                Marca y modelo de la referencia coinciden con la identidad materializada del maestro de mantenimiento.
              </CardDescription>
            </div>
            <Badge variant="outline">Identidad coincidente</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div><p className="text-xs text-muted-foreground">Marca</p><p className="mt-1 font-medium">{display(referenceSheet.brand)}</p></div>
              <div><p className="text-xs text-muted-foreground">Modelo</p><p className="mt-1 font-medium">{display(referenceSheet.model)}</p></div>
              <div><p className="text-xs text-muted-foreground">Familia de referencia</p><p className="mt-1 font-medium">{display(referenceSheet.family)}</p></div>
            </div>
            {referenceSheet.summary ? <p className="text-sm text-muted-foreground">{referenceSheet.summary}</p> : null}
            {referenceSheet.sourceUrl ? (
              <a href={referenceSheet.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline">
                {referenceSheet.sourceLabel || 'Abrir fuente oficial'} <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {preventiveAlerts.length > 0 ? (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-lg">Pautas preventivas de referencia</CardTitle>
            <CardDescription>
              Provienen de una referencia con identidad coincidente. Orientan revisión técnica; no indican falla, vencimiento ni condición operacional observada.
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {preventiveAlerts.slice(0, 6).map((alert) => (
              <div key={alert.code} className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={severityVariant(alert.severity)}>{alert.severity}</Badge>
                  <p className="font-medium">{alert.title}</p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{alert.componentName} · {alert.recommendedAction}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card className="shadow-none">
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-lg">Perfil técnico sugerido</CardTitle>
            <CardDescription className="mt-1">
              Perfil referencial derivado de la familia inferida. No es canónico y requiere validación antes de completar el maestro o tomar decisiones operacionales.
            </CardDescription>
          </div>
          <Badge variant="outline">No canónico</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <span><span className="text-muted-foreground">Familia inferida:</span> {display(data?.inferredFamily)}</span>
            <span><span className="text-muted-foreground">Componentes sugeridos:</span> {componentProfile.length}</span>
            <span><span className="text-muted-foreground">Fallas catalogadas:</span> {faultModesCount}</span>
          </div>
          {componentProfile.length ? (
            <div className="divide-y rounded-md border">
              {componentProfile.slice(0, 8).map((component) => (
                <div key={component.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{component.name || component.code || 'Componente sugerido'}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{component.vehicleType || 'Familia inferida'} · nivel {display(component.level)}</p>
                    </div>
                    <Badge variant="outline">{component.faultModes.length} fallas</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No hay un perfil técnico sugerido para la evidencia disponible.</p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-x-5 gap-y-2 border-t pt-4 text-sm text-muted-foreground" aria-label="Vistas relacionadas">
        <Link className="inline-flex items-center gap-1 hover:text-foreground" href={`/dashboard/mantenimiento/${resolvedScope}/${encodeURIComponent(asset.id)}/arbol`}>
          <History className="h-3.5 w-3.5" />Árbol de fallas
        </Link>
        <Link className="hover:text-foreground" href={`/dashboard/mantenimiento/${resolvedScope}/${encodeURIComponent(asset.id)}/ficha`}>Ficha completa</Link>
      </div>
    </div>
  );
}
