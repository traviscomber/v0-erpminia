'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Download, Search, ShieldAlert, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RiskMatrixImport } from '@/components/hse/risk-matrix-import';

type RiskItem = {
  id?: string | number | null;
  title?: string | null;
  hazard?: string | null;
  location?: string | null;
  control_measure?: string | null;
  risk_level?: string | null;
  status?: string | null;
};

type RiskApiResponse = {
  data: RiskItem[];
  count: number;
  warning?: string;
};

const fetcher = async (url: string): Promise<RiskApiResponse | null> => {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as RiskApiResponse;
};

export default function HSERiskMatrixPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState('');

  const { data, error, isLoading } = useSWR(
    `/api/hse/risk-matrix${status ? `?status=${encodeURIComponent(status)}` : ''}`,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 300000 }
  );

  const risks = data?.data ?? [];

  const filtered = useMemo(
    () =>
      risks.filter((item) =>
        `${item.title || ''} ${item.hazard || ''} ${item.location || ''} ${item.control_measure || ''}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      ),
    [risks, searchTerm]
  );

  const summary = useMemo(() => {
    return filtered.reduce<Record<string, number>>(
      (acc, item) => {
        const level = String(item.risk_level || 'media').toLowerCase();
        const itemStatus = String(item.status || 'open').toLowerCase();
        acc.total = (acc.total || 0) + 1;
        acc[level] = (acc[level] || 0) + 1;
        acc[itemStatus] = (acc[itemStatus] || 0) + 1;
        return acc;
      },
      { total: 0 }
    );
  }, [filtered]);

  const severityEntries = Object.entries(summary).filter(([key]) => key !== 'total') as [string, number][];

  const downloadTemplate = () => {
    const headers = ['TITLE', 'HAZARD', 'RISK_LEVEL', 'STATUS', 'CONTROL_MEASURE', 'LOCATION'];
    const rows = [
      ['Caída en pasillo', 'Superficie mojada', 'media', 'open', 'Señalizar y secar área', 'Planta'],
      ['Golpe por objeto', 'Material suspendido', 'alta', 'open', 'Uso de casco y exclusión', 'Taller'],
    ];

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';'))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plantilla-matriz-riesgos.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (error) {
    return <div className="text-red-500">Error al cargar la matriz de riesgos.</div>;
  }

  if (isLoading) {
    return <div className="text-gray-500">Cargando matriz de riesgos...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Matriz de Riesgos HSE</h1>
          <p className="text-muted-foreground">Registro operativo, filtros rápidos e importación masiva desde Excel.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="mr-1 h-4 w-4" />
            Plantilla Excel
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/hse/riesgos/importar">
              <Upload className="mr-1 h-4 w-4" />
              Importar Excel
            </Link>
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <ShieldAlert className="mr-1 h-4 w-4" />
            Recargar
          </Button>
        </div>
      </div>

      <RiskMatrixImport onSuccess={() => window.location.reload()} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total riesgos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
          </CardContent>
        </Card>
        {severityEntries.map(([severity, count]) => (
          <Card key={severity}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground capitalize">{severity}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{count}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar por título, peligro, ubicación o control..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {['', 'open', 'closed'].map((value) => (
            <Button key={value || 'all'} variant={status === value ? 'default' : 'outline'} onClick={() => setStatus(value)}>
              {value === '' ? 'Todos' : value === 'open' ? 'Abiertos' : 'Cerrados'}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filtered.map((item) => (
          <Card key={String(item.id || `${item.title || 'risk'}-${item.location || 'sin-ubicacion'}-${item.risk_level || 'media'}`)}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldAlert className="h-4 w-4" />
                <span className="capitalize">{item.title || 'Sin título'}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{item.hazard || 'Sin peligro asociado'}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="capitalize">
                  {item.risk_level || 'media'}
                </Badge>
                <Badge variant="secondary" className="capitalize">
                  {item.status || 'open'}
                </Badge>
                {item.location ? <Badge variant="outline">{item.location}</Badge> : null}
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <p className="font-medium">Medida de control</p>
                <p className="text-muted-foreground">{item.control_measure || 'Sin medida de control registrada'}</p>
              </div>
            </CardContent>
          </Card>
        ))}

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">No hay coincidencias para el filtro actual.</CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
