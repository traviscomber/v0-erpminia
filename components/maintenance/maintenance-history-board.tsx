'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertCircle, ArrowRight, Download, History, Search, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la bitácora');
  return payload;
};

type WorkOrderSummary = {
  workOrderNumber: string | null;
  title: string | null;
  status: string | null;
  priority: string | null;
  scheduledDate: string | null;
};

type MaintenanceHistoryEntry = {
  id: string;
  workOrderId: string | null;
  assetId: string | null;
  assetName: string;
  assetCode: string | null;
  assetType: string | null;
  location: string | null;
  criticality: string | null;
  maintenanceType: string | null;
  performedByName: string | null;
  startTime: string | null;
  endTime: string | null;
  partsReplaced: string | null;
  partsCost: number;
  laborHours: number;
  laborCost: number;
  notes: string | null;
  createdAt: string | null;
  createdDate: string | null;
  workOrder: WorkOrderSummary | null;
};

type MaintenanceHistoryResponse = {
  entries?: MaintenanceHistoryEntry[];
};

function normalizeText(value: string | null | undefined) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function maintenanceTypeLabel(type?: string | null) {
  const labels: Record<string, string> = {
    preventive: 'Preventiva',
    corrective: 'Correctiva',
    predictive: 'Predictiva',
  };
  return labels[normalizeText(type)] || type || 'Sin tipo';
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function MaintenanceHistoryBoard() {
  const [searchTerm, setSearchTerm] = useState('');
  const { data, error, isLoading, mutate } = useSWR<MaintenanceHistoryResponse>(
    '/api/maintenance/history?limit=200',
    fetcher,
  );

  const entries = Array.isArray(data?.entries) ? data.entries : [];
  const query = normalizeText(searchTerm);

  const filteredEntries = useMemo(() => {
    if (!query) return entries;
    return entries.filter((entry) =>
      [
        entry.assetName,
        entry.assetCode,
        entry.assetType,
        entry.location,
        entry.maintenanceType,
        entry.performedByName,
        entry.notes,
        entry.workOrder?.workOrderNumber,
        entry.workOrder?.title,
      ]
        .map(normalizeText)
        .join(' ')
        .includes(query),
    );
  }, [entries, query]);

  const groupedByAsset = useMemo(() => {
    const groups = new Map<string, MaintenanceHistoryEntry[]>();
    filteredEntries.forEach((entry) => {
      const key = entry.assetId || entry.assetCode || entry.assetName || 'sin-activo';
      const current = groups.get(key) || [];
      current.push(entry);
      groups.set(key, current);
    });

    return Array.from(groups.entries())
      .map(([key, rows]) => ({
        key,
        assetId: rows[0].assetId,
        assetName: rows[0].assetName,
        assetCode: rows[0].assetCode,
        assetType: rows[0].assetType,
        location: rows[0].location,
        criticality: rows[0].criticality,
        rows: [...rows].sort((a, b) => String(b.createdAt || b.createdDate || '').localeCompare(String(a.createdAt || a.createdDate || ''))),
      }))
      .sort((a, b) => a.assetName.localeCompare(b.assetName, 'es'));
  }, [filteredEntries]);

  const summary = useMemo(
    () => ({
      total: entries.length,
      assets: new Set(entries.map((entry) => entry.assetId || entry.assetCode || entry.assetName)).size,
      laborHours: entries.reduce((sum, entry) => sum + Number(entry.laborHours || 0), 0),
      totalCost: entries.reduce(
        (sum, entry) => sum + Number(entry.partsCost || 0) + Number(entry.laborCost || 0),
        0,
      ),
    }),
    [entries],
  );

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b border-border/70 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Mantenimiento · Operación diaria</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Bitácora de mantenimiento</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Historial consolidado por equipo, orden de trabajo, responsables, horas y costos registrados.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/mantenimiento/bitacora/importar">
              <Download className="mr-2 h-4 w-4" />
              Importar
            </Link>
          </Button>
          <Button variant="outline" onClick={() => void mutate()}>
            <History className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
          <Button asChild>
            <Link href="/dashboard/mantenimiento/planificacion">
              Ver planificación
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Registros', summary.total],
          ['Equipos intervenidos', summary.assets],
          ['Horas hombre', summary.laborHours],
          ['Costo acumulado', formatCurrency(summary.totalCost)],
        ].map(([label, value]) => (
          <Card key={String(label)} className="border-border/70 shadow-none">
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="border-border/70 shadow-none">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar equipo, OT, técnico, tipo o nota"
                className="pl-9"
              />
            </div>
            {searchTerm ? (
              <Button variant="ghost" onClick={() => setSearchTerm('')}>
                <X className="mr-2 h-4 w-4" />
                Limpiar
              </Button>
            ) : null}
            <p className="text-sm text-muted-foreground">
              {filteredEntries.length} de {entries.length} registros
            </p>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Card className="border-destructive/30 bg-destructive/5 shadow-none">
          <CardContent className="flex items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">No se pudo cargar la bitácora</p>
                <p className="text-sm text-muted-foreground">Los datos existentes no fueron modificados.</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => void mutate()}>Reintentar</Button>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : groupedByAsset.length === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No hay registros para los criterios seleccionados.
          </CardContent>
        </Card>
      ) : (
        <section className="space-y-4">
          {groupedByAsset.map((group) => (
            <Card key={group.key} className="overflow-hidden border-border/70 shadow-none">
              <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <CardTitle className="text-base">{group.assetName}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[group.assetCode, group.assetType, group.location].filter(Boolean).join(' · ') || 'Sin información adicional'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{group.rows.length} registros</Badge>
                    {group.criticality ? <Badge variant="secondary">{String(group.criticality)}</Badge> : null}
                    {group.assetId ? (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/dashboard/mantenimiento/equipos/${group.assetId}/ficha`}>
                          Ver equipo
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="divide-y divide-border/60 p-0">
                {group.rows.map((entry) => (
                  <article key={entry.id} className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-start">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{maintenanceTypeLabel(entry.maintenanceType)}</Badge>
                        <span className="font-mono text-xs text-muted-foreground">
                          {entry.workOrder?.workOrderNumber || 'Sin OT'}
                        </span>
                        <span className="text-sm font-medium">{entry.workOrder?.title || 'Mantención registrada'}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{entry.notes || 'Sin observaciones registradas.'}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {entry.partsReplaced ? <span>Repuestos: {entry.partsReplaced}</span> : null}
                        <span>Horas: {Number(entry.laborHours || 0)}</span>
                        <span>Costo: {formatCurrency(Number(entry.partsCost || 0) + Number(entry.laborCost || 0))}</span>
                      </div>
                    </div>
                    <div className="text-left text-sm md:text-right">
                      <p className="font-medium">{entry.createdDate || 'Sin fecha'}</p>
                      <p className="mt-1 text-muted-foreground">{entry.performedByName || 'Sin responsable'}</p>
                      {entry.workOrderId ? (
                        <Button asChild variant="link" size="sm" className="mt-1 h-auto p-0">
                          <Link href={`/dashboard/mantenimiento/ordenes-trabajo/${entry.workOrderId}`}>Ver OT</Link>
                        </Button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
