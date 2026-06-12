'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertCircle, CheckCircle, Clock, Download, Eye, Plus, Search, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ConfirmDeleteDialog } from '@/components/sostenibilidad/confirm-delete-dialog';
import { InspeccionExternaModal } from '@/components/sostenibilidad/inspeccion-externa-modal';

type InspeccionExterna = {
  id: string;
  numero_inspeccion: string;
  fecha_planificada: string;
  fecha_realizada?: string | null;
  faena: string;
  inspector: string;
  empresa_externa: string;
  contacto_externo: string;
  hallazgos_count: number;
  estado: 'planificada' | 'realizada' | 'cerrada';
  reporte_url?: string | null;
};

type ApiResponse = {
  data?: InspeccionExterna[];
  error?: string;
};

const fetcher = async (url: string): Promise<ApiResponse> => {
  const response = await fetch(url);
  const payload = (await response.json().catch(() => ({}))) as ApiResponse;
  if (!response.ok) {
    throw new Error(payload.error || 'No fue posible cargar las inspecciones externas');
  }
  return payload;
};

const estadoMeta: Record<InspeccionExterna['estado'], { label: string; color: string }> = {
  planificada: { label: 'Planificada', color: 'text-primary' },
  realizada: { label: 'Realizada', color: 'text-secondary' },
  cerrada: { label: 'Cerrada', color: 'text-muted-foreground' },
};

export default function InspeccionesExternasPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedInspeccion, setSelectedInspeccion] = useState<InspeccionExterna | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, error, isLoading, mutate } = useSWR(
    '/api/sostenibilidad/inspecciones?tipo=externas',
    fetcher,
    { revalidateOnFocus: false }
  );

  const inspecciones = data?.data || [];

  const filteredInspecciones = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return inspecciones.filter((insp) => {
      if (!term) return true;
      return (
        insp.numero_inspeccion.toLowerCase().includes(term) ||
        insp.faena.toLowerCase().includes(term) ||
        insp.empresa_externa.toLowerCase().includes(term) ||
        insp.contacto_externo.toLowerCase().includes(term)
      );
    });
  }, [inspecciones, searchTerm]);

  const summary = useMemo(
    () => ({
      total: filteredInspecciones.length,
      planificadas: filteredInspecciones.filter((item) => item.estado === 'planificada').length,
      realizadas: filteredInspecciones.filter((item) => item.estado === 'realizada').length,
      cerradas: filteredInspecciones.filter((item) => item.estado === 'cerrada').length,
      hallazgos: filteredInspecciones.reduce((sum, item) => sum + item.hallazgos_count, 0),
    }),
    [filteredInspecciones]
  );

  const handleDelete = async () => {
    if (!selectedInspeccion?.id) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/sostenibilidad/inspecciones?id=${selectedInspeccion.id}&tipo=externas`,
        { method: 'DELETE' }
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || 'No fue posible eliminar la inspección');
      }

      await mutate();
      setDeleteOpen(false);
      setSelectedInspeccion(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="mb-2 text-4xl font-bold text-foreground">Inspecciones externas</h1>
          <p className="max-w-2xl text-muted-foreground">
            Registro de auditorías y fiscalizaciones externas con trazabilidad de hallazgos.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline">Total {summary.total}</Badge>
            <Badge variant="outline">Planificadas {summary.planificadas}</Badge>
            <Badge variant="outline">Realizadas {summary.realizadas}</Badge>
            <Badge className="bg-secondary/10 text-secondary border-secondary/30">Cerradas {summary.cerradas}</Badge>
          </div>
        </div>
        <Button className="bg-primary hover:bg-primary/90" onClick={() => { setSelectedInspeccion(null); setModalOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva inspección
        </Button>
      </div>

      {error && (
        <Card className="mb-6 border-destructive/30">
          <CardContent className="flex items-center gap-3 pt-6 text-sm">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span>No fue posible cargar las inspecciones externas.</span>
          </CardContent>
        </Card>
      )}

      <InspeccionExternaModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        inspeccion={selectedInspeccion || undefined}
        onSuccess={() => {
          setSelectedInspeccion(null);
          mutate();
        }}
      />

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        titulo={`Inspección ${selectedInspeccion?.numero_inspeccion || ''}`}
        descripcion={`Se eliminará la inspección ${selectedInspeccion?.numero_inspeccion || ''} de ${selectedInspeccion?.empresa_externa || 'la empresa externa seleccionada'}. Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
      />

      <div className="mb-6 flex gap-2">
        <Input
          placeholder="Buscar por número, faena, empresa o contacto..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="flex-1"
        />
        <Button variant="outline" size="icon" aria-label="Buscar inspecciones externas">
          <Search className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Planificadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{summary.planificadas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Realizadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">{summary.realizadas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cerradas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{summary.cerradas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hallazgos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.hallazgos}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de inspecciones</CardTitle>
          <CardDescription>Total: {filteredInspecciones.length} registros visibles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Número</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Faena</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Empresa externa</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Contacto</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Fecha</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Hallazgos</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Estado</th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-muted-foreground" colSpan={8}>
                      Cargando inspecciones externas...
                    </td>
                  </tr>
                ) : filteredInspecciones.length > 0 ? (
                  filteredInspecciones.map((insp) => {
                    const meta = estadoMeta[insp.estado];

                    return (
                      <tr key={insp.id} className="border-b border-white/10 hover:bg-white/5">
                        <td className="px-4 py-3 font-medium">{insp.numero_inspeccion}</td>
                        <td className="px-4 py-3">{insp.faena}</td>
                        <td className="px-4 py-3">{insp.empresa_externa}</td>
                        <td className="px-4 py-3 text-muted-foreground">{insp.contacto_externo}</td>
                        <td className="px-4 py-3">
                          {new Date(insp.fecha_planificada).toLocaleDateString('es-CL')}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{insp.hallazgos_count}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {insp.estado === 'planificada' && (
                              <Clock className={`h-4 w-4 ${meta.color}`} />
                            )}
                            {insp.estado === 'realizada' && (
                              <CheckCircle className={`h-4 w-4 ${meta.color}`} />
                            )}
                            {insp.estado === 'cerrada' && (
                              <AlertCircle className={`h-4 w-4 ${meta.color}`} />
                            )}
                            <span className={`capitalize ${meta.color}`}>{meta.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedInspeccion(insp);
                                setModalOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" disabled>
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedInspeccion(insp);
                                setDeleteOpen(true);
                              }}
                              disabled={isDeleting}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="px-4 py-10 text-center text-muted-foreground" colSpan={8}>
                      No hay inspecciones externas con los filtros actuales.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
