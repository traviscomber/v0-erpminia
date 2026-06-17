'use client';

import { useState } from 'react';
import { useCostCenters } from '@/hooks/use-cost-centers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExpandedState {
  [key: string]: boolean;
}

export function CostCentersDashboard() {
  const { costCenters, loading } = useCostCenters();
  const [expanded, setExpanded] = useState<ExpandedState>({});

  if (loading) {
    return <div className="text-center py-10">Cargando centros de costos...</div>;
  }

  // Build hierarchy from flat list
  const hierarchy = buildHierarchy(costCenters);

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Centros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{costCenters.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Nivel 1 (Minas)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hierarchy.filter(h => !h.code.includes('-')).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status Activo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{costCenters.filter(c => c.status === 'active').length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Estructura Jerárquica</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 font-mono text-sm">
            {hierarchy.map(cc => {
              const level = (cc.code.match(/-/g) || []).length;
              const hasChildren = hierarchy.some(
                h =>
                  h.code.startsWith(cc.code + '-') &&
                  (h.code.match(/-/g) || []).length === level + 1,
              );
              const isExpanded = expanded[cc.id];

              return (
                <div key={cc.id}>
                  <div className="flex items-center gap-2 py-1 hover:bg-gray-50 px-2 rounded">
                    {hasChildren ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-0 h-6 w-6"
                        onClick={() => toggleExpand(cc.id)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    ) : (
                      <div className="w-6" />
                    )}
                    <div style={{ marginLeft: `${level * 20}px` }} className="flex-1">
                      <span className="font-semibold">{cc.code}</span>
                      <span className="ml-2 text-gray-600">{cc.name}</span>
                    </div>
                    <Badge variant={cc.status === 'active' ? 'default' : 'secondary'}>
                      {cc.status}
                    </Badge>
                  </div>

                  {/* Show children when expanded */}
                  {isExpanded &&
                    hierarchy.map(
                      child =>
                        child.code.startsWith(cc.code + '-') &&
                        (child.code.match(/-/g) || []).length === level + 1 && (
                          <div key={child.id} className="pl-2">
                            <div className="flex items-center gap-2 py-1 hover:bg-gray-50 px-2 rounded">
                              <div className="w-6" />
                              <div style={{ marginLeft: `${(level + 1) * 20}px` }} className="flex-1">
                                <span className="text-gray-700">{child.code}</span>
                                <span className="ml-2 text-gray-500 text-sm">{child.name}</span>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {child.status}
                              </Badge>
                            </div>
                          </div>
                        ),
                    )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper function to build hierarchy
function buildHierarchy(costCenters: any[]) {
  return costCenters.sort((a, b) => {
    const aDepth = (a.code.match(/-/g) || []).length;
    const bDepth = (b.code.match(/-/g) || []).length;
    if (aDepth !== bDepth) return aDepth - bDepth;
    return a.code.localeCompare(b.code);
  });
}
