'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { AlertCircle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const inspeccionSchema = z.object({
  tipo: z.enum(['internas', 'externas']),
  numero_inspeccion: z.string().trim().min(3, 'Ingresa al menos 3 caracteres'),
  fecha_planificada: z.string().min(1, 'Selecciona una fecha'),
  faena: z.string().trim().min(2, 'Ingresa el lugar o área de la inspección'),
  inspector: z.string().trim().min(2, 'Ingresa el nombre del inspector'),
  hallazgos_count: z.coerce.number().int('Debe ser un número entero').min(0, 'No puede ser negativo'),
  estado: z.enum(['planificada', 'realizada', 'cerrada']),
});

type InspeccionFormData = z.infer<typeof inspeccionSchema>;
type InspeccionEstado = InspeccionFormData['estado'];

interface InspeccionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inspeccion?: InspeccionFormData & { id?: string };
  onSuccess?: () => void;
}

const defaultValues: InspeccionFormData = {
  tipo: 'internas',
  numero_inspeccion: '',
  fecha_planificada: new Date().toISOString().split('T')[0],
  faena: '',
  inspector: '',
  hallazgos_count: 0,
  estado: 'planificada',
};

export function InspeccionModal({ open, onOpenChange, inspeccion, onSuccess }: InspeccionModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<InspeccionFormData>({
    resolver: zodResolver(inspeccionSchema),
    defaultValues: inspeccion || defaultValues,
  });

  const estado = watch('estado');
  const tipo = watch('tipo');

  useEffect(() => {
    if (!open) return;
    setError(null);
    reset(inspeccion || defaultValues);
  }, [open, inspeccion, reset]);

  const onSubmit = async (data: InspeccionFormData) => {
    setLoading(true);
    setError(null);

    try {
      const url = inspeccion?.id
        ? `/api/sostenibilidad/inspecciones?id=${inspeccion.id}&tipo=${data.tipo}`
        : '/api/sostenibilidad/inspecciones';
      const method = inspeccion?.id ? 'PUT' : 'POST';
      const body = inspeccion?.id ? { id: inspeccion.id, ...data } : data;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No fue posible guardar la inspección.');

      toast.success(inspeccion?.id ? 'Inspección actualizada' : 'Inspección creada', {
        description: `Número: ${data.numero_inspeccion}`,
      });
      onOpenChange(false);
      reset(defaultValues);
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No fue posible guardar la inspección.';
      setError(message);
      toast.error('No se pudo guardar', { description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{inspeccion?.id ? 'Editar inspección' : 'Nueva inspección'}</DialogTitle>
          <DialogDescription>
            Registra información real del lugar, responsable, fecha y estado de la inspección.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error ? (
            <div role="alert" className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Tipo de inspección</label>
              <Select
                value={tipo}
                onValueChange={(value) => setValue('tipo', value as 'internas' | 'externas', { shouldValidate: true })}
                disabled={Boolean(inspeccion?.id)}
              >
                <SelectTrigger className={errors.tipo ? 'border-destructive' : ''}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="internas">Interna</SelectItem>
                  <SelectItem value="externas">Externa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Número de inspección</label>
              <Input
                placeholder="Ej. INS-001"
                {...register('numero_inspeccion')}
                disabled={Boolean(inspeccion?.id)}
                className={errors.numero_inspeccion ? 'border-destructive' : ''}
              />
              {errors.numero_inspeccion ? <p className="mt-1 text-xs text-destructive">{errors.numero_inspeccion.message}</p> : null}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Fecha planificada</label>
              <Input type="date" {...register('fecha_planificada')} className={errors.fecha_planificada ? 'border-destructive' : ''} />
              {errors.fecha_planificada ? <p className="mt-1 text-xs text-destructive">{errors.fecha_planificada.message}</p> : null}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Lugar o área</label>
              <Input
                placeholder="Nombre real de la faena, planta o sector"
                {...register('faena')}
                className={errors.faena ? 'border-destructive' : ''}
              />
              {errors.faena ? <p className="mt-1 text-xs text-destructive">{errors.faena.message}</p> : null}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Inspector</label>
              <Input placeholder="Nombre completo" {...register('inspector')} className={errors.inspector ? 'border-destructive' : ''} />
              {errors.inspector ? <p className="mt-1 text-xs text-destructive">{errors.inspector.message}</p> : null}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Hallazgos registrados</label>
              <Input type="number" min="0" step="1" {...register('hallazgos_count')} className={errors.hallazgos_count ? 'border-destructive' : ''} />
              {errors.hallazgos_count ? <p className="mt-1 text-xs text-destructive">{errors.hallazgos_count.message}</p> : null}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Estado</label>
            <Select value={estado} onValueChange={(value) => setValue('estado', value as InspeccionEstado, { shouldValidate: true })}>
              <SelectTrigger className={errors.estado ? 'border-destructive' : ''}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="planificada">Planificada</SelectItem>
                <SelectItem value="realizada">Realizada</SelectItem>
                <SelectItem value="cerrada">Cerrada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? 'Guardando…' : inspeccion?.id ? 'Guardar cambios' : 'Crear inspección'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
