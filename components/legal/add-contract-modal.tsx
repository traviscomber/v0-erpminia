'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';

interface AddContractModalProps {
  onSubmit: (contract: any) => Promise<void>;
}

export function AddContractModal({ onSubmit }: AddContractModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    contractor_name: '',
    start_date: '',
    end_date: '',
    contract_value: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (file) {
        const payload = new FormData();
        payload.append('title', formData.title);
        payload.append('contractorName', formData.contractor_name);
        payload.append('startDate', formData.start_date);
        payload.append('endDate', formData.end_date);
        payload.append('contractValue', formData.contract_value);
        payload.append('file', file);
        await onSubmit(Object.fromEntries(payload.entries()));
      } else {
        await onSubmit({
          ...formData,
          contract_value: formData.contract_value ? parseInt(formData.contract_value, 10) : 0,
        });
      }
      setFormData({ title: '', contractor_name: '', start_date: '', end_date: '', contract_value: '' });
      setFile(null);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Nuevo Contrato
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar Contrato</DialogTitle>
          <DialogDescription>Registra un nuevo contrato comercial</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título del Contrato</Label>
            <Input id="title" placeholder="Ej: Contrato Proveedor" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contractor">Contratista/Proveedor</Label>
            <Input id="contractor" placeholder="Nombre" value={formData.contractor_name} onChange={(e) => setFormData({ ...formData, contractor_name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start">Fecha Inicio</Label>
              <Input id="start" type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">Fecha Término</Label>
              <Input id="end" type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="value">Monto (USD)</Label>
            <Input id="value" type="number" placeholder="0" value={formData.contract_value} onChange={(e) => setFormData({ ...formData, contract_value: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="file">Archivo opcional</Label>
            <Input
              id="file"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

