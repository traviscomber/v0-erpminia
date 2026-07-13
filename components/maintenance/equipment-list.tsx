'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import type { Equipment } from '@/lib/types/equipment';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle, Search, Wrench } from 'lucide-react';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());

const PAGE_SIZE = 24;

function normalizeText(value: string | null | undefined) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function normalizeStatus(value: string | null | undefined) {
  const normalized = normalizeText(value);
  if (['operativo', 'activo', 'active', '1', 'true', 'si'].includes(normalized)) return 'operativo';
  if (['mantenimiento', 'maintenance'].includes(normalized)) return 'mantenimiento';
  if (['inactivo', 'inactive', 'fuera de servicio', 'decommissioned'].includes(normalized)) return 'inactivo';
  return normalized || 'desconocido';
}

function normalizeCriticality(value: string | null | undefined) {
  const normalized = normalizeText(value);
  if (['critico', 'critical'].includes(normalized)) return 'critico';
  if (['alto', 'high'].includes(normalized)) return 'alto';
  if (['medio', 'medium'].includes(normalized)) return 'medio';
  if (['bajo', 'low'].includes(normalized)) return 'bajo';
  return normalized || 'medio';
}

function getCriticalityClass(criticality: string) {
  const c = normalizeCriticality(criticality);
  if (c === 'critico') return 'border-red-400 bg-red-50 text-red-800';
  if (c === 'alto') return 'border-orange-400 bg-orange-50 text-orange-800';
  if (c === 'medio') return 'border-yellow-400 bg-yellow-50 text-yellow-800';
  return 'border-green-400 bg-green-50 text-green-800';
}

function getStatusIcon(status: string) {
  const s = normalizeStatus(status);
  if (s === 'operativo') return <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />;
  if (s === 'mantenimiento') return <Wrench className="h-3.5 w-3.5 text-blue-600" />;
  return <AlertCircle className="h-3.5 w-3.5 text-gray-400" />;
}

function getStatusLabel(status: string) {
  const s = normalizeStatus(status);
  if (s === 'operativo') return 'Operativo';
  if (s === 'mantenimiento') return 'Mantenimiento';
  if (s === 'inactivo') return 'Inactivo';
  return status || 'Desconocido';
}

const TYPE_ORDER = [
  'Scoop',
  'Jumbo / Perforacion',
  'Dumper',
  'Cargador Frontal',
  'Excavadora',
  'Minicargador',
  'Manipulador Telescopico',
  'Generador',
  'Compresor',
  'Equipo de Sondaje',
  'Camioneta',
  'Camion',
  'Otro Equipo',
];

export function EquipmentList({
  onSelectEquipment,
}: {
  onSelectEquipment?: (equipment: Equipment) => void;
}) {
  const { data, isLoading, error } = useSWR<{ equipment: Equipment[] }>('/api/maintenance/equipment', fetcher);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [criticityFilter, setCriticityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const all = data?.equipment || [];

  const types = useMemo(() => {
    const found = [...new Set(all.map((e) => e.type))];
    return TYPE_ORDER.filter((t) => found.includes(t)).concat(found.filter((t) => !TYPE_ORDER.includes(t)));
  }, [all]);

  const kpis = useMemo(
    () => ({
      total: all.length,
      criticos: all.filter((e) => normalizeCriticality(e.criticality) === 'critico').length,
      mantenimiento: all.filter((e) => normalizeStatus(e.status) === 'mantenimiento').length,
      operativos: all.filter((e) => normalizeStatus(e.status) === 'operativo').length,
    }),
    [all],
  );

  const filtered = useMemo(() => {
    let list = all;
    const q = normalizeText(search);

    if (q) {
      list = list.filter(
        (e) =>
          normalizeText(e.name).includes(q) ||
          normalizeText(e.code).includes(q) ||
          normalizeText(e.type).includes(q) ||
          normalizeText(e.model).includes(q),
      );
    }

    if (typeFilter !== 'all') list = list.filter((e) => e.type === typeFilter);
    if (criticityFilter !== 'all') list = list.filter((e) => normalizeCriticality(e.criticality) === criticityFilter);
    if (statusFilter !== 'all') list = list.filter((e) => normalizeStatus(e.status) === statusFilter);

    return list;
  }, [all, search, typeFilter, criticityFilter, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFilter = (fn: (v: string) => void) => (v: string) => {
    fn(v);
    setPage(1);
  };

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <p className="text-sm text-red-800">Error al cargar equipos: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="pb-3 pt-4">
            <p className="text-xs text-muted-foreground">Total equipos</p>
            <p className="mt-1 text-3xl font-bold">{kpis.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pb-3 pt-4">
            <p className="text-xs text-muted-foreground">Operativos</p>
            <p className="mt-1 text-3xl font-bold text-emerald-600">{kpis.operativos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pb-3 pt-4">
            <p className="text-xs text-muted-foreground">En mantenimiento</p>
            <p className="mt-1 text-3xl font-bold text-blue-600">{kpis.mantenimiento}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pb-3 pt-4">
            <p className="text-xs text-muted-foreground">Criticidad alta</p>
            <p className="mt-1 text-3xl font-bold text-red-600">{kpis.criticos}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pb-4 pt-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar equipo o codigo..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-8"
              />
            </div>

            <Select value={typeFilter} onValueChange={handleFilter(setTypeFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {types.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={criticityFilter} onValueChange={handleFilter(setCriticityFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Criticidad" />
              </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toda criticidad</SelectItem>
                  <SelectItem value="critico">Critico</SelectItem>
                  <SelectItem value="alto">Alto</SelectItem>
                  <SelectItem value="medio">Medio</SelectItem>
                  <SelectItem value="bajo">Bajo</SelectItem>
                </SelectContent>
              </Select>

            <Select value={statusFilter} onValueChange={handleFilter(setStatusFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="operativo">Operativo</SelectItem>
                <SelectItem value="activo">Activo</SelectItem>
                <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                <SelectItem value="inactivo">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Mostrando {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}-{Math.min(page * PAGE_SIZE, filtered.length)} de{' '}
          {filtered.length} equipos
          {filtered.length !== all.length && ` (${all.length} total)`}
        </span>
        {totalPages > 1 && <span>Pagina {page} de {totalPages}</span>}
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : paginated.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">Sin equipos para los filtros seleccionados</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {paginated.map((equipment) => (
            <Card
              key={equipment.id}
              className="flex cursor-pointer flex-col transition-shadow hover:shadow-md"
              onClick={() => onSelectEquipment?.(equipment)}
            >
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate text-sm font-semibold leading-tight">{equipment.name}</CardTitle>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">{equipment.code}</p>
                  </div>
                  <Badge variant="outline" className={`shrink-0 text-xs ${getCriticalityClass(equipment.criticality)}`}>
                    {equipment.criticality}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="flex-1 space-y-2 pb-3 pt-0">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Tipo</span>
                  <span className="font-medium">{equipment.type}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Estado</span>
                  <div className="flex items-center gap-1.5">
                    {getStatusIcon(equipment.status)}
                    <span>{getStatusLabel(equipment.status)}</span>
                  </div>
                </div>
                {equipment.model && equipment.model !== equipment.name && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Modelo</span>
                    <span className="max-w-[120px] truncate">{equipment.model}</span>
                  </div>
                )}
                {equipment.next_maintenance && (
                  <div className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-700">
                    PM: {new Date(equipment.next_maintenance).toLocaleDateString('es-CL')}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <div className="flex gap-1">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p =
                totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;

              return (
                <Button
                  key={p}
                  variant={p === page ? 'default' : 'outline'}
                  size="sm"
                  className="w-8"
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              );
            })}
          </div>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
}
