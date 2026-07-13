'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertCircle, ArrowRight, CalendarClock, Download, Filter, History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

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
  assets?: unknown[];
  summary?: {
    total?: number;
    assets?: number;
  };
};

function maintenanceTypeLabel(type?: string | null) {
  const labels: Record<string, string> = {
    preventive: 'Preventiva',
    corrective: 'Correctiva',
    predictive: 'Predictiva',
  };
  return labels[String(type || '').toLowerCase()] || type || 'Sin tipo';
}

function formatCurrency(value: number) {
  return `$${Number(value || 0).toLocaleString('es-CL')}`;
}

export function MaintenanceHistoryBoard() {
  const [searchTerm, setSearchTerm] = useState('');
  const { data, error, isLoading, mutate } = useSWR<MaintenanceHistoryResponse>(
    '/api/maintenance/history?limit=200',
    fetcher
  );

  const entries = Array.isArray(data?.entries) ? data.entries : [];
  const groupedByAsset = useMemo(() => {
    const groups = new Map<string, MaintenanceHistoryEntry[]>();
    entries.forEach((entry) => {
      const key = entry.assetId || entry.assetCode || entry.assetName || 'sin-activo';
      const bucket = groups.get(key) || [];
      bucket.push(entry);
      groups.set(key, bucket);
    });

    const query = searchTerm.trim().toLowerCase();

    return Array.from(groups.entries())
      .map(([key, rows]) => {
        const first = rows[0];
        return {
          key,
          assetId: first.assetId,
          assetName: first.assetName,
          assetCode: first.assetCode,
          assetType: first.assetType,
          location: first.location,
          criticality: first.criticality,
          rows: rows.filter((row) => {
            if (!query) return true;
            const searchable = [
              row.assetName,
              row.assetCode,
              row.assetType,
              row.location,
              row.maintenanceType,
              row.performedByName,
              row.notes,
              row.workOrder?.workOrderNumber,
              row.workOrder?.title,
            ]
              .map((value) => String(value || '').toLowerCase())
              .join(' ');
            return searchable.includes(query);
          }),
        };
      })
      .filter((group) => group.rows.length > 0)
      .sort((a, b) => a.assetName.localeCompare(b.assetName, 'es'));
  }, [entries, searchTerm]);

  const summary = {
    total: entries.length,
    assets: groupedByAsset.length,
    totalPartsCost: entries.reduce((sum, entry) => sum + Number(entry.partsCost || 0), 0),
    totalLaborHours: entries.reduce((sum, entry) => sum + Number(entry.laborHours || 0), 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bitácora de mantenimiento</h1>
          <p className="mt-2 text-muted-foreground">
            Historial real por equipo con mantenciones, repuestos y responsables.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard/mantenimiento/bitacora/importar">
              <Download className="h-4 w-4" />
              Importar Excel
            </Link>
          </Button>
          <Button variant="outline" onClick={() => void mutate()} className="gap-2">
            <History className="h-4 w-4" />
            Recargar bitácora
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard/mantenimiento/vehiculos">
              Vehículos y QR
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild className="gap-2">
            <Link href="/dashboard/mantenimiento/planificacion">
              <CalendarClock className="h-4 w-4" />
              Ver planificación
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Registros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Equipos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.assets}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Horas hombre</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalLaborHours}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Costo repuestos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalPartsCost)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Buscar equipo o mantención
          </CardTitle>
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar por equipo, OT, tipo, técnico o nota"
          />
        </CardHeader>
      </Card>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          No fue posible cargar la bitácora real de mantenimiento.
        </div>
      ) : isLoading ? (
        <div className="text-sm text-muted-foreground">Cargando bitacora...</div>
      ) : groupedByAsset.length === 0 ? (
        <Card>
          <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            No hay registros para mostrar con el filtro actual.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groupedByAsset.map((group) => (
            <Card key={group.key}>
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <CardTitle className="text-lg">{group.assetName}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {group.assetCode || '-'} {group.assetType ? ` · ${group.assetType}` : ''}
                      {group.location ? ` · ${group.location}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{group.rows.length} registros</Badge>
                    {group.criticality ? <Badge>{String(group.criticality)}</Badge> : null}
                    {group.assetId ? (
                      <Button variant="outline" size="sm" asChild className="gap-2">
                        <Link href={`/dashboard/mantenimiento/vehiculos/${group.assetId}/arbol`}>
                          Ver ficha
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    ) : null}
                    {group.assetId ? (
                      <Button variant="outline" size="sm" asChild className="gap-2">
                        <Link href={`/dashboard/mantenimiento/vehiculos/${group.assetId}/qr`}>
                          Ver QR
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {group.rows.slice(0, 8).map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-border bg-background p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">{maintenanceTypeLabel(entry.maintenanceType)}</Badge>
                          <span className="text-sm font-semibold">
                            {entry.workOrder?.workOrderNumber || 'Sin OT'}
                          </span>
                          <span className="text-sm text-muted-foreground">{entry.workOrder?.title || 'Mantención registrada'}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{entry.notes || 'Sin observaciones'}</p>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          {entry.partsReplaced ? <span>Repuestos: {entry.partsReplaced}</span> : null}
                          <span>Horas: {entry.laborHours || 0}</span>
                          <span>Costo: {formatCurrency(Number(entry.partsCost || 0) + Number(entry.laborCost || 0))}</span>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>{entry.createdDate || 'Sin fecha'}</p>
                        {entry.performedByName ? <p className="mt-1 font-medium text-foreground">{entry.performedByName}</p> : null}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

