'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Trash2 } from 'lucide-react';

interface NonconformanceTableProps {
  data: any[];
  severityColors: Record<string, string>;
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
            const isOverdue = new Date(nc.due_date) < new Date();
            return (
              <TableRow key={nc.id}>
                <TableCell className="font-mono text-sm">{nc.nc_number}</TableCell>
                <TableCell className="font-medium">{nc.title}</TableCell>
                <TableCell>
                  <Badge className={severityColors[nc.severity] || 'bg-gray-100'}>
                    {nc.severity}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{nc.status}</Badge>
                </TableCell>
                <TableCell className={isOverdue ? 'text-red-600 font-semibold' : ''}>
                  {new Date(nc.due_date).toLocaleDateString()}
                </TableCell>
                <TableCell>{nc.corrective_actions.length || 0} CAs</TableCell>
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
