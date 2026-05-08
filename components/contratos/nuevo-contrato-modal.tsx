'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X, Loader2 } from 'lucide-react';

interface NuevoContratoModalProps {
  onSuccess?: () => void;
}

export function NuevoContratoModal({ onSuccess }: NuevoContratoModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    contratista: '',
    nombreContrato: '',
    monto: '',
    fechaInicio: '',
    fechaFin: '',
    proyecto: 'flujo_electrico',
    propiedad: '1',
    estado: 'activo',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/contratos/nuevo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractor_name: formData.contratista,
          contract_name: formData.nombreContrato,
          monto_total: parseFloat(formData.monto),
          fecha_inicio: formData.fechaInicio,
          fecha_fin: formData.fechaFin,
          proyecto: formData.proyecto,
          propiedad: parseInt(formData.propiedad),
          estado: formData.estado,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al crear contrato');
      }

      setFormData({
        contratista: '',
        nombreContrato: '',
        monto: '',
        fechaInicio: '',
        fechaFin: '',
        proyecto: 'flujo_electrico',
        propiedad: '1',
        estado: 'activo',
      });
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      setError((err as Error).message);
      console.error('[v0] Error creating contract:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <Button 
        size="sm" 
        className="gap-2 bg-orange-600 hover:bg-orange-700"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" />
        Nuevo Contrato
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Crear Nuevo Contrato</h2>
          <button
            onClick={() => setOpen(false)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded text-sm">
              {error}
            </div>
          )}

          <div>
            <Label htmlFor="contratista">Contratista/Prestador *</Label>
            <Input
              id="contratista"
              name="contratista"
              value={formData.contratista}
              onChange={handleChange}
              placeholder="Nombre empresa/persona"
              required
            />
          </div>

          <div>
            <Label htmlFor="nombreContrato">Nombre Contrato *</Label>
            <Input
              id="nombreContrato"
              name="nombreContrato"
              value={formData.nombreContrato}
              onChange={handleChange}
              placeholder="Descripción del contrato"
              required
            />
          </div>

          <div>
            <Label htmlFor="monto">Monto Total CLP *</Label>
            <Input
              id="monto"
              name="monto"
              type="number"
              value={formData.monto}
              onChange={handleChange}
              placeholder="1000000"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
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
            <div>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="proyecto">Proyecto *</Label>
              <select
                id="proyecto"
                name="proyecto"
                value={formData.proyecto}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md bg-white dark:bg-slate-800 dark:border-slate-700"
              >
                <option value="flujo_electrico">Flujo Eléctrico</option>
                <option value="bodega">Bodega</option>
                <option value="quimica">Química</option>
                <option value="molino">Molino</option>
              </select>
            </div>
            <div>
              <Label htmlFor="propiedad">Propiedad *</Label>
              <select
                id="propiedad"
                name="propiedad"
                value={formData.propiedad}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md bg-white dark:bg-slate-800 dark:border-slate-700"
              >
                <option value="1">Propiedad 1</option>
                <option value="2">Propiedad 2</option>
                <option value="3">Propiedad 3</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="estado">Estado *</Label>
            <select
              id="estado"
              name="estado"
              value={formData.estado}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md bg-white dark:bg-slate-800 dark:border-slate-700"
            >
              <option value="activo">Activo</option>
              <option value="pendiente">Pendiente</option>
              <option value="pausado">Pausado</option>
            </select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                'Crear Contrato'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
