'use client';

import { useCostCenters } from '@/hooks/use-cost-centers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

export function MaintenanceDashboardByCC() {
  const { costCenters } = useCostCenters();
  const [expandedCC, setExpandedCC] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Órdenes de Mantenimiento por Centro de Costos</h1>
        <p className="text-muted-foreground">Seguimiento de órdenes agrupadas por centro de costos</p>
      </div>

      <div className="space-y-4">
        {costCenters?.map(cc => (
          <Card key={cc.id}>
            <CardHeader className="pb-3">
              <button
                onClick={() => setExpandedCC(expandedCC === cc.id ? null : cc.id)}
                className="flex items-center justify-between w-full hover:bg-muted/50 p-2 rounded"
              >
                <div className="flex items-center gap-3">
                  {expandedCC === cc.id ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  <div className="text-left">
                    <CardTitle className="text-lg">{cc.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{cc.code}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary">0 órdenes</Badge>
                  <Badge className="bg-green-100 text-green-800">0 completadas</Badge>
                  <Badge className="bg-blue-100 text-blue-800">0 en progreso</Badge>
                </div>
              </button>
            </CardHeader>

            {expandedCC === cc.id && (
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Órdenes de mantenimiento para {cc.name} se cargarán cuando el API esté disponible
                </p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
