'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Download, Shield, Plus, Search, Check } from 'lucide-react';
import { EppImport } from '@/components/hse/epp-import';

type HseEppEntry = {
  id?: string | number | null;
  cargo?: string | null;
  tarea?: string | null;
  faena?: string | null;
  epp_elemento?: string | null;
  cantidad?: number | string | null;
  activo?: boolean | null;
};

type HseEppApiResponse = {
  entregas: HseEppEntry[];
  total: number;
  warning?: string;
};

type GroupSummary = {
  total: number;
  activos: number;
  items: HseEppEntry[];
};

const miningEppCatalog = [
  {
    title: 'Proteccion base',
    items: ['Casco con barbiquejo', 'Lentes de seguridad', 'Guantes de trabajo', 'Botas de seguridad', 'Chaleco alta visibilidad'],
  },
  {
    title: 'Exposicion ambiental',
    items: ['Proteccion auditiva', 'Respirador segun polvo/fibra', 'Antiparras cerradas', 'Proteccion solar'],
  },
  {
    title: 'Tareas criticas',
    items: ['Arnes y linea de vida', 'Ropa FR/ignifuga cuando aplique', 'Guantes dieléctricos en labores electricas', 'Proteccion facial para esmerilado o proyeccion'],
  },
  {
    title: 'Mineria de superficie',
    items: ['Ropa de alta visibilidad', 'Proteccion contra polvo y viento', 'Proteccion climatica segun turno y altura'],
  },
];

const templateHeaders = [
  'CARGO',
  'TAREA',
  'FAENA',
  'EPP_ELEMENTO',
  'CANTIDAD',
  'FRECUENCIA_REEMPLAZO',
  'MARCA_MODELO',
  'FECHA_ENTREGA',
  'ACTIVO',
];

const templateRows = [
  ['Operador mina', 'Perforacion', 'Mina central', 'Casco con barbiquejo', '1', '12 meses', 'Norma minera', '2026-06-27', 'si'],
  ['Operador mina', 'Perforacion', 'Mina central', 'Lentes de seguridad', '1', '6 meses', 'Antifog', '2026-06-27', 'si'],
  ['Mecanico mantenimiento', 'Intervencion equipos', 'Planta', 'Guantes de trabajo', '2', '3 meses', 'Refuerzo cuero', '2026-06-27', 'si'],
  ['Electricista', 'Trabajo electrico', 'Faena subteranea', 'Guantes dieléctricos', '1', '12 meses', 'Clase 0 o superior', '2026-06-27', 'si'],
];

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as HseEppApiResponse;
};

export default function HSEEPPPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [cargo, setCargo] = useState('');

  const { data, error, isLoading } = useSWR(
    `/api/hse/epp${cargo ? `?cargo=${encodeURIComponent(cargo)}` : ''}`,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 300000 }
  );

  const entregas = data?.entregas || [];

  const filtradas = useMemo(
    () =>
      entregas.filter((e) =>
        `${e.cargo || ''} ${e.epp_elemento || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [entregas, searchTerm]
  );

  const activas = filtradas.filter((e) => e.activo !== false);
  const resumenPorElemento = filtradas.reduce<Record<string, { cantidad: number; cargos: number }>>((acc, e) => {
    const key = String(e.epp_elemento || 'Sin dato').trim() || 'Sin dato';
    if (!acc[key]) acc[key] = { cantidad: 0, cargos: 0 };
    acc[key].cantidad += Number(e.cantidad || 0);
    acc[key].cargos += 1;
    return acc;
  }, {});

  const groupRecords = (field: 'cargo' | 'tarea' | 'faena') =>
    filtradas.reduce<Record<string, GroupSummary>>((acc, item) => {
      const key = String(item[field] || 'Sin dato').trim() || 'Sin dato';
      if (!acc[key]) {
        acc[key] = { total: 0, activos: 0, items: [] };
      }
      acc[key].total += 1;
      if (item.activo !== false) acc[key].activos += 1;
      acc[key].items.push(item);
      return acc;
    }, {});

  const cargosGroup = groupRecords('cargo');
  const tareasGroup = groupRecords('tarea');
  const faenasGroup = groupRecords('faena');

  const downloadTemplate = () => {
    const csv = [templateHeaders, ...templateRows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plantilla-epp-mineria.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (error) {
    return <div className="text-red-500">Error al cargar la matriz EPP.</div>;
  }

  if (isLoading) {
    return <div className="text-gray-500">Cargando matriz EPP...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Matriz EPP</h1>
          <p className="text-muted-foreground">Requerimientos de EPP por cargo, elemento y frecuencia de recambio.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="mr-1 h-4 w-4" />
            Plantilla Excel
          </Button>
          <Button>
            <Plus className="mr-1 h-4 w-4" />
            Nuevo requerimiento EPP
          </Button>
        </div>
      </div>

      <EppImport onSuccess={() => window.location.reload()} />

      <Card className="border-[var(--secondary)]/25 bg-[var(--secondary)]/5">
        <CardHeader>
          <CardTitle className="text-base">EPP base recomendado para mineria</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Este catalogo es una base operativa para la matriz EPP. Debe ajustarse por cargo, tarea, ubicacion y matriz de riesgo.
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {miningEppCatalog.map((group) => (
              <div key={group.title} className="rounded-lg border border-border bg-background p-4">
                <h3 className="font-semibold">{group.title}</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <Badge key={item} variant="outline" className="whitespace-normal text-left">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Por cargo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(cargosGroup).slice(0, 6).map(([cargoName, stats]) => (
              <div key={cargoName} className="rounded border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{cargoName}</p>
                  <Badge variant="outline">{stats.total}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{stats.activos} activos</p>
              </div>
            ))}
            {Object.keys(cargosGroup).length === 0 ? <p className="text-sm text-muted-foreground">Sin registros por cargo.</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Por tarea</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(tareasGroup).slice(0, 6).map(([taskName, stats]) => (
              <div key={taskName} className="rounded border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{taskName}</p>
                  <Badge variant="outline">{stats.total}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{stats.activos} activos</p>
              </div>
            ))}
            {Object.keys(tareasGroup).length === 0 ? <p className="text-sm text-muted-foreground">Sin registros por tarea.</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Por faena</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(faenasGroup).slice(0, 6).map(([siteName, stats]) => (
              <div key={siteName} className="rounded border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{siteName}</p>
                  <Badge variant="outline">{stats.total}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{stats.activos} activos</p>
              </div>
            ))}
            {Object.keys(faenasGroup).length === 0 ? <p className="text-sm text-muted-foreground">Sin registros por faena.</p> : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total registros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{entregas.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Registros activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-verde)]">{activas.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Cargos cubiertos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--secondary)]">{new Set(entregas.map((e) => e.cargo)).size}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Elementos distintos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-naranja)]">{Object.keys(resumenPorElemento).length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumen por elemento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(resumenPorElemento).map(([elemento, datos]) => (
              <div key={elemento} className="flex items-center justify-between rounded bg-muted p-3">
                <div>
                  <p className="font-semibold">{elemento}</p>
                  <p className="text-sm text-muted-foreground">{datos.cargos} cargo(s) cubiertos</p>
                </div>
                <Badge>{datos.cantidad} unidad(es)</Badge>
              </div>
            ))}
            {Object.keys(resumenPorElemento).length === 0 && (
              <div className="text-sm text-muted-foreground">No hay elementos EPP registrados.</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cargo o elemento EPP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Input
            placeholder="Filtrar por cargo..."
            value={cargo}
            onChange={(e) => setCargo(e.target.value)}
          />
        </CardContent>
      </Card>

      <div className="space-y-2">
        {filtradas.map((entrega) => (
          <Card key={entrega.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-[var(--brand-naranja)]" />
                    <h3 className="font-semibold">{entrega.cargo}</h3>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{entrega.epp_elemento}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge>{entrega.cantidad} unidad(es)</Badge>
                    <Badge variant="outline">{entrega.frecuencia_reemplazo || 'Sin frecuencia'}</Badge>
                    {entrega.marca_modelo ? <Badge variant="outline">{entrega.marca_modelo}</Badge> : null}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Actualizado: {new Date(entrega.fecha_entrega).toLocaleDateString('es-CL')}
                  </p>
                </div>
                <Badge className={entrega.activo !== false ? 'bg-[var(--brand-verde)]/10 text-[var(--brand-verde)]' : 'bg-[var(--brand-rojo)]/10 text-[var(--brand-rojo)]'}>
                  {entrega.activo !== false ? (
                    <span className="inline-flex items-center gap-1"><Check className="h-3 w-3" />Activo</span>
                  ) : (
                    'Inactivo'
                  )}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtradas.length === 0 && (
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground">No hay coincidencias para el filtro actual.</CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
