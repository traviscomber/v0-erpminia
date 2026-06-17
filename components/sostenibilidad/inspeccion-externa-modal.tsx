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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Loader2 } from 'lucide-react';

const inspeccionExternaSchema = z.object({
  numero_inspeccion: z.string().min(3, 'Mínimo 3 caracteres'),
  fecha_planificada: z.string().min(1, 'Selecciona una fecha'),
  faena: z.string().min(1, 'Selecciona una faena'),
  inspector: z.string().min(1, 'Nombre del inspector'),
  empresa_externa: z.string().min(1, 'Nombre de la empresa'),
  contacto_externo: z.string().min(1, 'Nombre del contacto'),
  hallazgos_count: z.coerce.number().min(0, 'No puede ser negativo'),
  estado: z.enum(['planificada', 'realizada', 'cerrada']),
});

type InspeccionExternaFormData = z.infer<typeof inspeccionExternaSchema>;

interface InspeccionExternaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inspeccion?: InspeccionExternaFormData & { id?: string };
  onSuccess?: () => void;
}

export function InspeccionExternaModal({
  open,
  onOpenChange,
  inspeccion,
  onSuccess,
}: InspeccionExternaModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<InspeccionExternaFormData>({
    resolver: zodResolver(inspeccionExternaSchema),
    defaultValues: inspeccion || {
      numero_inspeccion: '',
      fecha_planificada: new Date().toISOString().split('T')[0],
      faena: '',
      inspector: '',
      empresa_externa: '',
      contacto_externo: '',
      hallazgos_count: 0,
      estado: 'planificada',
    },
  });

  const estado = watch('estado');

  useEffect(() => {
    if (open && inspeccion) {
      reset(inspeccion);
    } else if (open) {
      reset({
        numero_inspeccion: '',
        fecha_planificada: new Date().toISOString().split('T')[0],
        faena: '',
        inspector: '',
        empresa_externa: '',
        contacto_externo: '',
        hallazgos_count: 0,
        estado: 'planificada',
      });
    }
  }, [open, inspeccion, reset]);

  const onSubmit = async (data: InspeccionExternaFormData) => {
    setLoading(true);
    setError(null);

    try {
      const url = inspeccion?.id
        ? `/api/sostenibilidad/inspecciones?id=${inspeccion.id}&tipo=externas`
        : '/api/sostenibilidad/inspecciones';

      const method = inspeccion?.id ? 'PUT' : 'POST';
      const body = inspeccion?.id ? { id: inspeccion.id, tipo: 'externas', ...data } : { tipo: 'externas', ...data };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error en la operación');
      }

      const successMessage = inspeccion?.id
        ? 'Inspección externa actualizada correctamente'
        : 'Inspección externa creada correctamente';

      toast.success(successMessage, {
        description: `Auditoría: ${data.numero_inspeccion} - ${data.empresa_externa}`,
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
          <DialogTitle>
            {inspeccion?.id ? 'Editar inspección externa' : 'Nueva inspección externa'}
          </DialogTitle>
          <DialogDescription>
            {inspeccion?.id
              ? 'Modifica los detalles de la inspección externa.'
              : 'Registra una nueva inspección externa.'}
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
            <label className="mb-1 block text-sm font-medium">Número de inspección *</label>
            <Input
              placeholder="EXT-001, EXT-002, etc."
              {...register('numero_inspeccion')}
              disabled={!!inspeccion?.id}
              className={errors.numero_inspeccion ? 'border-destructive' : ''}
            />
            {errors.numero_inspeccion && (
              <p className="mt-1 text-xs text-destructive">{errors.numero_inspeccion.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
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
                  <SelectItem value="Planta">Planta de procesamiento</SelectItem>
                  <SelectItem value="Laboratorio">Laboratorio</SelectItem>
                  <SelectItem value="Depósito">Depósito</SelectItem>
                </SelectContent>
              </Select>
              {errors.faena && <p className="mt-1 text-xs text-destructive">{errors.faena.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Inspector interno *</label>
              <Input
                placeholder="Nombre del inspector"
                {...register('inspector')}
                className={errors.inspector ? 'border-destructive' : ''}
              />
              {errors.inspector && (
                <p className="mt-1 text-xs text-destructive">{errors.inspector.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Empresa externa *</label>
              <Input
                placeholder="Nombre de la empresa auditora"
                {...register('empresa_externa')}
                className={errors.empresa_externa ? 'border-destructive' : ''}
              />
              {errors.empresa_externa && (
                <p className="mt-1 text-xs text-destructive">{errors.empresa_externa.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Contacto externo *</label>
              <Input
                placeholder="Nombre del auditor o inspector"
                {...register('contacto_externo')}
                className={errors.contacto_externo ? 'border-destructive' : ''}
              />
              {errors.contacto_externo && (
                <p className="mt-1 text-xs text-destructive">{errors.contacto_externo.message}</p>
              )}
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
                'Crear inspección externa'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
