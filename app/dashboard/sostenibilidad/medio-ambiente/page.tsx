'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, Trash2 } from 'lucide-react';
import useSWR from 'swr';
import { InspeccionModal } from '@/components/sostenibilidad/inspeccion-modal';
import { ConfirmDeleteDialog } from '@/components/sostenibilidad/confirm-delete-dialog';
import { FilterPanel } from '@/components/sostenibilidad/filter-panel';
import { toast } from 'sonner';

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

  const { data: registros = [], mutate } = useSWR(
    '/api/sostenibilidad/medio-ambiente',
    fetcher
  );

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
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Medio Ambiente</h1>
          <p className="text-muted-foreground">Monitoreo de emisiones, residuos, agua y ruido</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90" onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Registro
        </Button>
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
