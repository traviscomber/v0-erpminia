'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Shield, Plus, Search, AlertTriangle, Check } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function HSEEPPPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [cargo, setCargo] = useState('');

  const { data: eppData } = useSWR(
    `/api/hse/epp?cargo=${cargo}`,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 300000 }
  );

  const entregas = eppData?.entregas || [];
  const filtradas = entregas.filter((e: any) =>
    e.personal_nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingDevoluciones = filtradas.filter((e: any) => e.devolucion_requerida && !e.fecha_devolucion);
  const entregasNuevas = filtradas.filter((e: any) => e.estado_anterior === 'nuevo');
  const entregasUsadas = filtradas.filter((e: any) => e.estado_anterior === 'usado');

  // Resumen por elemento
  const resumenPorElemento = entregas.reduce((acc: any, e: any) => {
    if (!acc[e.epp_elemento]) acc[e.epp_elemento] = { cantidad: 0, nuevo: 0, usado: 0 };
    acc[e.epp_elemento].cantidad += e.cantidad;
    if (e.estado_anterior === 'nuevo') acc[e.epp_elemento].nuevo += e.cantidad;
    if (e.estado_anterior === 'usado') acc[e.epp_elemento].usado += e.cantidad;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión EPP - Equipos de Protección</h1>
          <p className="text-muted-foreground">Control de entregas y reposición integrado con bodega</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-1" />
          Nueva Entrega EPP
        </Button>
      </div>

      {/* Alerts */}
      {pendingDevoluciones.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-yellow-900">{pendingDevoluciones.length} devolución(es) pendiente(s)</p>
            <p className="text-sm text-yellow-700">Personal debe devolver equipo antiguo para recibir reemplazo</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Entregas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{entregas.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Equipos Nuevos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{entregasNuevas.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Equipos Usados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{entregasUsadas.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Devoluciones Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{pendingDevoluciones.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Resumen por Elemento */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen por Elemento EPP</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(resumenPorElemento).map(([elemento, datos]: [string, any]) => (
              <div key={elemento} className="flex items-center justify-between p-3 bg-muted rounded">
                <div>
                  <p className="font-semibold">{elemento}</p>
                  <p className="text-sm text-muted-foreground">Nuevo: {datos.nuevo} | Usado: {datos.usado}</p>
                </div>
                <Badge>{datos.cantidad} total</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search y Filtros */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar personal..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardContent>
      </Card>

      {/* Entregas List */}
      <div className="space-y-2">
        {filtradas.map((entrega: any) => (
          <Card key={entrega.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold">{entrega.personal_nombre}</h3>
                  <p className="text-sm text-muted-foreground">{entrega.cargo}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge>{entrega.epp_elemento}</Badge>
                    <Badge variant="outline">{entrega.cantidad}x {entrega.estado_anterior}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Entregado: {new Date(entrega.fecha_entrega).toLocaleDateString('es-CL')}
                  </p>
                  {entrega.devolucion_requerida && !entrega.fecha_devolucion && (
                    <Badge className="mt-2 bg-red-100 text-red-800">Devolución pendiente</Badge>
                  )}
                  {entrega.fecha_devolucion && (
                    <Badge className="mt-2 bg-green-100 text-green-800" >
                      <Check className="h-3 w-3 mr-1" />
                      Devuelto
                    </Badge>
                  )}
                </div>
                <Button variant="outline" size="sm">Editar</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
