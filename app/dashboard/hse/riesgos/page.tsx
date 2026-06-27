'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Download, Search, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RiskMatrixImport } from '@/components/hse/risk-matrix-import';

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) return null;
  return response.json();
};

export default function HSERiesgosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState('');

  const { data, error, isLoading, mutate } = useSWR(
    `/api/hse/risk-matrix${status ? `?status=${encodeURIComponent(status)}` : ''}`,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 300000 }
  );

  const risks = data?.data || [];

  const filtered = useMemo(
    () =>
      risks.filter((item: any) =>
        `${item.title || ''} ${item.hazard || ''} ${item.location || ''} ${item.control_measure || ''}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      ),
    [risks, searchTerm]
  );

  const summary = useMemo(() => {
    return filtered.reduce(
      (acc: Record<string, number>, item: any) => {
        const level = String(item.risk_level || 'media').toLowerCase();
        const itemStatus = String(item.status || 'open').toLowerCase();
        acc.total += 1;
        acc[level] = (acc[level] || 0) + 1;
        acc[itemStatus] = (acc[itemStatus] || 0) + 1;
        return acc;
      },
      { total: 0 } as Record<string, number>
    );
  }, [filtered]);

  const downloadTemplate = () => {
    const headers = ['TITLE', 'HAZARD', 'RISK_LEVEL', 'STATUS', 'CONTROL_MEASURE', 'LOCATION'];
    const rows = [
      ['Caida de altura', 'Trabajo en altura', 'alta', 'open', 'Linea de vida y arnes', 'Planta'],
      ['Contacto con equipo', 'Maquinaria en movimiento', 'media', 'open', 'Bloqueo y etiquetado', 'Taller'],
    ];
    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plantilla-matriz-riesgos-hse.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (error) return <div className="text-red-500">Error al cargar la matriz de riesgos.</div>;
  if (isLoading) return <div className="text-gray-500">Cargando matriz de riesgos...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Riesgos HSE</h1>
          <p className="text-muted-foreground">Matriz viva de peligros, controles y estado de mitigacion.</p>
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

      <RiskMatrixImport onSuccess={() => mutate()} />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total || risks.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Alta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.alta || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Media</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.media || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Abiertas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.open || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar riesgo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant={status === '' ? 'default' : 'outline'} size="sm" onClick={() => setStatus('')}>
              Todos
            </Button>
            {['open', 'mitigated', 'closed'].map((value) => (
              <Button
                key={value}
                variant={status === value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatus(value)}
              >
                {value}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {filtered.map((item: any) => (
          <Card key={item.id || `${item.title}-${item.location}-${item.risk_level}`}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-[var(--brand-rojo)]" />
                    <h3 className="font-semibold">{item.title || 'Sin titulo'}</h3>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{item.hazard || 'Sin peligro asociado'}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="outline">{item.risk_level || 'media'}</Badge>
                    <Badge variant="outline">{item.status || 'open'}</Badge>
                    {item.location ? <Badge variant="outline">{item.location}</Badge> : null}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {item.control_measure || 'Sin medida de control registrada'}
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