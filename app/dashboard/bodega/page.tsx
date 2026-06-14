'use client';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, TrendingUp, Package, QrCode, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useSWR from 'swr';
import { StockCard } from '@/components/warehouse/stock-card';
import { QRScanner } from '@/components/warehouse/qr-scanner';
import { TransferModal } from '@/components/warehouse/transfer-modal';
import { AddItemModal } from '@/components/warehouse/add-item-modal';

export default function BodesaDashboard() {
  const [addItemOpen, setAddItemOpen] = useState(false);
  const { data: stock, mutate: mutateStock } = useSWR('/api/warehouse/stock', async (url: string) => {
    const res = await fetch(url);
    return res.ok ? res.json() : null;
  });

  const { data: reorder, mutate: mutateReorder } = useSWR('/api/warehouse/reorder', async (url: string) => {
    const res = await fetch(url);
    return res.ok ? res.json() : null;
  });

  const stockList = stock?.stock || [];
  const alerts = reorder?.alerts || [];
  const stats = reorder?.stats || {};

  const totalValue = stockList.reduce((sum: number, s: any) => sum + ((s.quantity_on_hand || 0) * (s.unit_cost || 0)), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Bodega/Inventario</h1>
          <p className="text-muted-foreground">Gestión de stock, escaneo QR, alertas de reorden</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => mutateStock()}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Actualizar
          </Button>
          <Button size="sm" onClick={() => setAddItemOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Agregar Artículo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="w-4 h-4" />
              Total Artículos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stockList.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Stock Bajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{stats.lowStockItems || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Valor Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${(totalValue / 1000000).toFixed(1)}M</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              Alertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{stats.activeAlerts || 0}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="stock" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stock">Todo Stock</TabsTrigger>
          <TabsTrigger value="alerts">Stock Bajo ({stats.lowStockItems})</TabsTrigger>
          <TabsTrigger value="scanner">Escanear QR</TabsTrigger>
          <TabsTrigger value="transfer">Transferencias</TabsTrigger>
        </TabsList>

        <TabsContent value="stock">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stockList.map((item: any) => (
              <StockCard
                key={item.id}
                partCode={item.part_code}
                partName={item.part_name}
                quantityOnHand={item.quantity_on_hand}
                quantityAvailable={item.quantity_available}
                reorderLevel={item.reorder_level}
                unitCost={item.unit_cost}
                binLocation={item.bin.bin_location || 'N/A'}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="alerts">
          <div className="space-y-3">
            {alerts.map((alert: any) => (
              <Card key={alert.id} className="border-destructive/50 bg-destructive/5">
                <CardContent className="pt-6">
                  <p><strong>{alert.stock.part_name}</strong> ({alert.stock.part_code})</p>
                  <p className="text-sm text-muted-foreground">Level: {alert.current_value} / {alert.threshold_value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="scanner">
          <QRScanner />
        </TabsContent>

        <TabsContent value="transfer">
          <TransferModal
            onTransfer={() => {
              mutateStock();
              mutateReorder();
            }}
          />
        </TabsContent>
      </Tabs>

      <AddItemModal 
        open={addItemOpen} 
        onOpenChange={setAddItemOpen}
        onSubmit={() => mutateStock()}
      />
    </div>
  );
}
