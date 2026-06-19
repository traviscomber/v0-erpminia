'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X, Loader2 } from 'lucide-react';

interface NuevoContratoModalProps {
  onSuccess: () => void;
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
    projectName: '',
    propertyName: '',
    estado: 'activo',
    contractType: 'Principal',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
          projectName: formData.projectName,
          propertyName: formData.propertyName,
          contractType: formData.contractType,
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
        projectName: '',
        propertyName: '',
        estado: 'activo',
        contractType: 'Principal',
      });
      setOpen(false);
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
      console.error('[v0] Error creating contract:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <Button size="sm" className="gap-2 bg-orange-600 hover:bg-orange-700" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Nuevo Contrato
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md space-y-4 rounded-lg bg-white p-6 shadow-lg dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Crear Nuevo Contrato</h2>
          <button
            onClick={() => setOpen(false)}
            className="rounded p-1 hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
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
              placeholder="Nombre empresa o persona"
              required
            />
          </div>

          <div>
            <Label htmlFor="nombreContrato">Nombre contrato *</Label>
            <Input
              id="nombreContrato"
              name="nombreContrato"
              value={formData.nombreContrato}
              onChange={handleChange}
              placeholder="Descripcion del contrato"
              required
            />
          </div>

          <div>
            <Label htmlFor="monto">Monto total CLP *</Label>
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
              <Label htmlFor="fechaInicio">Fecha inicio *</Label>
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
              <Label htmlFor="fechaFin">Fecha fin *</Label>
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
              <Label htmlFor="projectName">Proyecto</Label>
              <Input
                id="projectName"
                name="projectName"
                value={formData.projectName}
                onChange={handleChange}
                placeholder="Nombre real del proyecto"
              />
            </div>
            <div>
              <Label htmlFor="propertyName">Propiedad</Label>
              <Input
                id="propertyName"
                name="propertyName"
                value={formData.propertyName}
                onChange={handleChange}
                placeholder="Nombre real de la propiedad"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contractType">Tipo de contrato</Label>
              <select
                id="contractType"
                name="contractType"
                value={formData.contractType}
                onChange={handleChange}
                className="w-full rounded-md border bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="Principal">Principal</option>
                <option value="Subcontrato">Subcontrato</option>
                <option value="Enmienda">Enmienda</option>
                <option value="Addendum">Addendum</option>
              </select>
            </div>
            <div>
              <Label htmlFor="estado">Estado</Label>
              <select
                id="estado"
                name="estado"
                value={formData.estado}
                onChange={handleChange}
                className="w-full rounded-md border bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="activo">Activo</option>
                <option value="pendiente">Pendiente</option>
                <option value="pausado">Pausado</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading} className="flex-1 bg-orange-600 hover:bg-orange-700">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                'Crear contrato'
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
