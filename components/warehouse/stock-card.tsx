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

export function StockCard({ partCode, partName, quantityOnHand, quantityAvailable, reorderLevel, unitCost, binLocation }: StockCardProps) {
  const isLow = quantityOnHand <= reorderLevel;
  const value = (quantityOnHand * unitCost).toLocaleString();

  return (
    <Card className={isLow ? 'border-destructive/50 bg-destructive/5' : ''}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-base">{partName}</CardTitle>
            <CardDescription>{partCode}</CardDescription>
          </div>
          {isLow && <AlertCircle className="w-4 h-4 text-destructive" />}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">En Mano</p>
            <p className="font-semibold text-lg">{quantityOnHand}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Disponible</p>
            <p className="font-semibold text-lg">{quantityAvailable}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Nivel Reorden</p>
            <p className="font-semibold">{reorderLevel}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Ubicación</p>
            <p className="font-semibold text-xs">{binLocation}</p>
          </div>
        </div>
        <div className="pt-2 border-t">
          <p className="text-sm text-muted-foreground">Valor Stock</p>
          <p className="font-semibold">${value}</p>
        </div>
        {isLow && <Badge className="w-full justify-center bg-destructive/20 text-destructive hover:bg-destructive/30">Alerta Stock Bajo</Badge>}
      </CardContent>
    </Card>
  );
}
