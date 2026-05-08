'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, Search } from 'lucide-react';
import { ContratoHitosCard } from '@/components/contratos/contrato-hitos-card';
import { ContratoGarantiasCard } from '@/components/contratos/contrato-garantias-card';
import { AlertasContratos } from '@/components/alerts/alertas-panel';
import { NuevoContratoModal } from '@/components/contratos/nuevo-contrato-modal';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ContratosPage() {
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch contractors with contracts
  const { data: dataContratos, error: errorContratos, isLoading: loadingContratos, mutate } = useSWR(
    `/api/contratos/hitos?search=${searchTerm}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 60000,
    }
  );

  // Fetch guarantees
  const { data: dataGarantias } = useSWR('/api/contratos/garantias', fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 60000,
  });

  // Fetch alerts
  const { data: dataAlertas } = useSWR('/api/contratos/alertas', fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 30000,
  });

  if (loadingContratos) return <div className="text-center py-8">Cargando contratos...</div>;
  if (errorContratos) return <div className="text-red-500">Error al cargar datos</div>;

  const contractors = dataContratos?.contractors || [];
  const hitos = dataContratos?.hitos || [];
  const garantias = dataGarantias?.garantias || [];
  const alertas = dataAlertas?.alertas || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Control de Contratos</h1>
          <p className="text-muted-foreground mt-1">Gestión centralizada de pagos, hitos y garantías</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => mutate()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Actualizar
          </Button>
          <NuevoContratoModal onSuccess={() => mutate()} />
        </div>
      </div>

      {/* Alerts Panel */}
      <AlertasContratos alertas={alertas} />

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar contratista o proyecto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contratos Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contractors.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Prestadores/Contratistas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hitos Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hitos.filter((h: any) => h.estado === 'pendiente').length}</div>
            <p className="text-xs text-muted-foreground mt-1">Pagos próximos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Garantías Activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{garantias.filter((g: any) => g.estado === 'retenida').length}</div>
            <p className="text-xs text-muted-foreground mt-1">Retenciones vigentes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alertas Activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{alertas.filter((a: any) => a.estado === 'activa').length}</div>
            <p className="text-xs text-muted-foreground mt-1">Requiere atención</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ContratoHitosCard hitos={hitos} />
        </div>

        <div className="space-y-6">
          <ContratoGarantiasCard garantias={garantias} />
        </div>
      </div>
    </div>
  );
}
