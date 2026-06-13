'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, TrendingDown } from 'lucide-react';

interface StockItem {
  id: string;
  part_code: string;
  part_name: string;
  description: string;
  stock_current: number;
  stock_min: number;
  unit_cost: number;
  supplier: string;
  lead_time_days: number;
  is_critical: boolean;
}

interface StockLevelAlerts {
  critical: StockItem[];
  low: StockItem[];
  adequate: StockItem[];
  excess: StockItem[];
}

export function StockLevelAlerts() {
  const supabase = createClient();
  const [alerts, setAlerts] = useState<StockLevelAlerts>({
    critical: [],
    low: [],
    adequate: [],
    excess: [],
  });
  const [loading, setLoading] = useState(true);
  const [totalValue, setTotalValue] = useState(0);

  useEffect(() => {
    const fetchStockLevels = async () => {
      try {
        const { data, error } = await supabase
          .from('wear_parts')
          .select('*')
          .order('stock_current', { ascending: true });

        if (error) throw error;

        const items = data || [];
        const categorized: StockLevelAlerts = {
          critical: [],
          low: [],
          adequate: [],
          excess: [],
        };

        let total = 0;

        items.forEach((item: StockItem) => {
          const value = item.stock_current * item.unit_cost;
          total += value;

          const stockPercentage = (item.stock_current / Math.max(item.stock_min, 1)) * 100;

          if (item.stock_current === 0) {
            categorized.critical.push(item);
          } else if (stockPercentage < 50) {
            categorized.low.push(item);
          } else if (stockPercentage > 200) {
            categorized.excess.push(item);
          } else {
            categorized.adequate.push(item);
          }
        });

        setAlerts(categorized);
        setTotalValue(total);
      } catch (err) {
        console.error('[v0] Error fetching stock levels:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStockLevels();

    const subscription = supabase
      .channel('wear-parts-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wear_parts',
        },
        () => {
          fetchStockLevels();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (loading) {
    return <div className="text-muted-foreground">Cargando niveles de stock...</div>;
  }

  const totalItems =
    alerts.critical.length + alerts.low.length + alerts.adequate.length + alerts.excess.length;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Items Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
          </CardContent>
        </Card>

        <Card className="border-border bg-red-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-red-700">Críticos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{alerts.critical.length}</div>
            <p className="text-xs text-muted-foreground mt-1">sin stock</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-yellow-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-yellow-700">Stock Bajo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{alerts.low.length}</div>
            <p className="text-xs text-muted-foreground mt-1">por debajo de mín</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Valor Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              ${totalValue.toLocaleString('es-CL')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">en inventario</p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Items Alert */}
      {alerts.critical.length > 0 && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardHeader>
            <CardTitle className="text-red-700 text-lg">Items Sin Stock</CardTitle>
            <CardDescription>Requieren reorden inmediata</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.critical.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between p-3 bg-background rounded-lg border border-red-500/20"
                >
                  <div>
                    <p className="font-semibold text-sm">{item.part_name}</p>
                    <p className="text-xs text-muted-foreground">{item.part_code}</p>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-red-600/10 text-red-700">CRÍTICO</Badge>
                    {item.lead_time_days && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Lead time: {item.lead_time_days} días
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Low Stock Items */}
      {alerts.low.length > 0 && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardHeader>
            <CardTitle className="text-yellow-700 text-lg">Stock Bajo</CardTitle>
            <CardDescription>Próximo al nivel mínimo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.low.map((item) => {
              const stockPercentage = (item.stock_current / Math.max(item.stock_min, 1)) * 100;
              return (
                <div key={item.id}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-semibold text-sm">{item.part_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Stock: {item.stock_current} / Min: {item.stock_min}
                      </p>
                    </div>
                    <Badge className="bg-yellow-600/10 text-yellow-700">
                      {Math.round(stockPercentage)}%
                    </Badge>
                  </div>
                  <Progress value={stockPercentage} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Excess Stock */}
      {alerts.excess.length > 0 && (
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardHeader>
            <CardTitle className="text-blue-700 text-lg">Stock en Exceso</CardTitle>
            <CardDescription>Considerar revisión de inventario</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.excess.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 text-sm">
                  <span>{item.part_name}</span>
                  <span className="font-semibold">{item.stock_current} unidades</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Adequate Stock Summary */}
      {alerts.adequate.length > 0 && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardHeader>
            <CardTitle className="text-green-700 text-lg">Stock Adecuado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{alerts.adequate.length} items en nivel óptimo</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
