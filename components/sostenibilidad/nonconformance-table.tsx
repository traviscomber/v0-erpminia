'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Trash2 } from 'lucide-react';
import type { NonconformanceRecord } from '@/components/sostenibilidad/nonconformance-types';

interface NonconformanceTableProps {
  data: NonconformanceRecord[];
  severityColors: Record<string, string>;
}

function formatDueDate(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function NonconformanceTable({ data, severityColors }: NonconformanceTableProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Número</TableHead>
            <TableHead>Título</TableHead>
            <TableHead>Severidad</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Vencimiento</TableHead>
            <TableHead>Acciones</TableHead>
            <TableHead className="w-16"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((nc) => {
            const dueDate = formatDueDate(nc.target_closure_date || nc.due_date || nc.target_date);
            const isOverdue = dueDate ? new Date(dueDate) < new Date() : false;
            const correctiveActions = Array.isArray(nc.corrective_actions) ? nc.corrective_actions : [];
            return (
              <TableRow key={nc.id}>
                <TableCell className="font-mono text-sm">{nc.nc_number}</TableCell>
                <TableCell className="font-medium">{nc.title}</TableCell>
                <TableCell>
                  <Badge className={severityColors[nc.severity || 'low'] || 'bg-gray-100'}>
                    {nc.severity || 'low'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{nc.status}</Badge>
                </TableCell>
                <TableCell className={isOverdue ? 'text-red-600 font-semibold' : ''}>
                  {dueDate ? new Date(dueDate).toLocaleDateString() : 'Sin fecha'}
                </TableCell>
                <TableCell>{correctiveActions.length} CAs</TableCell>
                <TableCell className="flex gap-1">
                  <Button variant="ghost" size="sm">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
