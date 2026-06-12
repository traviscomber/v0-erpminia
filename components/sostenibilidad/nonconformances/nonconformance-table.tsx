'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

type NonconformanceRow = {
  id: string;
  nc_number?: string | null;
  title?: string | null;
  category?: string | null;
  severity?: string | null;
  status?: string | null;
  discovered_date?: string | null;
  target_closure_date?: string | null;
};

interface NonconformanceTableProps {
  data: NonconformanceRow[];
  onRowClick?: (nc: NonconformanceRow) => void;
  onEdit?: (nc: NonconformanceRow) => void;
}

const severityColors: Record<string, string> = {
  critical: 'bg-destructive',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
};

const statusColors: Record<string, string> = {
  open: 'text-destructive',
  in_progress: 'text-blue-600',
  closed: 'text-green-600',
};

const severityLabels: Record<string, string> = {
  critical: 'Crítica',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};

const statusLabels: Record<string, string> = {
  open: 'Abierta',
  in_progress: 'En progreso',
  closed: 'Cerrada',
};

export function NonconformanceTable({ data, onRowClick, onEdit }: NonconformanceTableProps) {
  const isOverdue = (nc: NonconformanceRow) =>
    Boolean(nc.target_closure_date) &&
    new Date(nc.target_closure_date as string) < new Date() &&
    nc.status !== 'closed';

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-24">N° NC</TableHead>
            <TableHead className="w-32">Título</TableHead>
            <TableHead className="w-20">Categoría</TableHead>
            <TableHead className="w-20">Severidad</TableHead>
            <TableHead className="w-24">Estado</TableHead>
            <TableHead className="w-24">Detectada</TableHead>
            <TableHead className="w-24">Cierre objetivo</TableHead>
            <TableHead className="w-20">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((nc) => (
            <TableRow key={nc.id} className={isOverdue(nc) ? 'bg-destructive/5' : ''}>
              <TableCell className="font-mono text-xs">{nc.nc_number}</TableCell>
              <TableCell className="max-w-xs truncate text-sm font-medium">{nc.title}</TableCell>
              <TableCell className="text-xs capitalize">{nc.category}</TableCell>
              <TableCell>
                <Badge className={`${severityColors[nc.severity || ''] || 'bg-gray-500'} text-xs`} variant="default">
                  {severityLabels[nc.severity || ''] || nc.severity}
                </Badge>
              </TableCell>
              <TableCell className={`text-sm font-medium ${statusColors[nc.status || ''] || ''}`}>
                {statusLabels[nc.status || ''] || nc.status}
              </TableCell>
              <TableCell className="text-xs">
                {nc.discovered_date ? new Date(nc.discovered_date).toLocaleDateString('es-CL') : '-'}
              </TableCell>
              <TableCell className="text-xs">
                <div className="flex items-center gap-1">
                  {isOverdue(nc) && <AlertCircle className="h-4 w-4 text-destructive" />}
                  {nc.target_closure_date
                    ? new Date(nc.target_closure_date).toLocaleDateString('es-CL')
                    : '-'}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => onRowClick?.(nc)} className="text-xs">
                    Ver
                  </Button>
                  {nc.status !== 'closed' && (
                    <Button size="sm" variant="outline" onClick={() => onEdit?.(nc)} className="text-xs">
                      Editar
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {data.length === 0 && (
        <div className="py-8 text-center text-muted-foreground">
          <p className="text-sm">No hay no conformidades registradas</p>
        </div>
      )}
    </div>
  );
}
