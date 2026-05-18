'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, Trash2 } from 'lucide-react';
import useSWR from 'swr';
import { DemoDataBadge } from '@/components/sostenibilidad/demo-data-badge';
import { mockMedioAmbienteData, addMockDataIfEmpty } from '@/lib/mock-data-sostenibilidad';
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
  DialogTrigger,
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
  cumplimiento: 'conforme' | 'no_conforme' | 'en_revisin';
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function MedioAmbientePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [tipo, setTipo] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<MedioAmbienteRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    tipo: 'emisiones' as const,
    descripcion: '',
    valor: '',
    unidad: 'kg',
    cumplimiento: 'conforme' as const,
  });

  const { data: registros = [], mutate } = useSWR(
    '/api/sostenibilidad/medio-ambiente',
    fetcher
  );

  const filteredRegistros = addMockDataIfEmpty(registros.data || registros, mockMedioAmbienteData);

  const registrosList = (registros.data || []) as MedioAmbienteRecord[];
  const filtered = registrosList.filter((r) => {
    const matchSearch = r.numero_registro.toLowerCase().includes(searchTerm.toLowerCase());
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    en_revisin: 'bg-primary/10 text-primary',
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-foreground">Medio Ambiente</h1>
            {(!registros || (registros.data && registros.data.length === 0) || (Array.isArray(registros) && registros.length === 0)) && <DemoDataBadge />}
          </div>
          <p className="text-muted-foreground">Monitoreo de emisiones, residuos, agua y ruido</p>
        </div>
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Registro
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nuevo Registro Ambiental</DialogTitle>
              <DialogDescription>
                Registra datos de emisiones, residuos, agua o ruido
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="tipo">Tipo</Label>
                <Select value={formData.tipo} onValueChange={(value) => setFormData(prev => ({ ...prev, tipo: value as any }))}>
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
                <Select value={formData.cumplimiento} onValueChange={(value) => setFormData(prev => ({ ...prev, cumplimiento: value as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conforme">Conforme</SelectItem>
                    <SelectItem value="no_conforme">No Conforme</SelectItem>
                    <SelectItem value="en_revisin">En Revisión</SelectItem>
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
                  Crear Registro
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
                      <Badge className={cumplimientoColor[r.cumplimiento as keyof typeof cumplimientoColor]}>
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
