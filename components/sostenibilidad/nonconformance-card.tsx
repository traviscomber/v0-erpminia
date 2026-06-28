'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, ChevronRight } from 'lucide-react';
import type { NonconformanceRecord, CorrectiveActionRecord } from '@/components/sostenibilidad/nonconformance-types';

interface NonconformanceCardProps {
  nc: NonconformanceRecord;
  onViewDetails: (id: string) => void;
  onCreateCA: (ncId: string) => void;
  severityColors: Record<string, string>;
}

function formatDueDate(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function NonconformanceCard({ nc, onViewDetails, onCreateCA, severityColors }: NonconformanceCardProps) {
  const correctiveActions = Array.isArray(nc.corrective_actions) ? nc.corrective_actions : [];
  const dueDate = formatDueDate(nc.target_closure_date || nc.due_date);
  const hasDueDate = Boolean(dueDate);
  const isOverdue = hasDueDate && new Date(dueDate) < new Date() && nc.status !== 'closed';
  const caProgress = correctiveActions.length
    ? Math.round((correctiveActions.filter((ca: CorrectiveActionRecord) => ca.status === 'verified').length / correctiveActions.length) * 100)
    : 0;

  return (
    <Card className="p-4 rounded-xl border shadow-none transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="font-mono text-sm text-muted-foreground">{nc.nc_number}</div>
          <h3 className="font-semibold text-lg">{nc.title}</h3>
        </div>
        <Badge className={`${severityColors[nc.severity || 'low'] || 'bg-gray-100'}`}>
          {nc.severity || 'low'}
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
            {hasDueDate ? new Date(dueDate).toLocaleDateString() : 'Sin fecha'}
            {isOverdue && ' ⚠️'}
          </span>
        </div>
      </div>

      {correctiveActions.length > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span>Acciones ({correctiveActions.length})</span>
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
