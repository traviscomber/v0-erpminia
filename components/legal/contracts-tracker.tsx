'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Calendar, Download, Eye } from 'lucide-react';

interface Contract {
  id: string;
  title: string;
  provider: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'expiring' | 'expired';
  value: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  fileUrl: string;
}

interface ContractsTrackerProps {
  contracts: Contract[];
}

export function ContractsTracker({ contracts = [] }: ContractsTrackerProps) {
  const sortedContracts = [...contracts].sort((left, right) => {
    const leftDays = daysUntilExpiry(left.endDate);
    const rightDays = daysUntilExpiry(right.endDate);
    return leftDays - rightDays;
  });

  const getStatusBadge = (status: 'active' | 'expiring' | 'expired') => {
    switch (status) {
      case 'active':
        return <Badge className="bg-secondary/10 text-secondary">Activo</Badge>;
      case 'expiring':
        return <Badge className="bg-primary/10 text-primary">Por vencer</Badge>;
      case 'expired':
        return <Badge className="bg-destructive/10 text-destructive">Vencido</Badge>;
    }
  };

  const getApprovalBadge = (status: 'pending' | 'approved' | 'rejected') => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-secondary/10 text-secondary">Aprobado</Badge>;
      case 'pending':
        return <Badge className="bg-primary/10 text-primary">Pendiente</Badge>;
      case 'rejected':
        return <Badge className="bg-destructive/10 text-destructive">Observado</Badge>;
    }
  };

  const daysUntilExpiry = (endDate: string): number => {
    const today = new Date();
    const expiry = new Date(endDate);
    const diff = expiry.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-3">
      {sortedContracts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
          <AlertCircle className="mx-auto mb-2 h-6 w-6" />
          <p>No hay contratos cargados todavia.</p>
          <p className="mt-1 text-xs">Usa el boton "Nuevo contrato" para agregar contratos a la gestion.</p>
        </div>
      ) : (
        <>
          {sortedContracts.map((contract) => {
            const daysLeft = daysUntilExpiry(contract.endDate);
            const isExpiring = daysLeft <= 60 && daysLeft > 0;
            const expiryLabel = daysLeft > 0 ? `Vence en ${daysLeft} dias` : daysLeft === 0 ? 'Vence hoy' : `Vencio hace ${Math.abs(daysLeft)} dias`;

            return (
              <div
                key={contract.id}
                className={`flex items-center justify-between rounded-lg border p-4 transition ${
                  contract.status === 'expired'
                    ? 'border-destructive/20 bg-destructive/5'
                    : isExpiring
                      ? 'border-primary/20 bg-primary/5'
                      : 'hover:bg-muted/50'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <p className="truncate font-medium">{contract.title}</p>
                    {isExpiring && <AlertCircle className="h-4 w-4 flex-shrink-0 text-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground">Proveedor: {contract.provider}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {new Date(contract.endDate).toLocaleDateString('es-CL')}
                      {' '}
                      ({expiryLabel})
                    </span>
                  </div>
                </div>

                <div className="ml-4 flex flex-shrink-0 items-center gap-2">
                  <div className="text-right">
                    <div className="text-sm font-semibold">{contract.value}</div>
                    <div className="mt-1 flex items-center gap-2">
                      {getStatusBadge(contract.status)}
                      {getApprovalBadge(contract.approvalStatus)}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {contract.fileUrl && (
                      <>
                        <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <a href={contract.fileUrl} target="_blank" rel="noreferrer">
                            <Eye className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <a href={contract.fileUrl} target="_blank" rel="noreferrer">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
