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
  const severityColors: any = {
    critical: 'bg-destructive/20 text-destructive',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-blue-100 text-blue-800',
  };

  const statusColors: any = {
    open: 'bg-red-100 text-red-800',
    in_progress: 'bg-blue-100 text-blue-800',
    closed: 'bg-green-100 text-green-800',
  };

  const statusIcons: any = {
    open: <AlertCircle className="w-4 h-4" />,
    in_progress: <Clock className="w-4 h-4" />,
    closed: <CheckCircle className="w-4 h-4" />,
  };

  const isOverdue = targetClosureDate && new Date(targetClosureDate) < new Date();

  return (
    <Card className={isOverdue && status !== 'closed' ? 'border-destructive/50 bg-destructive/5' : ''}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <div>
            <CardDescription className="text-xs font-mono text-muted-foreground">{ncNumber}</CardDescription>
            <CardTitle className="text-base mt-1">{title}</CardTitle>
          </div>
          <div className="flex gap-1">
            <Badge className={severityColors[severity] || ''}>{severity}</Badge>
            <Badge className={statusColors[status] || ''} variant="secondary">
              <span className="flex items-center gap-1">{statusIcons[status]} {status}</span>
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Categoria</p>
            <p className="font-medium capitalize">{category}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Detectada</p>
            <p className="font-medium text-xs">{new Date(discoveredDate).toLocaleDateString()}</p>
          </div>
          {targetClosureDate && (
            <div>
              <p className="text-muted-foreground text-xs">Cierre objetivo</p>
              <p className={`font-medium text-xs ${isOverdue && status !== 'closed' ? 'text-destructive' : ''}`}>
                {new Date(targetClosureDate).toLocaleDateString()}
              </p>
            </div>
          )}
          {assignedTo && (
            <div>
              <p className="text-muted-foreground text-xs">Asignada a</p>
              <p className="font-medium text-xs truncate">{assignedTo}</p>
            </div>
          )}
        </div>

        {onViewDetails && (
          <button onClick={onViewDetails} className="w-full text-sm text-primary hover:underline pt-2 border-t">
            Ver detalles y acciones correctivas
          </button>
        )}
      </CardContent>
    </Card>
  );
}
