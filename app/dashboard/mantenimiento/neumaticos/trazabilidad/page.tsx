'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface Tire {
  id: string;
  tire_code: string;
  tire_name: string;
  brand: string;
  current_lifecycle_status: string;
  current_location: string;
  repair_count: number;
}

interface DashboardData {
  data: Tire[];
  stats: {
    total: number;
    in_stock: number;
    installed: number;
    in_repair: number;
    waiting_repair: number;
    average_repair_count: string;
  };
}

export default function TrazabilidadPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch('/api/maintenance/tires/dashboard', {
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Error loading dashboard');

        const data = await response.json();
        setDashboardData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading dashboard');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      in_stock: 'bg-gray-600',
      installed: 'bg-green-600',
      in_repair: 'bg-yellow-600',
      waiting_repair: 'bg-orange-600',
      awaiting_transport: 'bg-blue-600',
    };
    return colors[status] || 'bg-gray-500';
  };

  const getTiresByStatus = (status: string) => dashboardData?.data.filter((t) => t.current_lifecycle_status === status) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Trazabilidad de Neumaticos</h1>
          <p className="text-muted-foreground mt-2">
            Visualiza el estado y ubicación de todos los neumaticos en tiempo real
          </p>
        </div>

        {/* Stats */}
        {dashboardData && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Card className="p-4 bg-card border-border">
              <div className="text-sm text-muted-foreground">Total</div>
              <div className="text-3xl font-bold text-foreground mt-2">{dashboardData.stats.total}</div>
            </Card>
            <Card className="p-4 bg-card border-border">
              <div className="text-sm text-muted-foreground">En Bodega</div>
              <div className="text-3xl font-bold text-gray-600 mt-2">{dashboardData.stats.in_stock}</div>
            </Card>
            <Card className="p-4 bg-card border-border">
              <div className="text-sm text-muted-foreground">Operativos</div>
              <div className="text-3xl font-bold text-green-600 mt-2">{dashboardData.stats.installed}</div>
            </Card>
            <Card className="p-4 bg-card border-border">
              <div className="text-sm text-muted-foreground">En Reparación</div>
              <div className="text-3xl font-bold text-yellow-600 mt-2">{dashboardData.stats.in_repair}</div>
            </Card>
            <Card className="p-4 bg-card border-border">
              <div className="text-sm text-muted-foreground">Esperando Taller</div>
              <div className="text-3xl font-bold text-orange-600 mt-2">{dashboardData.stats.waiting_repair}</div>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="en_stock" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="en_stock">Bodega</TabsTrigger>
            <TabsTrigger value="waiting_repair">Esperando</TabsTrigger>
            <TabsTrigger value="in_repair">Reparación</TabsTrigger>
            <TabsTrigger value="installed">Operativos</TabsTrigger>
          </TabsList>

          {['in_stock', 'waiting_repair', 'in_repair', 'installed'].map((status) => (
            <TabsContent key={status} value={status} className="space-y-3">
              {getTiresByStatus(status).length === 0 ? (
                <Card className="p-6 text-center text-muted-foreground">
                  No hay neumaticos en este estado
                </Card>
              ) : (
                getTiresByStatus(status).map((tire) => (
                  <Link key={tire.id} href={`/dashboard/mantenimiento/neumaticos/detalle/${tire.id}`}>
                    <Card className="p-4 bg-card border-border hover:border-primary cursor-pointer transition">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">{tire.tire_name}</h3>
                          <p className="text-sm text-muted-foreground mt-1">Código: {tire.tire_code}</p>
                          <p className="text-sm text-muted-foreground">Ubicación: {tire.current_location}</p>
                          <p className="text-xs text-muted-foreground mt-2">Reparaciones: {tire.repair_count}</p>
                        </div>
                        <Badge className={`${getStatusColor(status)} text-white`}>
                          {status.replace(/_/g, ' ').toUpperCase()}
                        </Badge>
                      </div>
                    </Card>
                  </Link>
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Info Section */}
        <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 space-y-3">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100">Sistema de Trazabilidad FASE 3</h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
            <li>Registro completo desde bodega hasta reinstalación</li>
            <li>GPS y fotografía en cada etapa</li>
            <li>Tiempo real de traslado y reparación</li>
            <li>Responsabilidad clara de cada técnico</li>
            <li>Historial completo por neumatico</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
