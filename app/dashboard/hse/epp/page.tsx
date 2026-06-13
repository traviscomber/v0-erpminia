'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Shield, Plus, Search, Check } from 'lucide-react';

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('No se pudo cargar EPP');
  }
  return response.json();
};

export default function HSEEPPPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [cargo, setCargo] = useState('');

  const { data, error, isLoading } = useSWR(
    `/api/hse/epp${cargo ? `cargo=${encodeURIComponent(cargo)}` : ''}`,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 300000 }
  );

  const entregas = data.entregas || [];

  const filtradas = useMemo(
    () =>
      entregas.filter((e: any) =>
        `${e.cargo} ${e.epp_elemento}`.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [entregas, searchTerm]
  );

  const activas = filtradas.filter((e: any) => e.activo !== false);
  const resumenPorElemento = filtradas.reduce((acc: any, e: any) => {
    if (!acc[e.epp_elemento]) acc[e.epp_elemento] = { cantidad: 0, cargos: 0 };
    acc[e.epp_elemento].cantidad += e.cantidad;
    acc[e.epp_elemento].cargos += 1;
    return acc;
  }, {});

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
        <Button>
          <Plus className="mr-1 h-4 w-4" />
          Nuevo requerimiento EPP
        </Button>
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
            <div className="text-2xl font-bold text-[var(--secondary)]">{new Set(entregas.map((e: any) => e.cargo)).size}</div>
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
            {Object.entries(resumenPorElemento).map(([elemento, datos]: [string, any]) => (
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
        {filtradas.map((entrega: any) => (
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
