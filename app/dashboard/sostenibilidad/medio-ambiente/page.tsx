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

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());

function normalizeCumplimiento(value: string) {
  const text = value.trim().toLowerCase();
  if (['conforme', 'cumple', 'ok', 'approved'].includes(text)) return 'conforme';
  if (['no_conforme', 'no conforme', 'rejected', 'incumple'].includes(text)) return 'no_conforme';
  if (['en_revision', 'en revision', 'revision', 'pending'].includes(text)) return 'en_revision';
  return 'conforme';
}

export default function MedioAmbientePage() {
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

  const filtered = registrosList.filter((r) => {
    const matchSearch =
      r.numero_registro.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTipo = !tipo || r.tipo === tipo;
    return matchSearch && matchTipo;
  });

  const handleDelete = async () => {
    if (!selected?.id) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/sostenibilidad/medio-ambiente?id=${selected.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
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
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/sostenibilidad/medio-ambiente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('Registro creado correctamente');
        setModalOpen(false);
        setFormData({
          tipo: 'emisiones',
          descripcion: '',
          valor: '',
          unidad: 'kg',
          cumplimiento: 'conforme',
        });
        mutate();
      } else {
        toast.error('Error al crear registro');
      }
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
    <div className="min-h-screen bg-background p-6">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-foreground">Medio ambiente</h1>
          <p className="text-muted-foreground">Monitoreo de emisiones, residuos, agua y ruido</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/sostenibilidad/medio-ambiente/importar">Plantilla</Link>
          </Button>
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
              <DialogDescription>Registra datos de emisiones, residuos, agua o ruido</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="tipo">Tipo</Label>
                <Select value={formData.tipo} onValueChange={(value) => setFormData((prev) => ({ ...prev, tipo: value as MedioAmbienteRecord['tipo'] }))}>
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
                <Select value={formData.cumplimiento} onValueChange={(value) => setFormData((prev) => ({ ...prev, cumplimiento: value as MedioAmbienteRecord['cumplimiento'] }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conforme">Conforme</SelectItem>
                    <SelectItem value="no_conforme">No conforme</SelectItem>
                    <SelectItem value="en_revision">En revisión</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Crear registro</Button>
              </div>
            </form>
          </DialogContent>
          </Dialog>
        </div>
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

      <div className="grid grid-cols-1 gap-4 my-8 md:grid-cols-4">
        {Object.entries(tipoLabels).map(([key, label]) => (
          <Card key={key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{registrosList.filter((r) => r.tipo === key).length}</div>
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
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">{r.numero_registro}</td>
                    <td className="px-4 py-3">
                      <Badge>{tipoLabels[r.tipo as keyof typeof tipoLabels]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">{r.descripcion}</td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {r.valor} {r.unidad}
                    </td>
                    <td className="px-4 py-3">
                        <Badge className={cumplimientoColor[normalizeCumplimiento(r.cumplimiento) as keyof typeof cumplimientoColor]}>
                        {normalizeCumplimiento(r.cumplimiento).replace(/_/g, ' ')}
                        </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">{new Date(r.fecha).toLocaleDateString('es-CL')}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setSelected(r)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setSelected(r); setDeleteOpen(true); }} disabled={isLoading}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="py-8 text-center text-muted-foreground">Sin registros</div>}
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
    </div>
  );
}
