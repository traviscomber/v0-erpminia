'use client';

import { Badge } from '@/components/ui/badge';

export type StatusType = 'draft' | 'pending' | 'approved' | 'complete' | 'cancelled' | 'paid' | 'overdue' | 'confirmed' | 'shipped';

const statusConfig: Record<StatusType, { color: string; label: string }> = {
  draft: { color: 'bg-gray-100 text-gray-800', label: 'Borrador' },
  pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pendiente' },
  approved: { color: 'bg-blue-100 text-blue-800', label: 'Aprobado' },
  complete: { color: 'bg-green-100 text-green-800', label: 'Completado' },
  cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelado' },
  paid: { color: 'bg-green-100 text-green-800', label: 'Pagado' },
  overdue: { color: 'bg-red-100 text-red-800', label: 'Vencido' },
  confirmed: { color: 'bg-blue-100 text-blue-800', label: 'Confirmado' },
  shipped: { color: 'bg-purple-100 text-purple-800', label: 'Enviado' },
};

export function StatusBadge({ status, label }: { status: StatusType; label?: string }) {
  const config = statusConfig[status];
  return (
    <Badge className={config.color}>
      {label || config.label}
    </Badge>
  );
}
