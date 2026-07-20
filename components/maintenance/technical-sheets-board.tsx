'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ArrowRight, FileText, RefreshCw, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type TechnicalSheetItem = {
  id: string;
  model_name?: string | null;
  brand_name?: string | null;
  source_url?: string | null;
  source_type?: string | null;
  source_version?: string | null;
  validated?: boolean | null;
  updated_at?: string | null;
  components_count?: number | null;
  fault_modes_count?: number | null;
  asset?: {
    id?: string;
    asset_code?: string | null;
    asset_name?: string | null;
    asset_type?: string | null;
    model?: string | null;
    manufacturer?: string | null;
    criticality?: string | null;
    status?: string | null;
  } | null;
};

type TechnicalSheetsResponse = {
  sheets?: TechnicalSheetItem[];
  error?: string;
};

const fetcher = async (url: string): Promise<TechnicalSheetsResponse> => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || 'No fue posible cargar las fichas técnicas');
  }
  return payload;
};

function normalizeText(value: string | null | undefined) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function resolveScope(assetType: string | null | undefined, model: string | null | undefined, manufacturer: string | null | undefined) {
  const text = normalizeText([assetType, model, manufacturer].filter(Boolean).join(' '));
  const vehicleHints = ['vehiculo', 'vehiculos', 'camioneta', 'camion', 'pickup', 'bus', 'furgon', 'tractor', 'auto'];
  if (vehicleHints.some((hint) => text.includes(hint))) return 'vehiculos';
  return 'equipos';
}

export function TechnicalSheetsBoard() {
  const { data, error, isLoading, mutate } = useSWR<TechnicalSheetsResponse>('/api/maintenance/technical-sheets', fetcher);
  const sheets = Array.isArray(data?.sheets) ? data.sheets : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fichas técnicas</h1>
          <p className="mt-2 text-muted-foreground">
            Base técnica real de activos, componentes y fallas para mantenimiento.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/mantenimiento/fichas-tecnicas/importar">
              <Upload className="mr-2 h-4 w-4" />
              Importar base
            </Link>
          </Button>
          <Button variant="outline" onClick={() => void mutate()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Recargar
          </Button>
          <Button asChild>
            <Link href="/dashboard/mantenimiento/gerencial">
              <ArrowRight className="mr-2 h-4 w-4" />
              Gerencial
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Fichas cargadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{sheets.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Componentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{sheets.reduce((sum, item) => sum + Number(item.components_count || 0), 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Fallas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{sheets.reduce((sum, item) => sum + Number(item.fault_modes_count || 0), 0)}</div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Cargando fichas técnicas...</div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          No fue posible cargar las fichas técnicas.
        </div>
      ) : sheets.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No hay fichas técnicas cargadas todavía.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {sheets.map((sheet) => (
            <Card key={sheet.id}>
              <CardHeader>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <CardTitle className="text-lg">{sheet.asset?.asset_name || sheet.model_name || 'Ficha técnica'}</CardTitle>
                    <CardDescription>
                      {sheet.asset?.asset_code || 'Sin código'} | {sheet.brand_name || 'Sin marca'} | {sheet.asset?.model || sheet.model_name || '-'}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={sheet.validated ? 'default' : 'outline'}>{sheet.validated ? 'Validada' : 'Borrador'}</Badge>
                    <Badge variant="outline">{sheet.components_count || 0} componentes</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {sheet.source_url || 'Sin fuente técnica cargada'} {sheet.source_version ? `| v${sheet.source_version}` : ''}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link
                      href={
                        sheet.asset?.id
                          ? `/dashboard/mantenimiento/${resolveScope(sheet.asset.asset_type, sheet.asset.model, sheet.asset.manufacturer)}/${sheet.asset.id}/ficha-tecnica`
                          : '/dashboard/mantenimiento/fichas-tecnicas'
                      }
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Abrir ficha
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
