'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Loader2 } from 'lucide-react';

const inspeccionSchema = z.object({
  tipo: z.enum(['internas', 'externas']),
  numero_inspeccion: z.string().min(3, 'Mínimo 3 caracteres'),
  fecha_planificada: z.string().min(1, 'Selecciona una fecha'),
  faena: z.string().min(1, 'Selecciona una faena'),
  inspector: z.string().min(1, 'Nombre del inspector'),
  hallazgos_count: z.coerce.number().min(0, 'No puede ser negativo'),
  estado: z.enum(['planificada', 'realizada', 'cerrada']),
});

type InspeccionFormData = z.infer<typeof inspeccionSchema>;

interface InspeccionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inspeccion?: InspeccionFormData & { id?: string };
  onSuccess?: () => void;
}

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
    defaultValues: inspeccion || {
      tipo: 'internas',
      numero_inspeccion: '',
      fecha_planificada: new Date().toISOString().split('T')[0],
      faena: '',
      inspector: '',
      hallazgos_count: 0,
      estado: 'planificada',
    },
  });

  const estado = watch('estado');
  const tipo = watch('tipo');

  useEffect(() => {
    if (open && inspeccion) {
      reset(inspeccion);
    } else if (open) {
      reset({
        tipo: 'internas',
        numero_inspeccion: '',
        fecha_planificada: new Date().toISOString().split('T')[0],
        faena: '',
        inspector: '',
        hallazgos_count: 0,
        estado: 'planificada',
      });
    }
  }, [open, inspeccion, reset]);

  const onSubmit = async (data: InspeccionFormData) => {
    setLoading(true);
    setError(null);

    try {
      const url = inspeccion?.id
        ? `/api/sostenibilidad/inspecciones?id=${inspeccion.id}&tipo=${data.tipo}`
        : '/api/sostenibilidad/inspecciones';

      const method = inspeccion?.id ? 'PUT' : 'POST';
      const body = inspeccion?.id ? { id: inspeccion.id, ...data } : { ...data };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error en la operación');
      }

      toast.success(inspeccion?.id ? 'Inspección actualizada correctamente' : 'Inspección creada correctamente', {
        description: `Número: ${data.numero_inspeccion}`,
      });

      onOpenChange(false);
      reset();
      onSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error en la operación';
      setError(errorMessage);
      toast.error('Error al guardar', {
        description: errorMessage,
      });
      console.error('[v0] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{inspeccion?.id ? 'Editar Inspección' : 'Nueva Inspección'}</DialogTitle>
          <DialogDescription>
            {inspeccion?.id
              ? 'Modifica los detalles de la inspección'
              : 'Registra una nueva inspección'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">Tipo de inspección *</label>
            <Select
              value={tipo}
              onValueChange={(value) => setValue('tipo', value as 'internas' | 'externas')}
              disabled={!!inspeccion?.id}
            >
              <SelectTrigger className={errors.tipo ? 'border-destructive' : ''}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="internas">Interna</SelectItem>
                <SelectItem value="externas">Externa</SelectItem>
              </SelectContent>
            </Select>
            {errors.tipo && <p className="mt-1 text-xs text-destructive">{errors.tipo.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Número de inspección *</label>
            <Input
              placeholder="INS-001, INS-002, etc."
              {...register('numero_inspeccion')}
              disabled={!!inspeccion?.id}
              className={errors.numero_inspeccion ? 'border-destructive' : ''}
            />
            {errors.numero_inspeccion && (
              <p className="mt-1 text-xs text-destructive">{errors.numero_inspeccion.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Fecha planificada *</label>
              <Input
                type="date"
                {...register('fecha_planificada')}
                className={errors.fecha_planificada ? 'border-destructive' : ''}
              />
              {errors.fecha_planificada && (
                <p className="mt-1 text-xs text-destructive">{errors.fecha_planificada.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Faena *</label>
              <Select value={watch('faena')} onValueChange={(value) => setValue('faena', value)}>
                <SelectTrigger className={errors.faena ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Selecciona una faena" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mina A">Mina A</SelectItem>
                  <SelectItem value="Mina B">Mina B</SelectItem>
                  <SelectItem value="Planta">Planta Procesamiento</SelectItem>
                  <SelectItem value="Laboratorio">Laboratorio</SelectItem>
                  <SelectItem value="Depósito">Depósito</SelectItem>
                </SelectContent>
              </Select>
              {errors.faena && <p className="mt-1 text-xs text-destructive">{errors.faena.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Inspector *</label>
              <Input
                placeholder="Nombre del inspector"
                {...register('inspector')}
                className={errors.inspector ? 'border-destructive' : ''}
              />
              {errors.inspector && <p className="mt-1 text-xs text-destructive">{errors.inspector.message}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Cantidad de hallazgos</label>
              <Input
                type="number"
                min="0"
                {...register('hallazgos_count')}
                className={errors.hallazgos_count ? 'border-destructive' : ''}
              />
              {errors.hallazgos_count && (
                <p className="mt-1 text-xs text-destructive">{errors.hallazgos_count.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Estado *</label>
            <Select value={estado} onValueChange={(value) => setValue('estado', value as any)}>
              <SelectTrigger className={errors.estado ? 'border-destructive' : ''}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planificada">Planificada</SelectItem>
                <SelectItem value="realizada">Realizada</SelectItem>
                <SelectItem value="cerrada">Cerrada</SelectItem>
              </SelectContent>
            </Select>
            {errors.estado && <p className="mt-1 text-xs text-destructive">{errors.estado.message}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {inspeccion?.id ? 'Guardando...' : 'Creando...'}
                </>
              ) : inspeccion?.id ? (
                'Guardar cambios'
              ) : (
                'Crear inspección'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
