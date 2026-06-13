'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, ChevronRight } from 'lucide-react';

interface NonconformanceCardProps {
  nc: any;
  onViewDetails: (id: string) => void;
  onCreateCA: (ncId: string) => void;
  severityColors: Record<string, string>;
}

export function NonconformanceCard({ nc, onViewDetails, onCreateCA, severityColors }: NonconformanceCardProps) {
  const isOverdue = new Date(nc.due_date) < new Date();
  const caProgress = nc.corrective_actions.length
    ? Math.round((nc.corrective_actions.filter((ca: any) => ca.status === 'verified').length / nc.corrective_actions.length) * 100)
    : 0;

  return (
    <Card className="p-4 rounded-xl border shadow-none transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="font-mono text-sm text-muted-foreground">{nc.nc_number}</div>
          <h3 className="font-semibold text-lg">{nc.title}</h3>
        </div>
        <Badge className={`${severityColors[nc.severity] || 'bg-gray-100'}`}>
          {nc.severity}
        </Badge>
      </div>

      <div className="space-y-2 mb-4 text-sm text-muted-foreground">
        <div className="flex justify-between">
          <span>Estado:</span>
          <Badge variant="outline">{nc.status}</Badge>
        </div>
        <div className="flex justify-between">
          <span>Vencimiento:</span>
          <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>
            {new Date(nc.due_date).toLocaleDateString()}
            {isOverdue && ' ⚠️'}
          </span>
        </div>
      </div>

      {nc.corrective_actions.length > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span>Acciones ({nc.corrective_actions.length})</span>
            <span>{caProgress}%</span>
          </div>
          <Progress value={caProgress} className="h-2" />
        </div>
      )}

      <div className="flex gap-2 pt-3 border-t">
        <Button variant="ghost" size="sm" className="flex-1" onClick={() => onViewDetails(nc.id)}>
          Ver Detalles
        </Button>
        <Button size="sm" className="flex-1" onClick={() => onCreateCA(nc.id)}>
          + Acción Correctiva
        </Button>
      </div>
    </Card>
  );
}
