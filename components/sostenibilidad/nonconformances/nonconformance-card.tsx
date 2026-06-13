'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  const correctiveActions = Array.isArray(nc.corrective_actions) ? nc.corrective_actions : [];
  const hasDueDate = !!nc.target_closure_date;
  const isOverdue = hasDueDate && new Date(nc.target_closure_date) < new Date() && nc.status !== 'closed';
  const completedActions = correctiveActions.filter((ca: any) => ca.status === 'verified').length;
  const caProgress = correctiveActions.length
    ? Math.round((completedActions / correctiveActions.length) * 100)
    : 0;

  return (
    <Card className={`p-4 rounded-xl border shadow-none transition-shadow ${isOverdue ? 'border-destructive/40 bg-destructive/5' : ''}`}>
      <div className="flex justify-between items-start mb-3 gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-mono text-sm text-muted-foreground">{nc.nc_number}</div>
          <h3 className="font-semibold text-lg truncate">{nc.title}</h3>
          <p className="text-xs text-muted-foreground mt-1 capitalize">{nc.category}</p>
        </div>
        <Badge className={severityColors[nc.severity] || 'bg-gray-100'}>
          {nc.severity}
        </Badge>
      </div>

      <div className="space-y-2 mb-4 text-sm text-muted-foreground">
        <div className="flex justify-between gap-3">
          <span>Estado:</span>
          <Badge variant="outline">{nc.status}</Badge>
        </div>
        <div className="flex justify-between gap-3">
          <span>Vencimiento:</span>
          <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>
            {hasDueDate ? new Date(nc.target_closure_date).toLocaleDateString() : 'Sin fecha'}
            {isOverdue && ' ⚠'}
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
          Ver detalles
        </Button>
        <Button size="sm" className="flex-1" onClick={() => onCreateCA(nc.id)}>
          <ChevronRight className="w-4 h-4 mr-1" />
          Acción correctiva
        </Button>
      </div>
    </Card>
  );
}
