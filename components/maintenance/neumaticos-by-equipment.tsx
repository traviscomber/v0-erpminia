'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { DownloadCloud, Filter, Search, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

interface TireByEquipmentResponse {
  equipment: {
    id: string;
    assetCode: string;
    assetName: string;
    assetType: string;
    mtbfHours: number;
  } | null;
  tires: Array<{
    id: string;
    tireCode: string;
    tireName: string;
    condition: string;
    lifecycleStatus: string;
    installedAt: string | null;
    removedAt: string | null;
    purchaseOrderNumber: string | null;
    notes: string | null;
    updatedAt: string | null;
    daysInstalled: number;
  }>;
  summary: {
    total: number;
    installed: number;
    inStock: number;
    retired: number;
    totalCost: number;
  };
}

interface NeumaticosEquipmentProps {
  equipmentCode?: string;
}

const statusColors: Record<string, string> = {
  Instalado: 'bg-green-100 text-green-800',
  Bodega: 'bg-blue-100 text-blue-800',
  'En reparación': 'bg-amber-100 text-amber-800',
  Reemplazado: 'bg-gray-100 text-gray-800',
  Retirado: 'bg-red-100 text-red-800',
  'En reposición': 'bg-orange-100 text-orange-800',
};

const conditionColors: Record<string, string> = {
  Nuevo: 'border-green-300 bg-green-50',
  Usado: 'border-blue-300 bg-blue-50',
  Gastado: 'border-amber-300 bg-amber-50',
  Dañado: 'border-red-300 bg-red-50',
  Reparado: 'border-orange-300 bg-orange-50',
};

export function NeumaticosEquipment({ equipmentCode }: NeumaticosEquipmentProps) {
  const [selectedEquipment, setSelectedEquipment] = useState(equipmentCode || '');
  const [searchInput, setSearchInput] = useState(selectedEquipment);
  const [lifecycleFilter, setLifecycleFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, error } = useSWR<TireByEquipmentResponse>(
    selectedEquipment
      ? `/api/maintenance/neumaticos/by-equipment?equipmentCode=${selectedEquipment}${
          lifecycleFilter ? `&lifecycleStatus=${lifecycleFilter}` : ''
        }`
      : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const handleSearch = (value: string) => {
    setSearchInput(value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSelectedEquipment(searchInput.toUpperCase());
  };

  const tiresByStatus = useMemo(() => {
    if (!data?.tires) return {};
    return data.tires.reduce(
      (acc, tire) => {
        const status = tire.lifecycleStatus;
        if (!acc[status]) acc[status] = [];
        acc[status].push(tire);
        return acc;
      },
      {} as Record<string, typeof data.tires>
    );
  }, [data?.tires]);

  if (!selectedEquipment) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Neumáticos por Equipo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearchSubmit} className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Ingresa código de equipo (ej: EQ-PALA-001)"
                value={searchInput}
                onChange={(e) => handleSearch(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Equipment Info */}
      {data?.equipment && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <div className="text-xs text-gray-600">Código</div>
                <div className="font-bold text-blue-900">{data.equipment.assetCode}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Equipo</div>
                <div className="text-sm text-gray-900">{data.equipment.assetName}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Tipo</div>
                <div className="text-sm text-gray-900">{data.equipment.assetType}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-600">MTBF</div>
                <div className="font-semibold text-gray-900">
                  {Number(data.equipment.mtbfHours || 0).toLocaleString()} h
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      {data?.summary && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-900">{data.summary.total}</div>
              <div className="text-xs text-gray-600">Total neumáticos</div>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-900">{data.summary.installed}</div>
              <div className="text-xs text-green-700">Instalados</div>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-900">{data.summary.inStock}</div>
              <div className="text-xs text-blue-700">En bodega</div>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-900">{data.summary.retired}</div>
              <div className="text-xs text-red-700">Retirados</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          onClick={() => setShowFilters(!showFilters)}
          variant="outline"
          className="border-gray-300"
        >
          <Filter className="w-4 h-4 mr-2" />
          Filtros
        </Button>
        <Button variant="outline" className="ml-auto border-gray-300">
          <DownloadCloud className="w-4 h-4 mr-2" />
          Exportar
        </Button>
      </div>

      {showFilters && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Estado:</label>
                <select
                  value={lifecycleFilter}
                  onChange={(e) => setLifecycleFilter(e.target.value)}
                  className="mt-1 w-full rounded border border-amber-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Todos</option>
                  <option value="installed">Instalado</option>
                  <option value="in_stock">Bodega</option>
                  <option value="replaced">Reemplazado</option>
                  <option value="retired">Retirado</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tires by Status (Kanban View) */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Cargando neumáticos...</div>
      ) : Object.keys(tiresByStatus).length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-gray-500">
            No hay neumáticos registrados para este equipo
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Object.entries(tiresByStatus).map(([status, tires]) => (
            <Card
              key={status}
              className={`border-2 ${conditionColors['Nuevo'] || 'border-gray-200'}`}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>{status}</span>
                  <Badge className={statusColors[status] || 'bg-gray-100 text-gray-800'}>
                    {tires.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {tires.map((tire) => (
                  <div
                    key={tire.id}
                    className={`p-3 rounded-lg border-l-4 ${
                      conditionColors[tire.condition] || 'border-gray-300 bg-gray-50'
                    }`}
                  >
                    <div className="font-semibold text-sm text-gray-900">{tire.tireCode}</div>
                    <div className="text-xs text-gray-600">{tire.tireName}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Condición: {tire.condition}
                    </div>
                    {tire.installedAt && (
                      <div className="text-xs text-gray-500">
                        Instalado hace {tire.daysInstalled} días
                      </div>
                    )}
                    {tire.notes && (
                      <div className="text-xs text-gray-700 mt-2 italic">"{tire.notes}"</div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
