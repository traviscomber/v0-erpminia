'use client';

import useSWR from 'swr';
import { ArrowLeft, CalendarDays, Database, FileText, RefreshCw, Save, Wrench } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ExpedientDefinition, ExpedientRecord } from '@/lib/maintenance/expedient-catalog';

type ExpedientApiResponse = {
  records: Array<ExpedientRecord & { canonicalSection: string }>;
  summary: {
    asset: string;
    location: string;
    records: number;
    categories: {
      ot_historica: number;
      arbol_fallas: number;
      componentes: number;
    };
  } | null;
  persisted?: boolean;
  error?: string;
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || 'No fue posible cargar el expediente');
  }
  return payload as ExpedientApiResponse;
};

const sectionLabels: Record<string, string> = {
  ot_historica: 'OT historica',
  arbol_fallas: 'Arbol de fallas',
  componentes: 'Componentes',
  ficha_equipo: 'Ficha de equipo',
  modificaciones: 'Modificaciones',
  pendiente_clasificar: 'Pendiente de clasificar',
};

function renderRecord(record: ExpedientRecord) {
  return (
    <div key={record.id} className="rounded-xl border border-border/70 bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{record.title}</h3>
            <Badge variant="secondary">{sectionLabels[record.canonicalSection] || record.canonicalSection}</Badge>
            <Badge variant="outline">{record.kind}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{record.summary}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          {record.date}
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fuente</p>
          <p className="text-sm">{record.source}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Causa</p>
          <p className="text-sm">{record.cause || '-'}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Solucion</p>
          <p className="text-sm">{record.solution || '-'}</p>
        </div>
      </div>

      {record.components && record.components.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Componentes</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {record.components.map((component) => (
              <Badge key={component} variant="outline">
                {component}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {record.extractedData ? (
        <div className="mt-3 rounded-lg border border-border bg-background/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Datos extraidos</p>
          <pre className="mt-2 overflow-x-auto text-xs leading-5 text-muted-foreground">
            {JSON.stringify(record.extractedData, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

export function ExpedientBatchView({ definition }: { definition: ExpedientDefinition }) {
  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const { data, isLoading, mutate } = useSWR<ExpedientApiResponse>(
    `/api/maintenance/expedientes?expedientKey=${encodeURIComponent(definition.expedientKey)}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const records = data?.records && data.records.length > 0 ? data.records : definition.records;
  const summary = data?.summary || definition.summary;
  const persisted = Boolean(data?.persisted);

  const componentCount = useMemo(
    () => records.reduce((count, record) => count + (record.components?.length || 0), 0),
    [records]
  );

  const handlePersist = async () => {
    setIsSaving(true);
    setLocalError(null);
    try {
      const response = await fetch('/api/maintenance/expedientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          expedientKey: definition.expedientKey,
          replace: true,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'No fue posible guardar el expediente');
      }
      await mutate();
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Error inesperado');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--brand-cobre)]/20 bg-[var(--brand-cobre)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--brand-cobre)]">
            Expediente cargado
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{definition.title}</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">{definition.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/mantenimiento/documentos/expedientes">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a expedientes
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/mantenimiento/documentos">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a documentos
            </Link>
          </Button>
          <Button onClick={handlePersist} disabled={isSaving} className="gap-2">
            {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {persisted ? 'Actualizar en base' : 'Guardar en base'}
          </Button>
        </div>
      </div>

      {localError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {localError}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Registros</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{summary.records}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">OT historicas</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{summary.categories.ot_historica}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Arbol de fallas</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{summary.categories.arbol_fallas}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Componentes</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{componentCount}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-[var(--brand-cobre)]" />
            Persistencia y lectura
          </CardTitle>
          <CardDescription>
            {persisted
              ? 'Este lote ya está guardado en la base y la pantalla lo lee desde el API.'
              : 'Este lote aún no está guardado. Puedes persistirlo con un solo clic.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={handlePersist} disabled={isSaving} variant="outline">
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Guardando...' : 'Guardar lote'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[var(--brand-cobre)]" />
            Lote documental
          </CardTitle>
          <CardDescription>Entradas normalizadas para consulta rapida y futura carga a base de datos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && !data
            ? definition.records.map((record) => renderRecord(record))
            : records.map((record) => renderRecord(record))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-[var(--brand-verde)]" />
            Siguiente carga
          </CardTitle>
          <CardDescription>
            Cuando envies nuevas imagenes, las sigo clasificando aqui mismo y extiendo este expediente con la misma estructura.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/mantenimiento/equipos">Ir al equipo</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/mantenimiento/documentos/expedientes">Abrir indice de expedientes</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/mantenimiento/documentos">Volver al centro documental</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
