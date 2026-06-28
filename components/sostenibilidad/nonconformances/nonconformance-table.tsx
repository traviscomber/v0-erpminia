'use client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import type { NonconformanceRecord } from '@/components/sostenibilidad/nonconformance-types';

interface NonconformanceTableProps {
  data: NonconformanceRecord[];
  onRowClick: (nc: NonconformanceRecord) => void;
  onEdit: (nc: NonconformanceRecord) => void;
}

export function NonconformanceTable({ data, onRowClick, onEdit }: NonconformanceTableProps) {
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

  const isOverdue = (nc: NonconformanceRecord) => Boolean(nc.target_closure_date) && new Date(nc.target_closure_date as string) < new Date() && nc.status !== 'closed';

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-24">Número</TableHead>
            <TableHead className="w-32">Título</TableHead>
            <TableHead className="w-20">Categoría</TableHead>
            <TableHead className="w-20">Severidad</TableHead>
            <TableHead className="w-24">Estado</TableHead>
            <TableHead className="w-24">Detectada</TableHead>
            <TableHead className="w-24">Cierre</TableHead>
            <TableHead className="w-20">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((nc) => (
            <TableRow key={nc.id} className={isOverdue(nc) ? 'bg-destructive/5' : ''}>
              <TableCell className="font-mono text-xs">{nc.nc_number}</TableCell>
              <TableCell className="text-sm font-medium truncate max-w-xs">{nc.title}</TableCell>
              <TableCell className="text-xs capitalize">{nc.category}</TableCell>
              <TableCell>
                <Badge className={`${severityColors[nc.severity || 'low'] || 'bg-gray-500'} text-xs`} variant="default">
                  {nc.severity || 'low'}
                </Badge>
              </TableCell>
              <TableCell className={`text-sm font-medium ${statusColors[nc.status]}`}>{nc.status}</TableCell>
              <TableCell className="text-xs">{nc.discovered_date ? new Date(nc.discovered_date).toLocaleDateString() : '-'}</TableCell>
              <TableCell className="text-xs">
                <div className="flex items-center gap-1">
                  {isOverdue(nc) && <AlertCircle className="w-4 h-4 text-destructive" />}
                  {nc.target_closure_date ? new Date(nc.target_closure_date).toLocaleDateString() : '-'}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => onRowClick(nc)} className="text-xs">
                    Ver
                  </Button>
                  {nc.status !== 'closed' && (
                    <Button size="sm" variant="outline" onClick={() => onEdit(nc)} className="text-xs">
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
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No se encontraron no conformidades</p>
        </div>
      )}
    </div>
  );
}
