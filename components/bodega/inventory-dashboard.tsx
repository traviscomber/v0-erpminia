'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, TrendingUp, Package } from 'lucide-react';

interface StockItem {
  id: string;
  part_code: string;
  part_name: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  reorder_level: number;
  unit_cost: number;
}

export function InventoryDashboard() {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [alerts, setAlerts] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const [stockRes, alertsRes] = await Promise.all([
          fetch('/api/bodega/stock'),
          fetch('/api/bodega/alerts')
        ]);
        
        if (stockRes.ok) {
          const { stock_items } = await stockRes.json();
          setStock(stock_items.slice(0, 10) || []);
        }
        
        if (alertsRes.ok) {
          const { alerts: alertData } = await alertsRes.json();
          setAlerts(alertData.length || 0);
        }
      } catch (err) {
        console.error('[v0] Inventory fetch:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
    const interval = setInterval(fetchInventory, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stock.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> Low Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{alerts}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Availability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stock.length > 0 ? ((stock.filter(s => s.quantity_on_hand > 0).length / stock.length) * 100).toFixed(0) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventory Levels</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <div className="space-y-3">
              {stock.map(item => (
                <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="font-semibold text-sm">{item.part_name}</p>
                    <p className="text-xs text-muted-foreground">{item.part_code}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-sm font-semibold">{item.quantity_on_hand}</p>
                      <p className="text-xs text-muted-foreground">Reserved: {item.quantity_reserved}</p>
                    </div>
                    {item.quantity_on_hand <= item.reorder_level ? (
                      <Badge className="bg-red-600/20 text-red-700">Critical</Badge>
                    ) : (
                      <Badge className="bg-green-600/20 text-green-700">OK</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
