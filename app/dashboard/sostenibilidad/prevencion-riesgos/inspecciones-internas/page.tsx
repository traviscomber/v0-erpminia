'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, AlertCircle, CheckCircle, Clock, Eye, Download, Trash2 } from 'lucide-react';
import useSWR from 'swr';

interface InspeccionInterna {
  id: string;
  numero_inspeccion: string;
  fecha_planificada: string;
  fecha_realizada?: string;
  area_faena: string;
  inspector: string;
  hallazgos_count: number;
  estado: 'planificada' | 'realizada' | 'cerrada';
  reporte_url?: string;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function InspeccionesInternasPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: inspecciones = [] } = useSWR('/api/sostenibilidad/inspecciones/internas', fetcher);

  const inspeccionesList = (inspecciones.data || []) as InspeccionInterna[];
  const filteredInspecciones = inspeccionesList.filter((insp) =>
    insp.numero_inspeccion.toLowerCase().includes(searchTerm.toLowerCase()) ||
    insp.area_faena.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const estadoIcon = {
    planificada: <Clock className="w-4 h-4 text-yellow-500" />,
    realizada: <CheckCircle className="w-4 h-4 text-green-500" />,
    cerrada: <AlertCircle className="w-4 h-4 text-blue-500" />,
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Inspecciones Internas</h1>
          <p className="text-muted-foreground">Registro y seguimiento de inspecciones operacionales internas</p>
        </div>
        <Button className="bg-[var(--brand-naranja)] text-white hover:bg-[var(--brand-naranja)]/90">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Inspección
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6 flex gap-2">
        <Input
          placeholder="Buscar por número o área..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <Button variant="outline" size="icon">
          <Search className="w-4 h-4" />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Inspecciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredInspecciones.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Planificadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredInspecciones.filter((i) => i.estado === 'planificada').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Realizadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredInspecciones.filter((i) => i.estado === 'realizada').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hallazgos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredInspecciones.reduce((sum, i) => sum + i.hallazgos_count, 0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Inspections Table */}
      <Card>
        <CardHeader>
          <CardTitle>Registro de Inspecciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 font-medium">N° Inspección</th>
                  <th className="text-left py-3 px-4 font-medium">Área/Faena</th>
                  <th className="text-left py-3 px-4 font-medium">Inspector</th>
                  <th className="text-left py-3 px-4 font-medium">Fecha Planificada</th>
                  <th className="text-left py-3 px-4 font-medium">Hallazgos</th>
                  <th className="text-left py-3 px-4 font-medium">Estado</th>
                  <th className="text-right py-3 px-4 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredInspecciones.map((insp) => (
                  <tr key={insp.id} className="border-b border-white/10 hover:bg-white/5 transition">
                    <td className="py-3 px-4 font-medium">{insp.numero_inspeccion}</td>
                    <td className="py-3 px-4">{insp.area_faena}</td>
                    <td className="py-3 px-4">{insp.inspector}</td>
                    <td className="py-3 px-4">{new Date(insp.fecha_planificada).toLocaleDateString('es-CL')}</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline">{insp.hallazgos_count}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {estadoIcon[insp.estado]}
                        <span className="capitalize text-muted-foreground">{insp.estado}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
