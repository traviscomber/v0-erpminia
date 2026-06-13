'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Wrench, Calendar } from 'lucide-react';

interface Asset {
  id: string;
  name: string;
  code: string;
  type: string;
  model: string;
  manufacturer: string;
  purchase_date: string;
  last_maintenance?: string;
  maintenance_hours?: number;
  status: string;
}

export function AssetManagement() {
  const supabase = createClient();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const { data, error } = await supabase
          .from('equipment')
          .select('id, name, code, type, model, manufacturer, purchase_date, status')
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;
        setAssets(data || []);
      } catch (err) {
        console.error('[v0] Error fetching assets:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();

    // Subscribe to changes
    const subscription = supabase
      .channel('equipment-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'equipment',
        },
        () => {
          fetchAssets();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'operational':
        return <Badge className="bg-green-600/10 text-green-700">Operacional</Badge>;
      case 'maintenance':
        return <Badge className="bg-blue-600/10 text-blue-700">Mantención</Badge>;
      case 'offline':
        return <Badge className="bg-red-600/10 text-red-700">Offline</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getDaysToNextMaintenance = (lastMaintenance: string, hoursUsed: number) => {
    if (!lastMaintenance) return null;

    const last = new Date(lastMaintenance);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const hours = hoursUsed || 0;
    const hoursUntilMaintenance = 500 - (hours % 500);

    if (last < thirtyDaysAgo || hoursUntilMaintenance < 50) {
      return { urgent: true, hours: hoursUntilMaintenance };
    }

    return { urgent: false, hours: hoursUntilMaintenance };
  };

  if (loading) {
    return <div className="text-muted-foreground">Cargando activos...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Activos Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{assets.length}</div>
            <p className="text-xs text-muted-foreground mt-1">bajo gestión</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-green-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-green-700">Operacionales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {assets.filter(a => a.status === 'operational').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">en operación</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-yellow-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-yellow-700">Requieren Mantención</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {assets.filter(a => {
                const next = getDaysToNextMaintenance(a.last_maintenance || '', a.maintenance_hours || 0);
                return next?.urgent;
              }).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">próximas 2 semanas</p>
          </CardContent>
        </Card>
      </div>

      {/* Assets List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {assets.map((asset) => {
          const maintenance = getDaysToNextMaintenance(asset.last_maintenance || '', asset.maintenance_hours || 0);
          return (
            <Card key={asset.id} className={`border-border ${maintenance?.urgent ? 'bg-yellow-500/5' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-base">{asset.name}</CardTitle>
                      {getStatusBadge(asset.status)}
                    </div>
                    <CardDescription className="text-xs">
                      {asset.code} • {asset.type}
                    </CardDescription>
                  </div>
                  {maintenance?.urgent && (
                    <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {asset.manufacturer && (
                  <div className="text-xs">
                    <p className="text-muted-foreground">Fabricante</p>
                    <p className="font-medium">{asset.manufacturer}</p>
                  </div>
                )}

                {asset.model && (
                  <div className="text-xs">
                    <p className="text-muted-foreground">Modelo</p>
                    <p className="font-medium">{asset.model}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-border/50">
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Última Mantención
                    </p>
                    <p className="font-medium">
                      {asset.last_maintenance
                        ? new Date(asset.last_maintenance).toLocaleDateString('es-CL')
                        : 'Sin registro'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Wrench className="h-3 w-3" />
                      Próxima Mantención
                    </p>
                    <p className={`font-medium ${maintenance?.urgent ? 'text-yellow-600' : ''}`}>
                      {maintenance ? `${Math.round(maintenance.hours)}h` : '-'}
                    </p>
                  </div>
                </div>

                <Button className="w-full mt-3" size="sm" variant="outline">
                  Crear Orden de Trabajo
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
