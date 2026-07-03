'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertCircle, CheckCircle, Clock, Download, Eye, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDeleteDialog } from '@/components/sostenibilidad/confirm-delete-dialog';
import { ExportButtons } from '@/components/sostenibilidad/export-buttons';
import { FilterPanel } from '@/components/sostenibilidad/filter-panel';
import { InspeccionModal } from '@/components/sostenibilidad/inspeccion-modal';

interface InspeccionInterna {
  id: string;
  tipo: 'internas' | 'externas';
  numero_inspeccion: string;
  fecha_planificada: string;
  fecha_realizada?: string;
  faena: string;
  inspector: string;
  hallazgos_count: number;
  estado: 'planificada' | 'realizada' | 'cerrada';
  reporte_url?: string;
}

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());

const EMPTY_INSPECCIONES: InspeccionInterna[] = [];

export default function InspeccionesInternasPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [estado, setEstado] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedInspeccion, setSelectedInspeccion] = useState<InspeccionInterna | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { data: inspecciones, mutate } = useSWR<InspeccionInterna[] | { data?: InspeccionInterna[] }>(
    '/api/sostenibilidad/inspecciones?tipo=internas',
    fetcher
  );

  const inspeccionesList = useMemo(() => {
    if (Array.isArray(inspecciones)) return inspecciones;
    if (Array.isArray(inspecciones?.data)) return inspecciones.data;
    return EMPTY_INSPECCIONES;
  }, [inspecciones]);

  const filteredInspecciones = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return inspeccionesList.filter((insp) => {
      const matchSearch =
        !query ||
        insp.numero_inspeccion.toLowerCase().includes(query) ||
        insp.faena.toLowerCase().includes(query) ||
        insp.inspector.toLowerCase().includes(query);
      const matchEstado = !estado || insp.estado === estado;
      return matchSearch && matchEstado;
    });
  }, [estado, inspeccionesList, searchTerm]);

  const handleDelete = async () => {
    if (!selectedInspeccion?.id) return;
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/sostenibilidad/inspecciones?id=${selectedInspeccion.id}&tipo=internas`,
        { method: 'DELETE', credentials: 'include' }
      );

      if (!response.ok) throw new Error('Error al eliminar');

      await mutate();
      setDeleteOpen(false);
      setSelectedInspeccion(null);
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
    void mutate();
    setSelectedInspeccion(null);
  };

  const estadoIcon = {
    planificada: <Clock className="h-4 w-4 text-primary" />,
    realizada: <CheckCircle className="h-4 w-4 text-secondary" />,
    cerrada: <AlertCircle className="h-4 w-4 text-muted-foreground" />,
  };

  const totalHallazgos = filteredInspecciones.reduce((sum, insp) => sum + insp.hallazgos_count, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Inspecciones</h1>
          <p className="text-muted-foreground">Registro y seguimiento de inspecciones operacionales.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/sostenibilidad/prevencion-riesgos/inspecciones/importar">Plantilla</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/sostenibilidad/prevencion-riesgos/inspecciones/importar">Importar Excel</Link>
          </Button>
          <Button
            className="bg-primary hover:bg-primary/90"
            onClick={() => {
              setSelectedInspeccion(null);
              setModalOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva inspección
          </Button>
        </div>
      </div>

      <InspeccionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        inspeccion={selectedInspeccion || undefined}
        onSuccess={handleModalSuccess}
      />

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        titulo={`Inspección ${selectedInspeccion?.numero_inspeccion || ''}`}
        descripcion={`Se eliminará la inspección "${selectedInspeccion?.numero_inspeccion || ''}" de la faena ${selectedInspeccion?.faena || ''}. Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
      />

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

      <div className="mt-6">
        <ExportButtons
          data={filteredInspecciones}
          fileName="Inspecciones_Internas"
          columns={[
            { key: 'numero_inspeccion', label: 'Número' },
            { key: 'fecha_planificada', label: 'Fecha planificada' },
            { key: 'faena', label: 'Faena' },
            { key: 'inspector', label: 'Inspector' },
            { key: 'hallazgos_count', label: 'Hallazgos' },
            { key: 'estado', label: 'Estado' },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de inspecciones</CardTitle>
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
            <div className="text-2xl font-bold">
              {filteredInspecciones.filter((i) => i.estado === 'planificada').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Realizadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredInspecciones.filter((i) => i.estado === 'realizada').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hallazgos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHallazgos}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registro de inspecciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left font-medium">N° inspección</th>
                  <th className="px-4 py-3 text-left font-medium">Faena</th>
                  <th className="px-4 py-3 text-left font-medium">Inspector</th>
                  <th className="px-4 py-3 text-left font-medium">Fecha planificada</th>
                  <th className="px-4 py-3 text-left font-medium">Hallazgos</th>
                  <th className="px-4 py-3 text-left font-medium">Estado</th>
                  <th className="px-4 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredInspecciones.map((insp) => (
                  <tr key={insp.id} className="border-b border-white/10 transition hover:bg-white/5">
                    <td className="px-4 py-3 font-medium">{insp.numero_inspeccion}</td>
                    <td className="px-4 py-3">{insp.faena}</td>
                    <td className="px-4 py-3">{insp.inspector}</td>
                    <td className="px-4 py-3">{new Date(insp.fecha_planificada).toLocaleDateString('es-CL')}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{insp.hallazgos_count}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {estadoIcon[insp.estado]}
                        <span className="capitalize text-muted-foreground">{insp.estado}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEditClick(insp)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" disabled={isLoading}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(insp)}
                          disabled={isLoading}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredInspecciones.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                No hay inspecciones registradas.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
