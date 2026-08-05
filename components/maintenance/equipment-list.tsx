'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  MoreHorizontal,
  Route,
  Search,
  SlidersHorizontal,
  Wrench,
} from 'lucide-react';
import type { Equipment } from '@/lib/types/equipment';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) throw new Error('No fue posible cargar el registro de equipos');
  return response.json();
};

const PAGE_SIZE = 20;

function normalizeText(value: string | null | undefined) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function normalizeStatus(value: string | null | undefined) {
  const normalized = normalizeText(value);
  if (['operativo', 'activo', 'active', 'operational', '1', 'true', 'si'].includes(normalized)) return 'operativo';
  if (['mantenimiento', 'maintenance'].includes(normalized)) return 'mantenimiento';
  if (['inactivo', 'inactive', 'fuera de servicio', 'decommissioned'].includes(normalized)) return 'inactivo';
  return normalized || 'desconocido';
}

function normalizeCriticality(value: string | null | undefined) {
  const normalized = normalizeText(value);
  if (['critico', 'critica', 'critical'].includes(normalized)) return 'critico';
  if (['alto', 'alta', 'high'].includes(normalized)) return 'alto';
  if (['medio', 'media', 'medium'].includes(normalized)) return 'medio';
  if (['bajo', 'baja', 'low'].includes(normalized)) return 'bajo';
  return normalized || 'medio';
}

function statusLabel(value: string | null | undefined) {
  const status = normalizeStatus(value);
  if (status === 'operativo') return 'Operativo';
  if (status === 'mantenimiento') return 'En mantenimiento';
  if (status === 'inactivo') return 'Inactivo';
  return 'Sin estado';
}

function statusClass(value: string | null | undefined) {
  const status = normalizeStatus(value);
  if (status === 'operativo') return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  if (status === 'mantenimiento') return 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300';
  if (status === 'inactivo') return 'border-slate-500/25 bg-slate-500/10 text-slate-600 dark:text-slate-300';
  return 'border-border bg-muted text-muted-foreground';
}

function criticalityLabel(value: string | null | undefined) {
  const criticality = normalizeCriticality(value);
  if (criticality === 'critico') return 'Crítica';
  if (criticality === 'alto') return 'Alta';
  if (criticality === 'bajo') return 'Baja';
  return 'Media';
}

function criticalityClass(value: string | null | undefined) {
  const criticality = normalizeCriticality(value);
  if (criticality === 'critico') return 'border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300';
  if (criticality === 'alto') return 'border-orange-500/25 bg-orange-500/10 text-orange-700 dark:text-orange-300';
  if (criticality === 'bajo') return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  return 'border-yellow-500/25 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300';
}

function detailId(equipment: Equipment) {
  return equipment.asset_id || equipment.id;
}

function isCanonicalAsset(equipment: Equipment) {
  return Boolean(equipment.asset_id);
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

function EquipmentActions({ equipment }: { equipment: Equipment }) {
  if (!isCanonicalAsset(equipment)) {
    return (
      <Badge variant="outline" className="font-normal text-muted-foreground">
        Referencia operativa
      </Badge>
    );
  }

  const id = detailId(equipment);

  return (
    <div className="flex items-center justify-end gap-2" onClick={(event) => event.stopPropagation()}>
      <Button asChild size="sm" variant="outline" className="h-8">
        <Link href={`/dashboard/mantenimiento/equipos/${id}/ficha`}>
          <FileText className="mr-2 h-3.5 w-3.5" />
          Abrir ficha
        </Link>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Más acciones para ${equipment.name}`}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/mantenimiento/equipos/${id}/ficha-tecnica`}>
              <FileText className="h-4 w-4" />
              Ficha técnica
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/mantenimiento/equipos/${id}/arbol`}>
              <Route className="h-4 w-4" />
              Árbol del activo
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/mantenimiento/ordenes-trabajo/create?assetId=${id}`}>
              <Wrench className="h-4 w-4" />
              Crear orden de trabajo
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function EquipmentList({ onSelectEquipment }: { onSelectEquipment?: (equipment: Equipment) => void }) {
  const { data, isLoading, error } = useSWR<{ equipment: Equipment[] }>('/api/maintenance/equipment', fetcher);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [criticityFilter, setCriticityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const all = data?.equipment || [];
  const canonicalCount = all.filter(isCanonicalAsset).length;
  const referenceCount = all.length - canonicalCount;

  const types = useMemo(() => {
    const found = [...new Set(all.map((equipment) => equipment.type).filter(Boolean))];
    return TYPE_ORDER.filter((type) => found.includes(type)).concat(found.filter((type) => !TYPE_ORDER.includes(type)));
  }, [all]);

  const metrics = useMemo(
    () => ({
      total: all.length,
      operativos: all.filter((equipment) => normalizeStatus(equipment.status) === 'operativo').length,
      mantenimiento: all.filter((equipment) => normalizeStatus(equipment.status) === 'mantenimiento').length,
      criticos: all.filter((equipment) => normalizeCriticality(equipment.criticality) === 'critico').length,
    }),
    [all],
  );

  const filtered = useMemo(() => {
    const query = normalizeText(search);
    return all.filter((equipment) => {
      const matchesSearch =
        !query ||
        [equipment.name, equipment.code, equipment.type, equipment.model].some((value) => normalizeText(value).includes(query));
      const matchesType = typeFilter === 'all' || equipment.type === typeFilter;
      const matchesCriticality =
        criticityFilter === 'all' || normalizeCriticality(equipment.criticality) === criticityFilter;
      const matchesStatus = statusFilter === 'all' || normalizeStatus(equipment.status) === statusFilter;
      return matchesSearch && matchesType && matchesCriticality && matchesStatus;
    });
  }, [all, search, typeFilter, criticityFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const hasFilters = search || typeFilter !== 'all' || criticityFilter !== 'all' || statusFilter !== 'all';

  const resetFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setCriticityFilter('all');
    setStatusFilter('all');
    setPage(1);
  };

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="flex items-center gap-3 py-6">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <div>
            <p className="font-medium">No se pudo cargar el registro de equipos</p>
            <p className="text-sm text-muted-foreground">Revisa la conexión o intenta nuevamente.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
            {[
              ['Registro total', metrics.total, `${canonicalCount} con ficha canónica`],
              ['Operativos', metrics.operativos, 'Disponibles para operación'],
              ['En mantenimiento', metrics.mantenimiento, 'Requieren seguimiento'],
              ['Criticidad alta', metrics.criticos, 'Prioridad operacional'],
            ].map(([label, value, helper]) => (
              <div key={String(label)} className="px-4 py-4 sm:px-5">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Buscar por código, nombre, tipo o modelo"
                className="pl-9"
              />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:flex lg:shrink-0">
              <Select value={typeFilter} onValueChange={(value) => { setTypeFilter(value); setPage(1); }}>
                <SelectTrigger className="lg:w-44"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  {types.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }}>
                <SelectTrigger className="lg:w-44"><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="operativo">Operativo</SelectItem>
                  <SelectItem value="mantenimiento">En mantenimiento</SelectItem>
                  <SelectItem value="inactivo">Inactivo</SelectItem>
                </SelectContent>
              </Select>
              <Select value={criticityFilter} onValueChange={(value) => { setCriticityFilter(value); setPage(1); }}>
                <SelectTrigger className="lg:w-44"><SelectValue placeholder="Criticidad" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toda criticidad</SelectItem>
                  <SelectItem value="critico">Crítica</SelectItem>
                  <SelectItem value="alto">Alta</SelectItem>
                  <SelectItem value="medio">Media</SelectItem>
                  <SelectItem value="bajo">Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t pt-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              <span>{filtered.length} equipos encontrados</span>
              {referenceCount > 0 && <span className="hidden sm:inline">· {referenceCount} referencias desde centros de costo</span>}
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="self-start sm:self-auto">
                Limpiar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card><CardContent className="space-y-3 py-6">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-12 animate-pulse rounded-md bg-muted" />)}</CardContent></Card>
      ) : paginated.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-14 text-center"><p className="font-medium">No hay equipos para esta búsqueda</p><p className="mt-1 text-sm text-muted-foreground">Ajusta los filtros o limpia la búsqueda.</p></CardContent></Card>
      ) : (
        <>
          <Card className="hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/35 text-left text-xs uppercase tracking-[0.08em] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Equipo</th>
                    <th className="px-4 py-3 font-medium">Tipo / modelo</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Criticidad</th>
                    <th className="px-4 py-3 font-medium">Origen</th>
                    <th className="px-4 py-3 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginated.map((equipment) => (
                    <tr key={equipment.id} className="transition-colors hover:bg-muted/25" onClick={() => onSelectEquipment?.(equipment)}>
                      <td className="px-4 py-3.5">
                        <div className="font-medium">{equipment.name}</div>
                        <div className="mt-0.5 font-mono text-xs text-muted-foreground">{equipment.code}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div>{equipment.type || 'Sin clasificar'}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{equipment.model && equipment.model !== equipment.name ? equipment.model : 'Modelo no informado'}</div>
                      </td>
                      <td className="px-4 py-3.5"><Badge variant="outline" className={statusClass(equipment.status)}>{statusLabel(equipment.status)}</Badge></td>
                      <td className="px-4 py-3.5"><Badge variant="outline" className={criticalityClass(equipment.criticality)}>{criticalityLabel(equipment.criticality)}</Badge></td>
                      <td className="px-4 py-3.5 text-muted-foreground">{isCanonicalAsset(equipment) ? 'Activo canónico' : 'Centro de costo'}</td>
                      <td className="px-4 py-3.5"><EquipmentActions equipment={equipment} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="space-y-3 md:hidden">
            {paginated.map((equipment) => (
              <Card key={equipment.id} onClick={() => onSelectEquipment?.(equipment)}>
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{equipment.name}</p>
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">{equipment.code}</p>
                    </div>
                    <Badge variant="outline" className={statusClass(equipment.status)}>{statusLabel(equipment.status)}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><p className="text-xs text-muted-foreground">Tipo</p><p className="mt-1 font-medium">{equipment.type || 'Sin clasificar'}</p></div>
                    <div><p className="text-xs text-muted-foreground">Criticidad</p><Badge variant="outline" className={`mt-1 ${criticalityClass(equipment.criticality)}`}>{criticalityLabel(equipment.criticality)}</Badge></div>
                  </div>
                  <div className="border-t pt-3"><EquipmentActions equipment={equipment} /></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {totalPages > 1 && (
        <div className="flex flex-col gap-3 border-t pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground">Página {currentPage} de {totalPages}</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
              Siguiente <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
