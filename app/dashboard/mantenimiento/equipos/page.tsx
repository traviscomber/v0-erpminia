'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Download, Search, Factory } from 'lucide-react';
import { AssetImport } from '@/components/mantenimiento/asset-import';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar los equipos');
  return payload;
};

type EquipmentRecord = {
  id?: string;
  assetCode?: string;
  assetName?: string;
  assetType?: string;
  model?: string;
  manufacturer?: string;
  location?: string;
  status?: string;
  criticality?: string;
};

export default function EquiposPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState('');
  const [criticality, setCriticality] = useState('');

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set('asset_type', 'equipment');
    if (status) params.set('status', status);
    if (criticality) params.set('criticality', criticality);
    return `/api/maintenance/assets?${params.toString()}`;
  }, [status, criticality]);

  const { data, error, isLoading, mutate } = useSWR(query, fetcher);

  const equipments = Array.isArray(data?.assets) ? (data.assets as EquipmentRecord[]) : [];

  const filtered = useMemo(
    () =>
      equipments.filter((item) =>
        `${item.assetCode || ''} ${item.assetName || ''} ${item.model || ''} ${item.location || ''}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      ),
    [equipments, searchTerm]
  );

  const summary = useMemo(
    () =>
      filtered.reduce(
        (acc: Record<string, number>, item) => {
          const normalizedStatus = String(item.status || 'active').toLowerCase();
          const normalizedCriticality = String(item.criticality || 'media').toLowerCase();
          acc.total += 1;
          acc[normalizedStatus] = (acc[normalizedStatus] || 0) + 1;
          acc[normalizedCriticality] = (acc[normalizedCriticality] || 0) + 1;
          return acc;
        },
        { total: 0 } as Record<string, number>
      ),
    [filtered]
  );

  const downloadTemplate = () => {
    const headers = ['CODIGO', 'NOMBRE', 'TIPO', 'UBICACION', 'ESTADO', 'MODELO', 'SERIE', 'CRITICIDAD'];
    const rows = [
      ['EQ-001', 'Perforadora principal', 'equipment', 'Rajo', 'active', 'Atlas Copco', 'SN-001', 'critical'],
      ['EQ-002', 'Compresor auxiliar', 'equipment', 'Taller', 'maintenance', 'Kaeser', 'SN-002', 'high'],
    ];
    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plantilla-equipos-maquinaria.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (error) return <div className="text-red-500">Error al cargar equipos.</div>;
  if (isLoading) return <div className="text-gray-500">Cargando equipos...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Maquinaria y equipos</h1>
          <p className="text-muted-foreground">Catastro operativo con importacion Excel y filtrado por criticidad.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            La reimportacion actualiza por CODIGO normalizado para evitar duplicados por mayusculas, espacios o variantes de formato.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Plantilla Excel
          </Button>
          <Button variant="outline" onClick={() => mutate()}>
            <Search className="mr-2 h-4 w-4" />
            Recargar
          </Button>
        </div>
      </div>

      <AssetImport onSuccess={() => mutate()} />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total || equipments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Operativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.active || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">En mantencion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.maintenance || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Criticos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.critical || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar equipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant={status === '' ? 'default' : 'outline'} size="sm" onClick={() => setStatus('')}>
              Todos
            </Button>
            {['active', 'maintenance', 'inactive'].map((value) => (
              <Button key={value} variant={status === value ? 'default' : 'outline'} size="sm" onClick={() => setStatus(value)}>
                {value}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={criticality === '' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCriticality('')}
            >
              Todas las criticidades
            </Button>
            {['critical', 'high', 'media', 'low'].map((value) => (
              <Button
                key={value}
                variant={criticality === value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCriticality(value)}
              >
                {value}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {filtered.map((item) => (
          <Card key={item.id || item.assetCode}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Factory className="h-4 w-4 text-[var(--brand-rojo)]" />
                    <h3 className="font-semibold">{item.assetName || 'Sin nombre'}</h3>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {item.assetCode || 'Sin codigo'} · {item.assetType || 'equipment'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="outline">{item.status || 'active'}</Badge>
                    <Badge variant="outline">{item.criticality || 'media'}</Badge>
                    {item.location ? <Badge variant="outline">{item.location}</Badge> : null}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {item.model || 'Sin modelo'} · {item.manufacturer || 'Sin fabricante'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground">No hay coincidencias para el filtro actual.</CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
