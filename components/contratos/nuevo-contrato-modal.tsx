'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Loader2 } from 'lucide-react';

interface NuevoContratoFormProps {
  onSuccess?: () => void;
}

export function NuevoContratoModal({ onSuccess }: NuevoContratoFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    contratista: '',
    nombreContrato: '',
    monto: '',
    fechaInicio: '',
    fechaFin: '',
    proyecto: 'flujo_electrico',
    propiedad: '1',
    estado: 'activo',
    descripcion: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/contratos/nuevo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractor_name: formData.contratista,
          contract_name: formData.nombreContrato,
          monto_neto: parseFloat(formData.monto),
          fecha_inicio: formData.fechaInicio,
          fecha_fin: formData.fechaFin,
          proyecto: formData.proyecto,
          propiedad: parseInt(formData.propiedad),
          estado: formData.estado,
          descripcion: formData.descripcion,
        }),
      });

      if (!response.ok) throw new Error('Error al crear contrato');

      setOpen(false);
      setFormData({
        contratista: '',
        nombreContrato: '',
        monto: '',
        fechaInicio: '',
        fechaFin: '',
        proyecto: 'flujo_electrico',
        propiedad: '1',
        estado: 'activo',
        descripcion: '',
      });
      onSuccess?.();
    } catch (error) {
      console.error('[v0] Error creating contract:', error);
      alert('Error al crear el contrato. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-brand-naranja hover:bg-brand-naranja/90">
          <Plus className="h-4 w-4 mr-1" />
          Nuevo Contrato
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Contrato</DialogTitle>
          <DialogDescription>
            Completa la información del nuevo contrato con contratista
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contratista */}
          <div className="space-y-2">
            <Label htmlFor="contratista">Contratista / Empresa *</Label>
            <Input
              id="contratista"
              name="contratista"
              placeholder="Nombre de la empresa contratista"
              value={formData.contratista}
              onChange={handleChange}
              required
            />
          </div>

          {/* Nombre del Contrato */}
          <div className="space-y-2">
            <Label htmlFor="nombreContrato">Nombre del Contrato *</Label>
            <Input
              id="nombreContrato"
              name="nombreContrato"
              placeholder="Ej: Servicios de Perforación"
              value={formData.nombreContrato}
              onChange={handleChange}
              required
            />
          </div>

          {/* Monto */}
          <div className="space-y-2">
            <Label htmlFor="monto">Monto Neto (CLP) *</Label>
            <Input
              id="monto"
              name="monto"
              type="number"
              placeholder="1000000"
              value={formData.monto}
              onChange={handleChange}
              required
            />
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fechaInicio">Fecha Inicio *</Label>
              <Input
                id="fechaInicio"
                name="fechaInicio"
                type="date"
                value={formData.fechaInicio}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fechaFin">Fecha Fin *</Label>
              <Input
                id="fechaFin"
                name="fechaFin"
                type="date"
                value={formData.fechaFin}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Proyecto */}
          <div className="space-y-2">
            <Label htmlFor="proyecto">Tipo de Proyecto *</Label>
            <Select value={formData.proyecto} onValueChange={(value) => handleSelectChange('proyecto', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flujo_electrico">Flujo Eléctrico</SelectItem>
                <SelectItem value="bodega">Bodega</SelectItem>
                <SelectItem value="quimica">Química</SelectItem>
                <SelectItem value="molino">Molino</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Propiedad */}
          <div className="space-y-2">
            <Label htmlFor="propiedad">Propiedad *</Label>
            <Select value={formData.propiedad} onValueChange={(value) => handleSelectChange('propiedad', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Propiedad 1 (Máxima)</SelectItem>
                <SelectItem value="2">Propiedad 2</SelectItem>
                <SelectItem value="3">Propiedad 3 (Mínima)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Estado */}
          <div className="space-y-2">
            <Label htmlFor="estado">Estado Inicial *</Label>
            <Select value={formData.estado} onValueChange={(value) => handleSelectChange('estado', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="activo">Activo</SelectItem>
                <SelectItem value="inactivo">Inactivo</SelectItem>
                <SelectItem value="pausa">En Pausa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción (Opcional)</Label>
            <Textarea
              id="descripcion"
              name="descripcion"
              placeholder="Detalles adicionales del contrato..."
              value={formData.descripcion}
              onChange={handleChange}
              rows={3}
            />
          </div>

          {/* Botones */}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-brand-naranja hover:bg-brand-naranja/90">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Crear Contrato
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
