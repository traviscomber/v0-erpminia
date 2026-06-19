'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useCostCenters } from '@/hooks/use-cost-centers';
import { formatCostCenterLabel, sortCostCenters } from '@/lib/cost-centers';

export function MaintenanceDashboardByCC() {
  const { costCenters } = useCostCenters();
  const [expandedCC, setExpandedCC] = useState<string | null>(null);
  const orderedCostCenters = sortCostCenters(costCenters);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ordenes de Mantenimiento por Centro de Costos</h1>
        <p className="text-muted-foreground">Seguimiento de ordenes agrupadas por centro de costos</p>
      </div>

      <div className="space-y-4">
        {orderedCostCenters.map((cc) => (
          <Card key={cc.id}>
            <CardHeader className="pb-3">
              <button
                onClick={() => setExpandedCC(expandedCC === cc.id ? null : cc.id)}
                className="flex w-full items-center justify-between rounded p-2 hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  {expandedCC === cc.id ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <div className="text-left">
                    <CardTitle className="text-lg">{cc.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{formatCostCenterLabel(cc)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary">0 ordenes</Badge>
                  <Badge className="bg-green-100 text-green-800">0 completadas</Badge>
                  <Badge className="bg-blue-100 text-blue-800">0 en progreso</Badge>
                </div>
              </button>
            </CardHeader>

            {expandedCC === cc.id && (
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Las ordenes de mantenimiento para {cc.name} se cargaran cuando el API este disponible.
                </p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
