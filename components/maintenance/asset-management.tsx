'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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
  model: string | null;
  manufacturer: string | null;
  purchase_date: string | null;
  last_maintenance?: string | null;
  maintenance_hours?: number | null;
  status: string;
}

function normalizeText(value: string | null | undefined) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normalizeStatus(value: string | null | undefined) {
  const normalized = normalizeText(value);
  if (['operativo', 'activo', 'active', '1', 'true', 'si'].includes(normalized)) return 'activo';
  if (['mantenimiento', 'maintenance'].includes(normalized)) return 'mantenimiento';
  return 'inactivo';
}

export function AssetManagement() {
  const supabase = createClient();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const { data, error } = await supabase
          .from('maintenance_assets')
          .select('id, asset_name, asset_code, asset_type, model, manufacturer, purchase_date, last_maintenance, status')
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;

        setAssets(
          (data || []).map((asset) => ({
            id: asset.id,
            name: asset.asset_name || 'Activo sin nombre',
            code: asset.asset_code || '-',
            type: asset.asset_type || 'Activo',
            model: asset.model || null,
            manufacturer: asset.manufacturer || null,
            purchase_date: asset.purchase_date || null,
            last_maintenance: asset.last_maintenance || null,
            status: asset.status || 'Activo',
          })),
        );
      } catch (err) {
        console.error('[v0] Error fetching assets:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();

    const interval = setInterval(fetchAssets, 30000);
    return () => clearInterval(interval);
  }, [supabase]);

  const getStatusBadge = (status: string) => {
    const value = normalizeText(status);
    if (value === 'operativo' || value === 'activo') {
      return <Badge className="bg-green-600/10 text-green-700">Operativo</Badge>;
    }
    if (value === 'mantenimiento') {
      return <Badge className="bg-blue-600/10 text-blue-700">Mantenimiento</Badge>;
    }
    if (value === 'inactivo' || value === 'fuera de servicio') {
      return <Badge className="bg-red-600/10 text-red-700">Inactivo</Badge>;
    }
    return <Badge>{status}</Badge>;
  };

  const getDaysToNextMaintenance = (lastMaintenance: string | null, hoursUsed: number) => {
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

  const stats = useMemo(
    () => ({
      total: assets.length,
      operativos: assets.filter((asset) => normalizeStatus(asset.status) === 'activo').length,
      mantenimiento: assets.filter((asset) => normalizeStatus(asset.status) === 'mantenimiento').length,
      urgentes: assets.filter((asset) => {
        const next = getDaysToNextMaintenance(asset.last_maintenance || null, asset.maintenance_hours || 0);
        return next?.urgent;
      }).length,
    }),
    [assets],
  );

  if (loading) {
    return <div className="text-muted-foreground">Cargando activos...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Activos totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
            <p className="mt-1 text-xs text-muted-foreground">bajo gestion</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-green-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-green-700">Operativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.operativos}</div>
            <p className="mt-1 text-xs text-muted-foreground">en operacion</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-blue-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-blue-700">En mantenimiento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.mantenimiento}</div>
            <p className="mt-1 text-xs text-muted-foreground">segun estado actual</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-yellow-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-yellow-700">Requieren revisión</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{stats.urgentes}</div>
            <p className="mt-1 text-xs text-muted-foreground">proximas 2 semanas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {assets.map((asset) => {
          const maintenance = getDaysToNextMaintenance(asset.last_maintenance || null, asset.maintenance_hours || 0);

          return (
            <Card key={asset.id} className={`border-border ${maintenance?.urgent ? 'bg-yellow-500/5' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <CardTitle className="text-base">{asset.name}</CardTitle>
                      {getStatusBadge(asset.status)}
                    </div>
                    <CardDescription className="text-xs">
                      {asset.code} - {asset.type}
                    </CardDescription>
                  </div>
                  {maintenance?.urgent && <AlertTriangle className="h-5 w-5 flex-shrink-0 text-yellow-600" />}
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

                <div className="grid grid-cols-2 gap-3 border-t border-border/50 pt-2 text-xs">
                  <div>
                    <p className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      Ultima mantencion
                    </p>
                    <p className="font-medium">
                      {asset.last_maintenance ? new Date(asset.last_maintenance).toLocaleDateString('es-CL') : 'Sin registro'}
                    </p>
                  </div>
                  <div>
                    <p className="flex items-center gap-1 text-muted-foreground">
                      <Wrench className="h-3 w-3" />
                      Proxima mantencion
                    </p>
                    <p className={`font-medium ${maintenance?.urgent ? 'text-yellow-600' : ''}`}>
                      {maintenance ? `${Math.round(maintenance.hours)}h` : '-'}
                    </p>
                  </div>
                </div>

                <Button className="mt-3 w-full" size="sm" variant="outline" asChild>
                  <Link href={`/dashboard/work-orders/create?assetId=${asset.id}`}>Crear orden de trabajo</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
