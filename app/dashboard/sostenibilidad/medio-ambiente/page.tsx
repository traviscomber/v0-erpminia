'use client';

import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';
import { Eye, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDeleteDialog } from '@/components/sostenibilidad/confirm-delete-dialog';
import { FilterPanel } from '@/components/sostenibilidad/filter-panel';
import { ExportButtons } from '@/components/sostenibilidad/export-buttons';
import { CompromisosRcaTable } from '@/components/sostenibilidad/compromisos-rca-table';

interface MedioAmbienteRecord {
  id: string;
  numero_registro: string;
  fecha: string;
  tipo: 'emisiones' | 'residuos' | 'agua' | 'ruido';
  descripcion: string;
  valor: string;
  unidad: string;
  cumplimiento: 'conforme' | 'no_conforme' | 'en_revision';
}

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) return null;
  return payload;
};

function normalizeCumplimiento(value: string) {
  const text = value.trim().toLowerCase();
  if (['conforme', 'cumple', 'ok', 'approved'].includes(text)) return 'conforme';
  if (['no_conforme', 'no conforme', 'rejected', 'incumple'].includes(text)) return 'no_conforme';
  if (['en_revision', 'en revision', 'revision', 'pending'].includes(text)) return 'en_revision';
  return 'conforme';
}

export default function MedioAmbientePage() {
  const [activeTab, setActiveTab] = useState<'registros' | 'compromisos'>('registros');
  const [searchTerm, setSearchTerm] = useState('');
  const [tipo, setTipo] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<MedioAmbienteRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    tipo: 'emisiones' as MedioAmbienteRecord['tipo'],
    descripcion: '',
    valor: '',
    unidad: 'kg',
    cumplimiento: 'conforme' as MedioAmbienteRecord['cumplimiento'],
  });

  const { data: registros, mutate } = useSWR('/api/sostenibilidad/medio-ambiente', fetcher);
  const registrosList = (registros?.data || []) as MedioAmbienteRecord[];

  const filtered = registrosList.filter((record) => {
    const matchSearch =
      record.numero_registro.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch && (!tipo || record.tipo === tipo);
  });

  const statusSummary = {
    total: registrosList.length,
    conformes: registrosList.filter((record) => normalizeCumplimiento(record.cumplimiento) === 'conforme').length,
    noConformes: registrosList.filter((record) => normalizeCumplimiento(record.cumplimiento) === 'no_conforme').length,
    enRevision: registrosList.filter((record) => normalizeCumplimiento(record.cumplimiento) === 'en_revision').length,
  };

  const handleReload = () => {
    void mutate();
  };

  const handleDelete = async () => {
    if (!selected?.id) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/sostenibilidad/medio-ambiente?id=${selected.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Error');
      toast.success('Registro eliminado');
      handleReload();
      setDeleteOpen(false);
      setSelected(null);
    } catch {
      toast.error('Error al eliminar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const response = await fetch('/api/sostenibilidad/medio-ambiente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        toast.error('Error al crear registro');
        return;
      }

      toast.success('Registro creado correctamente');
      setModalOpen(false);
      setFormData({ tipo: 'emisiones', descripcion: '', valor: '', unidad: 'kg', cumplimiento: 'conforme' });
      handleReload();
    } catch (error) {
      console.error('[v0] Error creating registro:', error);
      toast.error('Error al crear registro');
    }
  };

  const tipoLabels = {
    emisiones: 'Emisiones',
    residuos: 'Residuos',
    agua: 'Agua',
    ruido: 'Ruido',
  };

  const cumplimientoColor = {
    conforme: 'bg-secondary/10 text-secondary',
    no_conforme: 'bg-destructive/10 text-destructive',
    en_revision: 'bg-primary/10 text-primary',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Sostenibilidad y HSE · Medio ambiente</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Control ambiental</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Monitorea emisiones, residuos, agua, ruido y compromisos RCA desde una sola vista operacional.
          </p>
        </div>

        {activeTab === 'registros' && (
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard/sostenibilidad/medio-ambiente/importar">Importar Excel</Link>
            </Button>
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo registro
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Nuevo registro ambiental</DialogTitle>
                  <DialogDescription>Registra datos de emisiones, residuos, agua o ruido.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="tipo">Tipo</Label>
                    <Select
                      value={formData.tipo}
                      onValueChange={(value) =>
                        setFormData((current) => ({ ...current, tipo: value as MedioAmbienteRecord['tipo'] }))
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="emisiones">Emisiones</SelectItem>
                        <SelectItem value="residuos">Residuos</SelectItem>
                        <SelectItem value="agua">Agua</SelectItem>
                        <SelectItem value="ruido">Ruido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="descripcion">Descripción</Label>
                    <textarea
                      id="descripcion"
                      name="descripcion"
                      value={formData.descripcion}
                      onChange={handleInputChange}
                      placeholder="Detalles del registro"
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      rows={2}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="valor">Valor</Label>
                      <Input id="valor" name="valor" value={formData.valor} onChange={handleInputChange} placeholder="Ej: 1.5" required />
                    </div>
                    <div>
                      <Label htmlFor="unidad">Unidad</Label>
                      <Input id="unidad" name="unidad" value={formData.unidad} onChange={handleInputChange} placeholder="kg, L, dB" required />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="cumplimiento">Cumplimiento</Label>
                    <Select
                      value={formData.cumplimiento}
                      onValueChange={(value) =>
                        setFormData((current) => ({ ...current, cumplimiento: value as MedioAmbienteRecord['cumplimiento'] }))
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conforme">Conforme</SelectItem>
                        <SelectItem value="no_conforme">No conforme</SelectItem>
                        <SelectItem value="en_revision">En revisión</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
                    <Button type="submit">Crear registro</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {activeTab === 'registros' && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Registros totales', value: statusSummary.total, helper: 'Monitoreos disponibles' },
            { label: 'Conformes', value: statusSummary.conformes, helper: 'Sin observaciones activas' },
            { label: 'No conformes', value: statusSummary.noConformes, helper: 'Requieren gestión' },
            { label: 'En revisión', value: statusSummary.enRevision, helper: 'Pendientes de resolución' },
          ].map((metric) => (
            <Card key={metric.label} className="shadow-none">
              <CardHeader className="pb-2"><CardDescription>{metric.label}</CardDescription></CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{metric.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{metric.helper}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setActiveTab('registros')}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'registros' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Registros ambientales
        </button>
        <button
          onClick={() => setActiveTab('compromisos')}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'compromisos' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Compromisos RCA
        </button>
      </div>

      {activeTab === 'compromisos' && <CompromisosRcaTable />}

      {activeTab === 'registros' && (
        <>
          <FilterPanel
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            estado={tipo}
            onEstadoChange={(value) => setTipo(value === 'todos' ? '' : value)}
            onReset={() => {
              setSearchTerm('');
              setTipo('');
            }}
          />

          <div className="flex justify-end">
            <ExportButtons
              data={filtered}
              fileName="Medio_Ambiente"
              columns={[
                { key: 'numero_registro', label: 'Número' },
                { key: 'fecha', label: 'Fecha' },
                { key: 'tipo', label: 'Tipo' },
                { key: 'descripcion', label: 'Descripción' },
                { key: 'valor', label: 'Valor' },
                { key: 'cumplimiento', label: 'Cumplimiento' },
              ]}
            />
          </div>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Registros ambientales</CardTitle>
              <CardDescription>{filtered.length} resultados visibles de {registrosList.length} registros.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Número</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Tipo</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Descripción</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Valor</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Cumplimiento</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Fecha</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((record) => {
                      const normalizedStatus = normalizeCumplimiento(record.cumplimiento) as keyof typeof cumplimientoColor;
                      return (
                        <tr key={record.id} className="border-b hover:bg-muted/50">
                          <td className="px-4 py-3 font-medium">{record.numero_registro}</td>
                          <td className="px-4 py-3"><Badge>{tipoLabels[record.tipo]}</Badge></td>
                          <td className="px-4 py-3">{record.descripcion}</td>
                          <td className="px-4 py-3 font-medium">{record.valor} {record.unidad}</td>
                          <td className="px-4 py-3">
                            <Badge className={cumplimientoColor[normalizedStatus]}>{normalizedStatus.replace(/_/g, ' ')}</Badge>
                          </td>
                          <td className="px-4 py-3">{new Date(record.fecha).toLocaleDateString('es-CL')}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => setSelected(record)} aria-label={`Ver ${record.numero_registro}`}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelected(record);
                                  setDeleteOpen(true);
                                }}
                                disabled={isLoading}
                                aria-label={`Eliminar ${record.numero_registro}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filtered.length === 0 && <div className="py-10 text-center text-sm text-muted-foreground">Sin registros para los filtros seleccionados.</div>}
              </div>
            </CardContent>
          </Card>

          <ConfirmDeleteDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            titulo={`Registro ${selected?.numero_registro || ''}`}
            descripcion="Se eliminará este registro permanentemente."
            onConfirm={handleDelete}
          />
        </>
      )}
    </div>
  );
}
