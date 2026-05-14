'use client';

import { Badge } from '@/components/ui/badge';

export type StatusType = 'draft' | 'pending' | 'approved' | 'complete' | 'cancelled' | 'paid' | 'overdue' | 'confirmed' | 'shipped';

const statusConfig: Record<StatusType, { color: string; label: string }> = {
  draft: { color: 'bg-muted text-muted-foreground', label: 'Borrador' },
  pending: { color: 'bg-primary/10 text-primary', label: 'Pendiente' },
  approved: { color: 'bg-secondary/10 text-secondary', label: 'Aprobado' },
  complete: { color: 'bg-secondary/10 text-secondary', label: 'Completado' },
  cancelled: { color: 'bg-destructive/10 text-destructive', label: 'Cancelado' },
  paid: { color: 'bg-secondary/10 text-secondary', label: 'Pagado' },
  overdue: { color: 'bg-destructive/10 text-destructive', label: 'Vencido' },
  confirmed: { color: 'bg-secondary/10 text-secondary', label: 'Confirmado' },
  shipped: { color: 'bg-primary/10 text-primary', label: 'Enviado' },
};

export function StatusBadge({ status, label }: { status: StatusType; label?: string }) {
  const config = statusConfig[status];
  return (
    <Badge className={config.color}>
      {label || config.label}
    </Badge>
  );
}
