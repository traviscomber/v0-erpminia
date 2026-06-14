'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Asset {
  id: string;
  assetCode: string;
  assetName: string;
  assetType: string;
  location: string;
  criticality: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'inactive' | 'maintenance';
  acquisitionCost: number;
}

interface AssetCardProps {
  asset: Asset;
  onCreateWorkOrder: (assetId: string) => void;
  onViewHistory?: (assetId: string) => void;
}

const criticalityColors = {
  low: 'bg-secondary/20 text-secondary',
  medium: 'bg-primary/20 text-primary',
  high: 'bg-yellow-500/20 text-yellow-700',
  critical: 'bg-destructive/20 text-destructive',
};

const statusColors = {
  active: 'bg-secondary/20 text-secondary',
  inactive: 'bg-muted/20 text-muted-foreground',
  maintenance: 'bg-yellow-500/20 text-yellow-700',
};

export function AssetCard({ asset, onCreateWorkOrder, onViewHistory }: AssetCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{asset.assetName}</CardTitle>
            <CardDescription>{asset.assetCode}</CardDescription>
          </div>
          <Badge className={criticalityColors[asset.criticality] ?? 'bg-muted/20 text-muted-foreground'}>
            {asset.criticality.charAt(0).toUpperCase() + asset.criticality.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Tipo</p>
            <p className="font-semibold">{asset.assetType}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Ubicación</p>
            <p className="font-semibold">{asset.location}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Estado</p>
            <Badge className={statusColors[asset.status] ?? 'bg-muted/20 text-muted-foreground'}>
              {(asset.status ?? 'unknown').charAt(0).toUpperCase() + (asset.status ?? 'unknown').slice(1)}
            </Badge>
          </div>
          <div>
            <p className="text-muted-foreground">Costo</p>
            <p className="font-semibold">${(asset.acquisitionCost ?? 0).toLocaleString()}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button size="sm" onClick={() => onCreateWorkOrder(asset.id)}>
            Crear OT
          </Button>
          <Button size="sm" variant="outline" onClick={() => onViewHistory?.(asset.id)}>
            Historial
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
