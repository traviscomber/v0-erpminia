'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, AlertCircle, CheckCircle, Clock, Eye, Download, Trash2, Loader2 } from 'lucide-react';
import useSWR from 'swr';
import { InspeccionModal } from '@/components/sostenibilidad/inspeccion-modal';
import { ConfirmDeleteDialog } from '@/components/sostenibilidad/confirm-delete-dialog';
import { FilterPanel } from '@/components/sostenibilidad/filter-panel';
import { ExportButtons } from '@/components/sostenibilidad/export-buttons';
import { DemoDataBadge } from '@/components/sostenibilidad/demo-data-badge';
import { mockInspeccionesData } from '@/lib/mock-data-sostenibilidad';

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
  const [estado, setEstado] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedInspeccion, setSelectedInspeccion] = useState<InspeccionInterna | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { data: inspecciones = [], mutate } = useSWR(
    '/api/sostenibilidad/inspecciones?tipo=internas',
    fetcher
  );

  // Convertir mock data a formato InspeccionInterna
  const mockDataFormatted: InspeccionInterna[] = (mockInspeccionesData || [])
    .filter((m: any) => m.tipo === 'interna')
    .map((m: any, idx: number) => ({
      id: m.id,
      numero_inspeccion: `INP-${new Date(m.fecha).getFullYear()}-${String(idx + 1).padStart(3, '0')}`,
      fecha_planificada: m.fecha,
      fecha_realizada: m.estado === 'completada' ? m.fecha : undefined,
      area_faena: ['Sector operaciones', 'Planta principal', 'Almacén', 'Sector procesamiento', 'Área administrativa', 'Sector mantenimiento', 'Higiene Industrial'][idx % 7],
      inspector: m.inspector,
      hallazgos_count: m.hallazgos || 0,
      estado: m.estado === 'completada' ? 'realizada' : 'planificada',
      reporte_url: m.estado === 'completada' ? `/reportes/inspeccion-${m.id}.pdf` : undefined,
    }));

  const inspeccionesList = (inspecciones.data || inspecciones || []) as InspeccionInterna[];
  const displayData = inspeccionesList.length > 0 ? inspeccionesList : mockDataFormatted;
  const useMockData = inspeccionesList.length === 0;

  const filteredInspecciones = displayData.filter((insp: any) => {
    const matchSearch = insp.numero_inspeccion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      insp.area_faena.toLowerCase().includes(searchTerm.toLowerCase());
    const matchEstado = !estado || insp.estado === estado;
    return matchSearch && matchEstado;
  });

  const handleDelete = async () => {
    if (!selectedInspeccion?.id) return;
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/sostenibilidad/inspecciones?id=${selectedInspeccion.id}&tipo=internas`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Error al eliminar');

      await mutate();
      setDeleteOpen(false);
      setSelectedInspeccion(null);
    } catch (error) {
      console.error('[v0] Delete error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (insp: InspeccionInterna) => {
    setSelectedInspeccion(insp);
    setModalOpen(true);
  };

  const handleDeleteClick = (insp: InspeccionInterna) => {
    setSelectedInspeccion(insp);
    setDeleteOpen(true);
  };

  const handleModalSuccess = () => {
    mutate();
    setSelectedInspeccion(null);
  };

  // Brandbook: primary (naranja), secondary (verde), muted (gris)
  const estadoIcon = {
    planificada: <Clock className="w-4 h-4 text-primary" />,
    realizada: <CheckCircle className="w-4 h-4 text-secondary" />,
    cerrada: <AlertCircle className="w-4 h-4 text-muted-foreground" />,
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Inspecciones Internas</h1>
          <p className="text-muted-foreground">Registro y seguimiento de inspecciones operacionales internas</p>
          {useMockData && <DemoDataBadge />}
        </div>
        <Button 
          className="bg-primary hover:bg-primary/90"
          onClick={() => {
            setSelectedInspeccion(null);
            setModalOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Inspección
        </Button>
      </div>

      {/* Modales */}
      <InspeccionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        inspeccion={selectedInspeccion || undefined}
        onSuccess={handleModalSuccess}
      />

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        titulo={`Inspección ${selectedInspeccion?.numero_inspeccion}`}
        descripcion={`Se eliminará la inspección "${selectedInspeccion?.numero_inspeccion}" del área ${selectedInspeccion?.area_faena}. Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
      />

      {/* Search & Filters */}
      <FilterPanel
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        estado={estado}
        onEstadoChange={setEstado}
        onReset={() => {
          setSearchTerm('');
          setEstado('');
        }}
      />

      {/* Export Buttons */}
      <div className="mb-6 mt-6">
        <ExportButtons
          data={filteredInspecciones}
          fileName="Inspecciones_Internas"
          columns={[
            { key: 'numero_inspeccion', label: 'Número' },
            { key: 'fecha_planificada', label: 'Fecha Planificada' },
            { key: 'area_faena', label: 'Área' },
            { key: 'inspector', label: 'Inspector' },
            { key: 'hallazgos_count', label: 'Hallazgos' },
            { key: 'estado', label: 'Estado' },
          ]}
        />
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
            <div className="text-2xl font-bold">{filteredInspecciones.filter((i: any) => i.estado === 'planificada').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Realizadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredInspecciones.filter((i: any) => i.estado === 'realizada').length}</div>
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
                {filteredInspecciones.map((insp: any) => (
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
                        {estadoIcon[insp.estado as keyof typeof estadoIcon]}
                        <span className="capitalize text-muted-foreground">{insp.estado}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditClick(insp)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        disabled={isLoading}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteClick(insp)}
                        disabled={isLoading}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
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
