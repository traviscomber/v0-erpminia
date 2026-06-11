'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, AlertCircle, Edit, Trash2, Download, Package } from 'lucide-react';
import useSWR from 'swr';
import { EPPUserDelivery } from '@/components/sostenibilidad/epp-user-delivery';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface EPP {
  id: string;
  cargo_puesto: string;
  elemento_epp: string;
  cantidad_elemento: number;
  marca_modelo: string;
  frecuencia_reemplazo: string;
  activo: boolean;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function EPPPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCargo, setSelectedCargo] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    cargo_puesto: '',
    elemento_epp: '',
    cantidad_elemento: 1,
    marca_modelo: '',
    frecuencia_reemplazo: 'semestral',
    activo: true,
  });

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      cargo_puesto: '',
      elemento_epp: '',
      cantidad_elemento: 1,
      marca_modelo: '',
      frecuencia_reemplazo: 'semestral',
      activo: true,
    });
  };

  const { data: epp, isLoading, mutate } = useSWR('/api/sostenibilidad/epp', fetcher);

  const eqqData = ((epp?.data || []) as EPP[]);
  const cargos = [...new Set(eqqData.map((item: EPP) => item.cargo_puesto))];

  const filteredEPP = eqqData.filter((item: EPP) =>
    (item.elemento_epp.toLowerCase().includes(searchTerm.toLowerCase()) ||
     item.cargo_puesto.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (!selectedCargo || item.cargo_puesto === selectedCargo)
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as any;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : name === 'cantidad_elemento' ? parseInt(value) || 1 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId
        ? `/api/sostenibilidad/epp?id=${editingId}`
        : '/api/sostenibilidad/epp';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(editingId ? 'EPP actualizado correctamente' : 'EPP registrado correctamente');
        setIsOpen(false);
        resetForm();
        mutate();
      } else {
        toast.error(editingId ? 'Error al actualizar EPP' : 'Error al registrar EPP');
      }
    } catch (error) {
      console.error('[v0] Error saving EPP:', error);
      toast.error('Error al guardar EPP');
    }
  };

  const handleEdit = (item: EPP) => {
    setEditingId(item.id);
    setFormData({
      cargo_puesto: item.cargo_puesto,
      elemento_epp: item.elemento_epp,
      cantidad_elemento: item.cantidad_elemento,
      marca_modelo: item.marca_modelo || '',
      frecuencia_reemplazo: item.frecuencia_reemplazo,
      activo: item.activo,
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return;
    try {
      const response = await fetch(`/api/sostenibilidad/epp?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        toast.success('EPP eliminado correctamente');
        mutate();
      } else {
        toast.error('Error al eliminar EPP');
      }
    } catch (error) {
      console.error('[v0] Error deleting EPP:', error);
      toast.error('Error al eliminar EPP');
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-foreground">Gestión de Artículos de EPP</h1>
          </div>
          <p className="text-muted-foreground">Equipos de Protección Personal por puesto de trabajo</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo EPP
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar EPP' : 'Registrar Nuevo EPP'}</DialogTitle>
              <DialogDescription>
                {editingId ? 'Modifica los datos del equipo de protección personal' : 'Agrega un nuevo equipo de protección personal'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="cargo">Cargo/Puesto</Label>
                <Input
                  id="cargo"
                  name="cargo_puesto"
                  value={formData.cargo_puesto}
                  onChange={handleInputChange}
                  placeholder="Ej: Operario"
                  required
                />
              </div>
              <div>
                <Label htmlFor="elemento">Elemento EPP</Label>
                <Input
                  id="elemento"
                  name="elemento_epp"
                  value={formData.elemento_epp}
                  onChange={handleInputChange}
                  placeholder="Ej: Casco de seguridad"
                  required
                />
              </div>
              <div>
                <Label htmlFor="cantidad">Cantidad</Label>
                <Input
                  id="cantidad"
                  type="number"
                  name="cantidad_elemento"
                  value={formData.cantidad_elemento}
                  onChange={handleInputChange}
                  min="1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="marca">Marca/Modelo</Label>
                <Input
                  id="marca"
                  name="marca_modelo"
                  value={formData.marca_modelo}
                  onChange={handleInputChange}
                  placeholder="Ej: MSA V-Guard"
                />
              </div>
              <div>
                <Label htmlFor="frecuencia">Frecuencia de Reemplazo</Label>
                <select
                  id="frecuencia"
                  name="frecuencia_reemplazo"
                  value={formData.frecuencia_reemplazo}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                >
                  <option value="mensual">Mensual</option>
                  <option value="trimestral">Trimestral</option>
                  <option value="semestral">Semestral</option>
                  <option value="anual">Anual</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="activo"
                  type="checkbox"
                  name="activo"
                  checked={formData.activo}
                  onChange={handleInputChange}
                  className="w-4 h-4"
                />
                <Label htmlFor="activo" className="mb-0">Activo</Label>
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {editingId ? 'Guardar Cambios' : 'Crear EPP'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex gap-4 flex-wrap">
        <Input
          placeholder="Buscar elemento EPP o cargo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-64"
        />
        <select 
          value={selectedCargo}
          onChange={(e) => setSelectedCargo(e.target.value)}
          className="px-3 py-2 bg-background border border-white/10 rounded-md text-sm"
        >
          <option value="">Todos los cargos</option>
          {cargos.map((cargo, idx) => (
            <option key={`${cargo}-${idx}`} value={cargo as string}>{cargo as string}</option>
          ))}
        </select>
        <Button variant="outline" size="icon">
          <Search className="w-4 h-4" />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total EPP Activo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{eqqData.filter((e: EPP) => e.activo).length}</div>
            <p className="text-xs text-muted-foreground">Artículos vigentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cargos Cubiertos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cargos.length}</div>
            <p className="text-xs text-muted-foreground">Puestos de trabajo</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Elementos Únicos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{[...new Set(eqqData.map((e: EPP) => e.elemento_epp))].length}</div>
            <p className="text-xs text-muted-foreground">Tipos distintos</p>
          </CardContent>
        </Card>
      </div>

      {/* EPP Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Matriz de EPP por Cargo</CardTitle>
          <CardDescription>Especificaciones técnicas, cantidad y frecuencia de reemplazo</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : filteredEPP.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No hay EPP registrados</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 font-medium">Cargo</th>
                    <th className="text-left py-3 px-4 font-medium">Elemento EPP</th>
                    <th className="text-left py-3 px-4 font-medium">Cantidad</th>
                    <th className="text-left py-3 px-4 font-medium">Marca/Modelo</th>
                    <th className="text-left py-3 px-4 font-medium">Frecuencia Reemplazo</th>
                    <th className="text-left py-3 px-4 font-medium">Estado</th>
                    <th className="text-right py-3 px-4 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEPP.map((item: EPP) => (
                    <tr key={item.id} className="border-b border-white/10 hover:bg-white/5 transition">
                      <td className="py-3 px-4 font-medium">{item.cargo_puesto}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-muted-foreground" />
                          {item.elemento_epp}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="outline">{item.cantidad_elemento}</Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-sm">{item.marca_modelo || '-'}</td>
                      <td className="py-3 px-4">
                        <Badge variant="secondary">{item.frecuencia_reemplazo}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={item.activo ? 'bg-secondary/10 text-secondary' : 'bg-muted text-muted-foreground'}>
                          {item.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Editar"
                            onClick={() => handleEdit(item)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Historial">
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Eliminar"
                            onClick={() => handleDelete(item.id, item.elemento_epp)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alerts about expiring EPP */}
      <Card className="mt-6 border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-primary" />
            EPP Próximo a Reemplazarse
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No hay EPP vencidos en el próximo mes</p>
        </CardContent>
      </Card>

      {/* EPP User Delivery Section */}
      <div className="mt-8">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-foreground">Entregas por Usuario</h2>
          <p className="text-muted-foreground">Gestiona la entrega y devolución de EPP por trabajador</p>
        </div>
        <EPPUserDelivery />
      </div>
    </div>
  );
}
