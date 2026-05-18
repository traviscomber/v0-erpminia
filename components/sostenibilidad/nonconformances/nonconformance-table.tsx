'use client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface NonconformanceTableProps {
  data: any[];
  onRowClick?: (nc: any) => void;
  onEdit?: (nc: any) => void;
}

export function NonconformanceTable({ data, onRowClick, onEdit }: NonconformanceTableProps) {
  const severityColors: any = {
    critical: 'bg-destructive',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-blue-500',
  };

  const statusColors: any = {
    open: 'text-destructive',
    in_progress: 'text-blue-600',
    closed: 'text-green-600',
  };

  const isOverdue = (nc: any) => nc.target_closure_date && new Date(nc.target_closure_date) < new Date() && nc.status !== 'closed';

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-24">NC Number</TableHead>
            <TableHead className="w-32">Title</TableHead>
            <TableHead className="w-20">Category</TableHead>
            <TableHead className="w-20">Severity</TableHead>
            <TableHead className="w-24">Status</TableHead>
            <TableHead className="w-24">Discovered</TableHead>
            <TableHead className="w-24">Target Close</TableHead>
            <TableHead className="w-20">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((nc) => (
            <TableRow key={nc.id} className={isOverdue(nc) ? 'bg-destructive/5' : ''}>
              <TableCell className="font-mono text-xs">{nc.nc_number}</TableCell>
              <TableCell className="text-sm font-medium truncate max-w-xs">{nc.title}</TableCell>
              <TableCell className="text-xs capitalize">{nc.category}</TableCell>
              <TableCell>
                <Badge className={`${severityColors[nc.severity] || 'bg-gray-500'} text-xs`} variant="default">
                  {nc.severity}
                </Badge>
              </TableCell>
              <TableCell className={`text-sm font-medium ${statusColors[nc.status]}`}>{nc.status}</TableCell>
              <TableCell className="text-xs">{new Date(nc.discovered_date).toLocaleDateString()}</TableCell>
              <TableCell className="text-xs">
                <div className="flex items-center gap-1">
                  {isOverdue(nc) && <AlertCircle className="w-4 h-4 text-destructive" />}
                  {nc.target_closure_date ? new Date(nc.target_closure_date).toLocaleDateString() : '-'}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => onRowClick?.(nc)} className="text-xs">
                    View
                  </Button>
                  {nc.status !== 'closed' && (
                    <Button size="sm" variant="outline" onClick={() => onEdit?.(nc)} className="text-xs">
                      Edit
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
          <p className="text-sm">No non-conformances found</p>
        </div>
      )}
    </div>
  );
}
