'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, AlertCircle, Clock, TrendingUp, Wrench } from 'lucide-react';
import useSWR from 'swr';
import { toast } from 'sonner';

import { WorkOrderForm } from '@/components/maintenance/work-order-form';
import { AssetCard } from '@/components/maintenance/asset-card';
import { MaintenanceSchedule } from '@/components/maintenance/maintenance-schedule';

export default function MaintenanceDashboard() {
  const [showWorkOrderForm, setShowWorkOrderForm] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedAssetId, setSelectedAssetId] = useState<string | undefined>(undefined);

  const { data: mttrStats } = useSWR('/api/maintenance/mttr', async (url: string) => {
    const res = await fetch(url);
    return res.ok ? res.json() : null;
  });

  const { data: schedules } = useSWR('/api/maintenance/preventive', async (url: string) => {
    const res = await fetch(url);
    return res.ok ? res.json() : null;
  });

  const { data: assets } = useSWR('/api/maintenance/assets', async (url: string) => {
    const res = await fetch(url);
    return res.ok ? res.json() : null;
  });

  const { data: workOrders } = useSWR('/api/maintenance/work-orders', async (url: string) => {
    const res = await fetch(url);
    return res.ok ? res.json() : null;
  });

  const stats = mttrStats || {};
  const schedulesList = schedules?.schedules || [];
  const assetsList = assets?.assets || [];
  const woList = workOrders?.workOrders || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Mantenimiento</h1>
          <p className="text-muted-foreground">Órdenes de trabajo, activos, mantenimiento preventivo y KPIs</p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90"
          onClick={() => {
            setSelectedAssetId(undefined);
            setShowWorkOrderForm(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Orden de Trabajo
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              MTTR Promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{stats.averageMTTR.toFixed(1) || '-'} hrs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Tiempo Inactivo (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{stats.totalDowntime30d.toFixed(1) || '-'} hrs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Disponibilidad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-secondary">{stats.availability.toFixed(1) || '-'}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              OTs Completadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{stats.completedWorkOrders || '-'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="work-orders">Órdenes de Trabajo ({woList.length})</TabsTrigger>
          <TabsTrigger value="schedule">Preventivo ({schedulesList.length})</TabsTrigger>
          <TabsTrigger value="assets">Activos ({assetsList.length})</TabsTrigger>
        </TabsList>

        {/* Pestaña Resumen */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Mantenimiento Vencido</CardTitle>
              </CardHeader>
              <CardContent>
                <MaintenanceSchedule schedules={schedulesList.slice(0, 5)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Activos Críticos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {assetsList
                  .filter((a: any) => a.criticality === 'critical')
                  .slice(0, 3)
                  .map((asset: any) => (
                    <div key={asset.id} className="flex justify-between items-center p-2 bg-muted rounded">
                      <span className="font-semibold text-sm">{asset.asset_name}</span>
                      <span className="text-xs text-destructive">CRÍTICO</span>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Pestaña Órdenes de Trabajo */}
        <TabsContent value="work-orders" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {woList.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Sin órdenes de trabajo aún
                </CardContent>
              </Card>
            ) : (
              woList.map((wo: any) => (
                <Card key={wo.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base">{wo.title}</CardTitle>
                        <CardDescription>{wo.work_order_number}</CardDescription>
                      </div>
                      <span className="text-xs font-semibold">{wo.status.toUpperCase()}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{wo.description}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Preventive Schedule Tab */}
        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Maintenance</CardTitle>
            </CardHeader>
            <CardContent>
              <MaintenanceSchedule schedules={schedulesList} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assets Tab */}
        <TabsContent value="assets">
          <div className="grid md:grid-cols-2 gap-4">
            {assetsList.length === 0 ? (
              <Card className="col-span-2">
                <CardContent className="py-8 text-center text-muted-foreground">
                  No assets registered yet
                </CardContent>
              </Card>
            ) : (
              assetsList.map((asset: any) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  onCreateWorkOrder={(assetId) => {
                    setSelectedAssetId(assetId);
                    setShowWorkOrderForm(true);
                  }}
                />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Work Order Modal */}
      {showWorkOrderForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4">
            <WorkOrderForm
              assetId={selectedAssetId || ''}
              onSuccess={() => {
                setSelectedAssetId(undefined);
                setShowWorkOrderForm(false);
                toast.success('Work order created');
              }}
            />
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => {
                setSelectedAssetId(undefined);
                setShowWorkOrderForm(false);
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
