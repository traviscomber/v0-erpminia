'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, Trash2 } from 'lucide-react';
import useSWR from 'swr';
import { ConfirmDeleteDialog } from '@/components/sostenibilidad/confirm-delete-dialog';
import { FilterPanel } from '@/components/sostenibilidad/filter-panel';
import { ExportButtons } from '@/components/sostenibilidad/export-buttons';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

type MedioAmbienteResponse = {
  data?: MedioAmbienteRecord[];
};

const fetcher = async (url: string): Promise<MedioAmbienteResponse> => {
  const response = await fetch(url);
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || 'No se pudo cargar el módulo ambiental');
  return data;
};

function normalizeCumplimiento(value?: string | null) {
  const status = String(value || '').toLowerCase();
  return status;
}

function getDefaultFormData() {
  return {
    tipo: 'emisiones' as const,
    descripcion: '',
    valor: '',
    unidad: 'kg',
    cumplimiento: 'conforme' as const,
  };
}

export default function MedioAmbientePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [tipo, setTipo] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<MedioAmbienteRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState(getDefaultFormData());

  const { data: registros, mutate } = useSWR<MedioAmbienteResponse>(
    '/api/sostenibilidad/medio-ambiente',
    fetcher
  );

  const registrosList = (registros?.data || []).map((record) => ({
    ...record,
    cumplimiento: normalizeCumplimiento(record.cumplimiento) as MedioAmbienteRecord['cumplimiento'],
  })) as MedioAmbienteRecord[];
  const displayData = registrosList;

  useEffect(() => {
    if (!modalOpen) return;

    if (selected) {
      setFormData({
        tipo: selected.tipo,
        descripcion: selected.descripcion,
        valor: selected.valor,
        unidad: selected.unidad,
        cumplimiento: normalizeCumplimiento(selected.cumplimiento) as typeof formData.cumplimiento,
      });
    } else {
      setFormData(getDefaultFormData());
    }
  }, [modalOpen, selected]);

  const filtered = displayData.filter((r) => {
    const matchSearch = r.numero_registro.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTipo = !tipo || r.tipo === tipo;
    return matchSearch && matchTipo;
  });

  const handleDelete = async () => {
    if (!selected?.id) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/sostenibilidad/medio-ambiente?id=${selected.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error');
      toast.success('Registro eliminado');
      await mutate();
      setDeleteOpen(false);
      setSelected(null);
    } catch {
      toast.error('Error al eliminar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/sostenibilidad/medio-ambiente', {
        method: selected ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selected ? { ...formData, id: selected.id } : formData),
      });

      if (response.ok) {
        toast.success(selected ? 'Registro actualizado correctamente' : 'Registro creado correctamente');
        setModalOpen(false);
        setSelected(null);
        setFormData(getDefaultFormData());
        mutate();
      } else {
        toast.error(selected ? 'Error al actualizar registro' : 'Error al crear registro');
      }
    } catch (error) {
      console.error('[v0] Error creating registro:', error);
      toast.error(selected ? 'Error al actualizar registro' : 'Error al crear registro');
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
    <div className="min-h-screen bg-background p-6">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="mb-2 text-4xl font-bold text-foreground">Medio Ambiente</h1>
          <p className="max-w-2xl text-muted-foreground">
            Monitoreo de emisiones, residuos, agua y ruido.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline">Registros {stats.total}</Badge>
            <Badge variant="outline">Conformes {stats.conforme}</Badge>
            <Badge variant="outline">En revisión {stats.review}</Badge>
          </div>
        </div>
        <Dialog open={modalOpen} onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) {
            setSelected(null);
            setFormData(getDefaultFormData());
          }
        }}>
          <Button
            onClick={() => {
              setSelected(null);
              setFormData(getDefaultFormData());
              setModalOpen(true);
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Registro
          </Button>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{selected ? 'Editar Registro Ambiental' : 'Nuevo Registro Ambiental'}</DialogTitle>
              <DialogDescription>
                Registra datos de emisiones, residuos, agua o ruido
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="tipo">Tipo</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, tipo: value as MedioAmbienteRecord['tipo'] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                  rows={2}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="valor">Valor</Label>
                  <Input
                    id="valor"
                    name="valor"
                    value={formData.valor}
                    onChange={handleInputChange}
                    placeholder="Ej: 1.5"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="unidad">Unidad</Label>
                  <Input
                    id="unidad"
                    name="unidad"
                    value={formData.unidad}
                    onChange={handleInputChange}
                    placeholder="kg, L, dB"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="cumplimiento">Cumplimiento</Label>
                <Select
                  value={formData.cumplimiento}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      cumplimiento: normalizeCumplimiento(value) as typeof formData.cumplimiento,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conforme">Conforme</SelectItem>
                    <SelectItem value="no_conforme">No Conforme</SelectItem>
                    <SelectItem value="en_revision">En Revisión</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {selected ? 'Actualizar Registro' : 'Crear Registro'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

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

      {/* Export Buttons */}
      <div className="mb-6 mt-6">
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 my-8">
        {Object.entries(tipoLabels).map(([key, label]) => (
          <Card key={key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {registrosList.filter(r => r.tipo === key).length}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registros</CardTitle>
          <CardDescription>Total: {filtered.length}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Número</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Tipo</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Descripción</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Valor</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Cumplimiento</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Fecha</th>
                  <th className="text-right py-3 px-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4 font-medium">{r.numero_registro}</td>
                    <td className="py-3 px-4"><Badge>{tipoLabels[r.tipo as keyof typeof tipoLabels]}</Badge></td>
                    <td className="py-3 px-4 text-sm">{r.descripcion}</td>
                    <td className="py-3 px-4 text-sm font-medium">{r.valor} {r.unidad}</td>
                    <td className="py-3 px-4">
                      <Badge className={cumplimientoColor[normalizeCumplimiento(r.cumplimiento) as keyof typeof cumplimientoColor]}>
                        {r.cumplimiento}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm">{new Date(r.fecha).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => { setSelected(r); setModalOpen(true); }}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setSelected(r); setDeleteOpen(true); }} disabled={isLoading}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">Sin registros</div>
            )}
          </div>
        </CardContent>
      </Card>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        titulo={`Registro ${selected?.numero_registro}`}
        descripcion="Se eliminará este registro permanentemente."
        onConfirm={handleDelete}
      />
    </div>
  );
}
