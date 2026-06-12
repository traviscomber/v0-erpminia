'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface NonconformanceCardProps {
  ncNumber: string;
  title: string;
  category: string;
  severity: string;
  status: string;
  discoveredDate: string;
  targetClosureDate?: string;
  assignedTo?: string;
  onViewDetails?: () => void;
}

const severityColors: Record<string, string> = {
  critical: 'bg-destructive/20 text-destructive',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-blue-100 text-blue-800',
};

const statusColors: Record<string, string> = {
  open: 'bg-red-100 text-red-800',
  in_progress: 'bg-blue-100 text-blue-800',
  closed: 'bg-green-100 text-green-800',
};

const statusLabels: Record<string, string> = {
  open: 'Abierta',
  in_progress: 'En progreso',
  closed: 'Cerrada',
};

const statusIcons: Record<string, JSX.Element> = {
  open: <AlertCircle className="h-4 w-4" />,
  in_progress: <Clock className="h-4 w-4" />,
  closed: <CheckCircle className="h-4 w-4" />,
};

export function NonconformanceCard({
  ncNumber,
  title,
  category,
  severity,
  status,
  discoveredDate,
  targetClosureDate,
  assignedTo,
  onViewDetails,
}: NonconformanceCardProps) {
  const isOverdue = targetClosureDate && new Date(targetClosureDate) < new Date();

  return (
    <Card className={isOverdue && status !== 'closed' ? 'border-destructive/50 bg-destructive/5' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardDescription className="text-xs font-mono text-muted-foreground">{ncNumber}</CardDescription>
            <CardTitle className="mt-1 text-base">{title}</CardTitle>
          </div>
          <div className="flex gap-1">
            <Badge className={severityColors[severity] || ''}>{severity}</Badge>
            <Badge className={statusColors[status] || ''} variant="secondary">
              <span className="flex items-center gap-1">
                {statusIcons[status] || null}
                {statusLabels[status] || status}
              </span>
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Categoría</p>
            <p className="font-medium capitalize">{category}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Detectada</p>
            <p className="text-xs font-medium">{new Date(discoveredDate).toLocaleDateString('es-CL')}</p>
          </div>
          {targetClosureDate && (
            <div>
              <p className="text-xs text-muted-foreground">Cierre objetivo</p>
              <p className={`text-xs font-medium ${isOverdue && status !== 'closed' ? 'text-destructive' : ''}`}>
                {new Date(targetClosureDate).toLocaleDateString('es-CL')}
              </p>
            </div>
          )}
          {assignedTo && (
            <div>
              <p className="text-xs text-muted-foreground">Responsable</p>
              <p className="truncate text-xs font-medium">{assignedTo}</p>
            </div>
          )}
        </div>

        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="w-full border-t pt-2 text-sm text-primary hover:underline"
          >
            Ver detalle y acciones correctivas
          </button>
        )}
      </CardContent>
    </Card>
  );
}
