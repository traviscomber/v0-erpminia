'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertCircle, CheckCircle, Clock, Eye, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDeleteDialog } from '@/components/sostenibilidad/confirm-delete-dialog';
import { ExportButtons } from '@/components/sostenibilidad/export-buttons';
import { FilterPanel } from '@/components/sostenibilidad/filter-panel';
import { InspeccionModal } from '@/components/sostenibilidad/inspeccion-modal';
import { StatePanel } from '@/components/ui/state-panel';
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderTitle,
} from '@/components/ui/page-header';

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

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar las inspecciones.');
  return payload;
};

const EMPTY_INSPECCIONES: InspeccionInterna[] = [];

export default function InspeccionesInternasPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [estado, setEstado] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedInspeccion, setSelectedInspeccion] = useState<InspeccionInterna | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: inspecciones, error, isLoading, mutate } = useSWR<InspeccionInterna[] | { data?: InspeccionInterna[] }>(
    '/api/sostenibilidad/inspecciones?tipo=internas',
    fetcher,
    { revalidateOnFocus: false },
  );

  const inspeccionesList = useMemo(() => {
    if (Array.isArray(inspecciones)) return inspecciones;
    if (Array.isArray(inspecciones?.data)) return inspecciones.data;
    return EMPTY_INSPECCIONES;
  }, [inspecciones]);

  const filteredInspecciones = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return inspeccionesList.filter((insp) => {
      const matchSearch = !query ||
        insp.numero_inspeccion.toLowerCase().includes(query) ||
        insp.faena.toLowerCase().includes(query) ||
        insp.inspector.toLowerCase().includes(query);
      return matchSearch && (!estado || insp.estado === estado);
    });
  }, [estado, inspeccionesList, searchTerm]);

  const handleDelete = async () => {
    if (!selectedInspeccion?.id) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const response = await fetch(`/api/sostenibilidad/inspecciones?id=${selectedInspeccion.id}&tipo=internas`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No fue posible eliminar la inspección.');
      await mutate();
      setDeleteOpen(false);
      setSelectedInspeccion(null);
    } catch (deleteFailure) {
      setDeleteError(deleteFailure instanceof Error ? deleteFailure.message : 'No fue posible eliminar la inspección.');
    } finally {
      setDeleting(false);
    }
  };

  const estadoIcon = {
    planificada: <Clock className="h-4 w-4 text-primary" />,
    realizada: <CheckCircle className="h-4 w-4 text-secondary" />,
    cerrada: <AlertCircle className="h-4 w-4 text-muted-foreground" />,
  };

  const totalHallazgos = filteredInspecciones.reduce((sum, insp) => sum + Number(insp.hallazgos_count || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Seguridad · Inspecciones</PageHeaderEyebrow>
          <PageHeaderTitle>Inspecciones</PageHeaderTitle>
          <PageHeaderDescription>Planificación, ejecución y seguimiento de inspecciones registradas.</PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button asChild variant="outline"><Link href="/dashboard/sostenibilidad/prevencion-riesgos/inspecciones/importar">Importar registros</Link></Button>
          <Button onClick={() => { setSelectedInspeccion(null); setModalOpen(true); }}><Plus className="h-4 w-4" />Nueva inspección</Button>
        </PageHeaderActions>
      </PageHeader>

      <InspeccionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        inspeccion={selectedInspeccion || undefined}
        onSuccess={() => { void mutate(); setSelectedInspeccion(null); }}
      />

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        titulo={`Inspección ${selectedInspeccion?.numero_inspeccion || ''}`}
        descripcion={`Se eliminará la inspección ${selectedInspeccion?.numero_inspeccion || ''} del lugar ${selectedInspeccion?.faena || ''}. Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
      />

      {error ? <StatePanel tone="error" title="No fue posible cargar las inspecciones" description={error.message} actions={<Button variant="outline" onClick={() => void mutate()}>Reintentar</Button>} className="min-h-0 py-5" /> : null}
      {deleteError ? <StatePanel tone="error" title="No se pudo eliminar la inspección" description={deleteError} className="min-h-0 py-5" /> : null}

      <FilterPanel
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        estado={estado}
        onEstadoChange={setEstado}
        onReset={() => { setSearchTerm(''); setEstado(''); }}
      />

      <ExportButtons
        data={filteredInspecciones}
        fileName="Inspecciones_Internas"
        columns={[
          { key: 'numero_inspeccion', label: 'Número' },
          { key: 'fecha_planificada', label: 'Fecha planificada' },
          { key: 'faena', label: 'Lugar o área' },
          { key: 'inspector', label: 'Inspector' },
          { key: 'hallazgos_count', label: 'Hallazgos' },
          { key: 'estado', label: 'Estado' },
        ]}
      />

      <section aria-label="Resumen de inspecciones" className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Inspecciones', filteredInspecciones.length],
          ['Planificadas', filteredInspecciones.filter((i) => i.estado === 'planificada').length],
          ['Realizadas', filteredInspecciones.filter((i) => i.estado === 'realizada').length],
          ['Hallazgos', totalHallazgos],
        ].map(([label, value]) => (
          <div key={String(label)} className="bg-card px-5 py-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{isLoading ? '—' : value}</p>
          </div>
        ))}
      </section>

      <Card>
        <CardHeader><CardTitle className="text-base">Registro de inspecciones</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <StatePanel tone="loading" title="Cargando inspecciones" className="border-0 bg-transparent" /> : null}
          {!isLoading && !error && filteredInspecciones.length === 0 ? <StatePanel tone="neutral" title="No hay inspecciones para mostrar" description="Crea una inspección o cambia los filtros aplicados." className="border-0 bg-transparent" /> : null}
          {!isLoading && filteredInspecciones.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b"><th className="px-4 py-3 text-left font-medium">Número</th><th className="px-4 py-3 text-left font-medium">Lugar o área</th><th className="px-4 py-3 text-left font-medium">Inspector</th><th className="px-4 py-3 text-left font-medium">Fecha</th><th className="px-4 py-3 text-left font-medium">Hallazgos</th><th className="px-4 py-3 text-left font-medium">Estado</th><th className="px-4 py-3 text-right font-medium">Acciones</th></tr></thead>
                <tbody>{filteredInspecciones.map((insp) => (
                  <tr key={insp.id} className="border-b transition-colors hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium">{insp.numero_inspeccion}</td>
                    <td className="px-4 py-3">{insp.faena}</td>
                    <td className="px-4 py-3">{insp.inspector}</td>
                    <td className="px-4 py-3">{new Date(insp.fecha_planificada).toLocaleDateString('es-CL')}</td>
                    <td className="px-4 py-3"><Badge variant="outline">{insp.hallazgos_count}</Badge></td>
                    <td className="px-4 py-3"><div className="flex items-center gap-2">{estadoIcon[insp.estado]}<span className="capitalize text-muted-foreground">{insp.estado}</span></div></td>
                    <td className="px-4 py-3 text-right"><div className="inline-flex items-center gap-1">
                      <Button variant="ghost" size="icon-sm" aria-label={`Abrir inspección ${insp.numero_inspeccion}`} onClick={() => { setSelectedInspeccion(insp); setModalOpen(true); }}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon-sm" aria-label={`Eliminar inspección ${insp.numero_inspeccion}`} onClick={() => { setSelectedInspeccion(insp); setDeleteError(null); setDeleteOpen(true); }} disabled={deleting}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
