'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { ArrowLeft, Copy, Printer, QrCode, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { inferMachineFamilyFromText } from '@/lib/maintenance/cost-center-machines';

type MaintenanceAsset = {
  id: string;
  asset_code?: string;
  asset_name?: string;
  asset_type?: string;
  location?: string;
  status?: string;
  manufacturer?: string;
  model?: string;
  criticality?: string;
  mtbf_hours?: number | null;
};

type WorkOrder = {
  id: string;
  status: string;
  work_order_number?: string;
  created_at?: string;
  completion_date?: string;
  asset_id?: string | null;
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) return null;
  return payload;
};

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    open: 'Abierta',
    assigned: 'Asignada',
    in_progress: 'En progreso',
    completed: 'Completada',
    closed: 'Cerrada',
  };
  return labels[status] || status || 'Sin estado';
}

export default function VehicleQrPage() {
  const params = useParams<{ id: string }>();
  const assetId = decodeURIComponent(String(params.id || ''));
  const [origin, setOrigin] = useState('https://www.motil.app');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const { data, error, isLoading } = useSWR(
    assetId ? `/api/maintenance/assets/${assetId}/history` : null,
    fetcher,
    { revalidateOnFocus: false },
  );
  const { data: workOrderData } = useSWR('/api/maintenance/work-orders', fetcher, {
    revalidateOnFocus: false,
  });

  const asset = data?.asset as MaintenanceAsset | undefined;
  const workOrders = Array.isArray(workOrderData?.workOrders) ? (workOrderData.workOrders as WorkOrder[]) : [];
  const assetOrders = useMemo(
    () => workOrders.filter((order) => String(order.asset_id || '') === assetId),
    [assetId, workOrders],
  );

  const machineFamily = useMemo(() => {
    const text = `${asset?.asset_name || ''} ${asset?.asset_type || ''} ${asset?.model || ''} ${asset?.manufacturer || ''}`;
    return inferMachineFamilyFromText(text);
  }, [asset?.asset_name, asset?.asset_type, asset?.model, asset?.manufacturer]);

  const openOrders = assetOrders.filter((order) => order.status === 'open' || order.status === 'assigned');
  const activeOrders = assetOrders.filter((order) => order.status === 'open' || order.status === 'assigned' || order.status === 'in_progress');
  const lastOrder = assetOrders[0];
  const qrTargetUrl = `${origin}/dashboard/mantenimiento/vehiculos/${assetId}/ficha`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(qrTargetUrl)}`;

  const copyLink = async () => {
    if (typeof navigator !== 'undefined') {
      try {
        await navigator.clipboard.writeText(qrTargetUrl);
        toast.success('Enlace copiado');
      } catch {
        toast.error('No se pudo copiar el enlace');
      }
    }
  };

  if (isLoading) {
    return <div className="text-muted-foreground">Cargando tarjeta QR del equipo...</div>;
  }

  if (error || !asset) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">QR no disponible</h1>
          <p className="mt-2 text-muted-foreground">No pudimos cargar la tarjeta de este equipo desde la base real.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/mantenimiento/vehiculos">Volver a vehículos</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tarjeta QR del equipo</h1>
          <p className="mt-2 text-muted-foreground">Acceso rápido a la ficha completa, historial y órdenes del activo.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="gap-2">
            <Link href={`/dashboard/mantenimiento/vehiculos/${asset.id}/ficha`}>
              <ArrowLeft className="h-4 w-4" />
              Volver a la ficha
            </Link>
          </Button>
          <Button className="gap-2" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="print:shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR del equipo
            </CardTitle>
            <CardDescription>El codigo apunta a la ficha real del activo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center rounded-lg border border-border bg-white p-4">
              <img src={qrImageUrl} alt={`QR de ${asset.asset_name || 'activo'}`} className="h-64 w-64 object-contain" />
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">Destino</p>
              <p className="break-all font-medium">{qrTargetUrl}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="gap-2" onClick={copyLink}>
                <Copy className="h-4 w-4" />
                Copiar enlace
              </Button>
              <Button asChild variant="outline">
                <Link href={qrTargetUrl} target="_blank" rel="noreferrer">
                  Abrir ficha
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/dashboard/work-orders/create?assetId=${asset.id}`}>Crear OT</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="print:shadow-none">
            <CardHeader>
              <CardTitle>Ficha resumida del activo</CardTitle>
              <CardDescription>Datos clave para terreno y supervision</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <p className="text-muted-foreground">Codigo</p>
                <p className="font-semibold">{asset.asset_code || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Nombre</p>
                <p className="font-semibold">{asset.asset_name || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Estado</p>
                <p className="font-semibold">{asset.status || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Tipo</p>
                <p className="font-semibold">{asset.asset_type || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Ubicacion</p>
                <p className="font-semibold">{asset.location || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Criticidad</p>
                <p className="font-semibold">{asset.criticality || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Fabricante</p>
                <p className="font-semibold">{asset.manufacturer || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Modelo</p>
                <p className="font-semibold">{asset.model || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Familia derivada</p>
                <p className="font-semibold">{machineFamily || 'Sin familia'}</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3 print:grid-cols-3">
            <Card className="print:shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">OT activas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{activeOrders.length}</div>
              </CardContent>
            </Card>
            <Card className="print:shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Abiertas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">{openOrders.length}</div>
              </CardContent>
            </Card>
            <Card className="print:shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Ultima OT</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-semibold">{lastOrder?.work_order_number || 'Sin OT'}</div>
                <p className="text-xs text-muted-foreground">
                  {lastOrder?.status ? statusLabel(lastOrder.status) : 'Sin historial aun'}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="print:shadow-none">
            <CardHeader>
              <CardTitle>Acceso a ficha completa</CardTitle>
              <CardDescription>Desde este QR se navega a la ficha completa con historial real y órdenes</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild className="gap-2">
                <Link href={`/dashboard/mantenimiento/vehiculos/${asset.id}/ficha`}>
                  <Wrench className="h-4 w-4" />
                  Abrir ficha completa
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/dashboard/mantenimiento/vehiculos/${asset.id}/arbol`}>Ver árbol de fallas</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard/mantenimiento/movil">Vista móvil</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
