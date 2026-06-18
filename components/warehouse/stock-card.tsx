'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';

interface StockCardProps {
  partCode: string;
  partName: string;
  quantityOnHand: number;
  quantityAvailable: number;
  reorderLevel: number;
  unitCost: number;
  binLocation: string;
}

export function StockCard({
  partCode,
  partName,
  quantityOnHand,
  quantityAvailable,
  reorderLevel,
  unitCost,
  binLocation,
}: StockCardProps) {
  const isLow = quantityOnHand <= reorderLevel;
  const value = (quantityOnHand * unitCost).toLocaleString();

  return (
    <Card className={isLow ? 'border-destructive/50 bg-destructive/5' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{partName}</CardTitle>
            <CardDescription>{partCode}</CardDescription>
          </div>
          {isLow && <AlertCircle className="h-4 w-4 text-destructive" />}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">En mano</p>
            <p className="text-lg font-semibold">{quantityOnHand}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Disponible</p>
            <p className="text-lg font-semibold">{quantityAvailable}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Nivel reorden</p>
            <p className="font-semibold">{reorderLevel}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Ubicacion</p>
            <p className="text-xs font-semibold">{binLocation}</p>
          </div>
        </div>
        <div className="border-t pt-2">
          <p className="text-sm text-muted-foreground">Valor stock</p>
          <p className="font-semibold">${value}</p>
        </div>
        {isLow && (
          <Badge className="w-full justify-center bg-destructive/20 text-destructive hover:bg-destructive/30">
            Alerta de stock bajo
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
