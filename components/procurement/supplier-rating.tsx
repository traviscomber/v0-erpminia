'use client';

import { Star, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SupplierRatingProps {
  supplier: {
    name: string;
    rating: number; // 0-5
    onTimeDelivery: number; // percentage
    qualityScore: number; // percentage
    totalSpent: number;
    leadTime: number; // days
    ordersCount: number;
    status: 'active' | 'inactive' | 'probation';
  };
}

export function SupplierRating({ supplier }: SupplierRatingProps) {
  const statusColors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    probation: 'bg-yellow-100 text-yellow-800',
  };

  const statusLabels = {
    active: 'Activo',
    inactive: 'Inactivo',
    probation: 'En Probación',
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{supplier.name}</CardTitle>
            <Badge className={`mt-2 ${statusColors[supplier.status]}`}>
              {statusLabels[supplier.status]}
            </Badge>
          </div>
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${
                  i < Math.floor(supplier.rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-xs text-muted-foreground">A Tiempo</p>
              <p className="font-semibold">{supplier.onTimeDelivery}%</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-purple-500" />
            <div>
              <p className="text-xs text-muted-foreground">Calidad</p>
              <p className="font-semibold">{supplier.qualityScore}%</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-500" />
            <div>
              <p className="text-xs text-muted-foreground">Lead Time</p>
              <p className="font-semibold">{supplier.leadTime}d</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Órdenes</p>
            <p className="font-semibold">{supplier.ordersCount}</p>
          </div>
        </div>
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">Total Gastado</p>
          <p className="text-lg font-bold">
            {new Intl.NumberFormat('es-CL', {
              style: 'currency',
              currency: 'CLP',
              minimumFractionDigits: 0,
            }).format(supplier.totalSpent)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
