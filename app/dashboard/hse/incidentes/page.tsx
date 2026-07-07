'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Search, Download, Upload } from 'lucide-react';
import { IncidentsImport } from '@/components/hse/incidents-import';

type IncidentItem = {
  id?: string | number | null;
  title?: string | null;
  description?: string | null;
  severity?: string | null;
  status?: string | null;
  location?: string | null;
  date_reported?: string | null;
};

type IncidentsApiResponse = {
  data: IncidentItem[];
  count: number;
  warning?: string;
};

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) return null;
  return (await response.json()) as IncidentsApiResponse;
};

export default function HSEIncidentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState('');

  const { data, error, isLoading, mutate } = useSWR(
    `/api/hse/incidents${status ? `?status=${encodeURIComponent(status)}` : ''}`,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 300000 }
  );

  const handleReload = () => {
    void mutate();
  };

  const incidents = data?.data || [];

  const filtered = useMemo(
    () =>
      incidents.filter((item) =>
        `${item.title || ''} ${item.description || ''} ${item.location || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [incidents, searchTerm]
  );

  const bySeverity = useMemo(() => {
    return filtered.reduce((acc: Record<string, number>, item) => {
      const key = String(item.severity || 'media');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [filtered]);
  const severityEntries = Object.entries(bySeverity) as [string, number][];

  const downloadTemplate = () => {
    const headers = ['TITLE', 'DESCRIPTION', 'SEVERITY', 'STATUS', 'DATE_REPORTED', 'LOCATION'];
    const rows = [
      ['Golpe menor durante inspección', 'Corte leve en mano izquierda', 'baja', 'abierto', '2026-06-27', 'Planta'],
      ['Caída al mismo nivel', 'Resbalón en pasillo', 'media', 'cerrado', '2026-06-27', 'Taller'],
    ];
    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plantilla-incidentes-hse.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (error) return <div className="text-red-500">Error al cargar incidentes.</div>;
  if (isLoading) return <div className="text-gray-500">Cargando incidentes...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Incidentes HSE</h1>
          <p className="text-muted-foreground">Registro e importación masiva de incidentes operacionales.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Plantilla Excel
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/hse/incidentes/importar">
              <Upload className="mr-2 h-4 w-4" />
              Importar Excel
            </Link>
          </Button>
          <Button variant="outline" onClick={handleReload}>
            <Search className="mr-2 h-4 w-4" />
            Recargar
          </Button>
        </div>
      </div>

      <IncidentsImport onSuccess={handleReload} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{incidents.length}</div></CardContent>
        </Card>
        {severityEntries.map(([severity, count]) => (
          <Card key={severity}>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground capitalize">{severity}</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{count}</div></CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar incidente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant={status === '' ? 'default' : 'outline'} size="sm" onClick={() => setStatus('')}>Todos</Button>
            {['abierto', 'en progreso', 'cerrado'].map((value) => (
              <Button key={value} variant={status === value ? 'default' : 'outline'} size="sm" onClick={() => setStatus(value)}>
                {value}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {filtered.map((item) => (
          <Card key={item.id || `${item.title}-${item.date_reported}`}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-[var(--brand-rojo)]" />
                    <h3 className="font-semibold">{item.title || 'Sin título'}</h3>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{item.description || 'Sin descripción'}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="outline">{item.severity || 'media'}</Badge>
                    <Badge variant="outline">{item.status || 'abierto'}</Badge>
                    {item.location ? <Badge variant="outline">{item.location}</Badge> : null}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {item.date_reported ? new Date(item.date_reported).toLocaleDateString('es-CL') : 'Sin fecha'}
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
