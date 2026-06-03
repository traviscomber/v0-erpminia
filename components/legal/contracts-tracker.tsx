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
}

interface ContractsTrackerProps {
  contracts?: Contract[];
}

const defaultContracts: Contract[] = [
  {
    id: '1',
    title: 'Contrato Principal de Explotación',
    provider: 'Cía. Minera La Patagua',
    startDate: '2023-01-15',
    endDate: '2025-12-31',
    status: 'active',
    value: '$5,000,000',
    approvalStatus: 'approved',
  },
  {
    id: '2',
    title: 'Contrato Servicios de Mantenimiento',
    provider: 'TechMaint Solutions',
    startDate: '2024-01-01',
    endDate: '2025-06-30',
    status: 'expiring',
    value: '$850,000',
    approvalStatus: 'approved',
  },
  {
    id: '3',
    title: 'Contrato de Suministro de Repuestos',
    provider: 'Industrial Parts Corp',
    startDate: '2024-03-01',
    endDate: '2025-02-28',
    status: 'expiring',
    value: '$450,000',
    approvalStatus: 'pending',
  },
  {
    id: '4',
    title: 'Contrato de Consultoría Legal',
    provider: 'Legal Advisors & Associates',
    startDate: '2024-06-01',
    endDate: '2026-05-31',
    status: 'active',
    value: '$180,000',
    approvalStatus: 'approved',
  },
  {
    id: '5',
    title: 'Contrato de Seguridad Industrial',
    provider: 'SafeGuard Security',
    startDate: '2023-12-01',
    endDate: '2024-11-30',
    status: 'expired',
    value: '$320,000',
    approvalStatus: 'rejected',
  },
];

export function ContractsTracker({ contracts = defaultContracts }: ContractsTrackerProps) {
  const getStatusBadge = (status: 'active' | 'expiring' | 'expired') => {
    switch (status) {
      case 'active':
        return <Badge className="bg-secondary/10 text-secondary">Activo</Badge>;
      case 'expiring':
        return <Badge className="bg-primary/10 text-primary">Próx. Vencer</Badge>;
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
        return <Badge className="bg-destructive/10 text-destructive">Rechazado</Badge>;
    }
  };

  const daysUntilExpiry = (endDate: string): number => {
    const today = new Date();
    const expiry = new Date(endDate);
    const diff = expiry.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestión de Contratos</CardTitle>
        <CardDescription>Seguimiento de contratos vigentes y vencimientos</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {contracts.map(contract => {
            const daysLeft = daysUntilExpiry(contract.endDate);
            const isExpiring = daysLeft <= 60 && daysLeft > 0;

            return (
              <div
                key={contract.id}
                className={`flex items-center justify-between p-4 border rounded-lg ${
                  contract.status === 'expired'
                    ? 'border-destructive/20 bg-destructive/5'
                    : isExpiring
                      ? 'border-primary/20 bg-primary/5'
                      : 'hover:bg-muted/50'
                } transition`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium truncate">{contract.title}</p>
                    {isExpiring && <AlertCircle className="w-4 h-4 text-primary flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Proveedor: {contract.provider}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {new Date(contract.endDate).toLocaleDateString('es-CL')} 
                      {daysLeft > 0 && ` (${daysLeft} días)`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <div className="text-right">
                    <div className="font-semibold text-sm">{contract.value}</div>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusBadge(contract.status)}
                      {getApprovalBadge(contract.approvalStatus)}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
