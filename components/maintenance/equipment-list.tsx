'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import type { Equipment } from '@/lib/types/equipment';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle, Clock, Wrench } from 'lucide-react';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json());

const criticityColors = {
  'Crítica': 'bg-red-100 text-red-800 border-red-300',
  'Alta': 'bg-orange-100 text-orange-800 border-orange-300',
  'Media': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'Baja': 'bg-green-100 text-green-800 border-green-300',
};

const statusIcons = {
  'Activo': <CheckCircle className="h-4 w-4 text-emerald-600" />,
  'Mantenimiento': <Wrench className="h-4 w-4 text-blue-600" />,
  'Inactivo': <AlertCircle className="h-4 w-4 text-gray-600" />,
};

export function EquipmentList({ onSelectEquipment }: { onSelectEquipment?: (equipment: Equipment) => void }) {
  const { data, isLoading, error } = useSWR<{ equipment: Equipment[] }>('/api/maintenance/equipment', fetcher);
  const [filteredEquipment, setFilteredEquipment] = useState<Equipment[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [criticityFilter, setCriticityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (!data?.equipment) return;

    let filtered = data.equipment;

    if (typeFilter !== 'all') {
      filtered = filtered.filter(e => e.type === typeFilter);
    }
    if (criticityFilter !== 'all') {
      filtered = filtered.filter(e => e.criticality === criticityFilter);
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(e => e.status === statusFilter);
    }

    setFilteredEquipment(filtered);
  }, [data?.equipment, typeFilter, criticityFilter, statusFilter]);

  const types = [...new Set(data?.equipment?.map(e => e.type) || [])].sort();
  const criticities = [...new Set(data?.equipment?.map(e => e.criticality) || [])].sort();
  const statuses = [...new Set(data?.equipment?.map(e => e.status) || [])].sort();

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <p className="text-sm text-red-800">Error loading equipment: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium">Tipo</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  {types.map(type => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Criticidad</label>
              <Select value={criticityFilter} onValueChange={setCriticityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {criticities.map(c => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Estado</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {statuses.map(s => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Equipment Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : filteredEquipment.length === 0 ? (
          <Card className="col-span-full border-dashed">
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No se encontraron equipos con los filtros seleccionados
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredEquipment.map(equipment => (
            <Card key={equipment.id} className="flex flex-col hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-base">{equipment.name}</CardTitle>
                    <CardDescription className="text-xs">{equipment.code}</CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className={criticityColors[equipment.criticality as keyof typeof criticityColors] || 'bg-gray-100'}
                  >
                    {equipment.criticality}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="flex-1 space-y-3 pb-3">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Estado:</span>
                    <div className="flex items-center gap-2">
                      {statusIcons[equipment.status as keyof typeof statusIcons]}
                      <span className="font-medium">{equipment.status}</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo:</span>
                    <span>{equipment.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Modelo:</span>
                    <span className="text-xs">{equipment.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ubicación:</span>
                    <span className="text-xs">{equipment.location}</span>
                  </div>

                  {equipment.next_maintenance && (
                    <div className="flex items-center gap-2 rounded-sm bg-blue-50 p-2 text-xs">
                      <Clock className="h-3 w-3 text-blue-600" />
                      <span>PM: {new Date(equipment.next_maintenance).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </CardContent>

              <div className="border-t px-4 py-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => onSelectEquipment?.(equipment)}
                >
                  Ver Ficha Técnica
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        Total: {filteredEquipment.length} de {data?.equipment?.length || 0} equipos
      </div>
    </div>
  );
}
