'use client';

import { useState } from 'react';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ComunidadRecord {
  id: string;
  numero_registro: string;
  fecha: string;
  tipo: 'evento' | 'comunicacion' | 'compromiso';
  descripcion: string;
  stakeholder: string;
  estado: 'pendiente' | 'completado' | 'en_revision';
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function ComunidadesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [tipo, setTipo] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState<ComunidadRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    tipo: 'evento' as const,
    descripcion: '',
    stakeholder: '',
    estado: 'pendiente' as const,
    fecha: new Date().toISOString().split('T')[0],
  });

  const { data: registros = [], mutate } = useSWR(
    '/api/sostenibilidad/comunidades',
    fetcher
  );

  const registrosList = (registros.data || []) as ComunidadRecord[];
  const filtered = registrosList.filter((r) => {
    const matchSearch = r.numero_registro.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.stakeholder.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTipo = !tipo || r.tipo === tipo;
    return matchSearch && matchTipo;
  });

  const handleDelete = async () => {
    if (!selected?.id) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/sostenibilidad/comunidades?id=${selected.id}`, { method: 'DELETE' });
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

  const tipoLabels = {
    evento: 'Eventos',
    comunicacion: 'Comunicaciones',
    compromiso: 'Compromisos',
  };

  const estadoColor = {
    pendiente: 'bg-primary/10 text-primary',
    completado: 'bg-secondary/10 text-secondary',
    en_revision: 'bg-muted/10 text-muted-foreground',
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/sostenibilidad/comunidades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('Registro creado correctamente');
        setIsModalOpen(false);
        setFormData({
          tipo: 'evento',
          descripcion: '',
          stakeholder: '',
          estado: 'pendiente',
          fecha: new Date().toISOString().split('T')[0],
        });
        mutate();
      } else {
        toast.error('Error al crear registro');
      }
    } catch (error) {
      console.error('[v0] Error creating comunidad record:', error);
      toast.error('Error al crear registro');
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Relación con Comunidades</h1>
          <p className="text-muted-foreground">Eventos, comunicaciones y compromisos con stakeholders</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Registro
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nuevo Registro de Comunidad</DialogTitle>
              <DialogDescription>
                Registra eventos, comunicaciones o compromisos con stakeholders
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
                    <SelectItem value="evento">Evento</SelectItem>
                    <SelectItem value="comunicacion">Comunicación</SelectItem>
                    <SelectItem value="compromiso">Compromiso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="stakeholder">Stakeholder</Label>
                <Input
                  id="stakeholder"
                  name="stakeholder"
                  value={formData.stakeholder}
                  onChange={handleInputChange}
                  placeholder="Ej: Comunidad de La Patagua"
                  required
                />
              </div>
              <div>
                <Label htmlFor="fecha">Fecha</Label>
                <Input
                  id="fecha"
                  type="date"
                  name="fecha"
                  value={formData.fecha}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="descripcion">Descripción</Label>
                <textarea
                  id="descripcion"
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleInputChange}
                  placeholder="Detalles del evento, comunicación o compromiso"
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                  rows={3}
                  required
                />
              </div>
              <div>
                <Label htmlFor="estado">Estado</Label>
                <Select value={formData.estado} onValueChange={(value) => setFormData(prev => ({ ...prev, estado: value as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="en_revision">En Revisión</SelectItem>
                    <SelectItem value="completado">Completado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
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
        onEstadoChange={setTipo}
        onReset={() => {
          setSearchTerm('');
          setTipo('');
        }}
      />

      {/* Export Buttons */}
      <div className="mb-6 mt-6">
        <ExportButtons
          data={filtered}
          fileName="Comunidades"
          columns={[
            { key: 'numero_registro', label: 'Número' },
            { key: 'fecha', label: 'Fecha' },
            { key: 'tipo', label: 'Tipo' },
            { key: 'stakeholder', label: 'Stakeholder' },
            { key: 'descripcion', label: 'Descripción' },
            { key: 'estado', label: 'Estado' },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-8">
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
          <CardTitle>Registros Comunitarios</CardTitle>
          <CardDescription>Total: {filtered.length}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Número</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Tipo</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Stakeholder</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Descripción</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Estado</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Fecha</th>
                  <th className="text-right py-3 px-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4 font-medium">{r.numero_registro}</td>
                    <td className="py-3 px-4"><Badge>{tipoLabels[r.tipo as keyof typeof tipoLabels]}</Badge></td>
                    <td className="py-3 px-4 text-sm">{r.stakeholder}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{r.descripcion}</td>
                    <td className="py-3 px-4">
                      <Badge className={estadoColor[r.estado as keyof typeof estadoColor]}>
                        {r.estado}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm">{new Date(r.fecha).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => { setSelected(r); }}>
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
