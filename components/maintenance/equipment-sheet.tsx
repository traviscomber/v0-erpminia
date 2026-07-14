'use client';

import Link from 'next/link';
import type { Equipment } from '@/lib/types/equipment';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

type EquipmentSheetProps = {
  equipment: Equipment | null;
  isOpen: boolean;
  onClose: () => void;
  canEdit?: boolean;
};

function normalizeText(value: string | null | undefined) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function getStatusLabel(status: string) {
  const value = normalizeText(status);
  if (['activo', 'operativo', 'active'].includes(value)) return 'Activo';
  if (value === 'mantenimiento') return 'Mantenimiento';
  if (['inactivo', 'inactive'].includes(value)) return 'Inactivo';
  return status || 'Sin estado';
}

function getCriticalityVariant(criticality: string): 'destructive' | 'secondary' | 'outline' {
  const value = normalizeText(criticality);
  if (['critico', 'critical'].includes(value)) return 'destructive';
  if (['alto', 'high'].includes(value)) return 'secondary';
  return 'outline';
}

export function EquipmentSheet({ equipment, isOpen, onClose, canEdit = false }: EquipmentSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader className="pr-10">
          <SheetTitle>{equipment?.name || 'Detalle de equipo'}</SheetTitle>
          <SheetDescription>
            Ficha tecnica y estado operativo del equipo seleccionado.
          </SheetDescription>
        </SheetHeader>

        {!equipment ? (
          <div className="px-4 pb-6 text-sm text-muted-foreground">Selecciona un equipo para ver su detalle.</div>
        ) : (
          <div className="space-y-5 px-4 pb-6">
            <div className="flex flex-wrap gap-2">
              <Badge variant={getCriticalityVariant(equipment.criticality)}>{equipment.criticality}</Badge>
              <Badge variant="outline">{getStatusLabel(equipment.status)}</Badge>
              <Badge variant="outline">{equipment.type}</Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Codigo</p>
                <p className="font-medium">{equipment.code || '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Modelo</p>
                <p className="font-medium">{equipment.model || '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Serie</p>
                <p className="font-medium">{equipment.serial_number || '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Tipo</p>
                <p className="font-medium">{equipment.type || '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Compra</p>
                <p className="font-medium">
                  {equipment.purchase_date ? new Date(equipment.purchase_date).toLocaleDateString('es-CL') : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Proxima mantencion</p>
                <p className="font-medium">
                  {equipment.next_maintenance ? new Date(equipment.next_maintenance).toLocaleDateString('es-CL') : '-'}
                </p>
              </div>
            </div>

            {equipment.specs && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Especificaciones</p>
                <pre className="mt-2 overflow-auto rounded-lg border bg-muted p-3 text-xs">
                  {JSON.stringify(equipment.specs, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={onClose}>
                Cerrar
              </Button>
              {equipment && (
                <Button asChild variant="outline">
                  <Link href={`/dashboard/mantenimiento/equipos/${equipment.id}/ficha`}>Ficha completa</Link>
                </Button>
              )}
              {equipment && (
                <Button asChild variant="outline">
                  <Link href={`/dashboard/mantenimiento/equipos/${equipment.id}/arbol`}>Ver arbol de fallas</Link>
                </Button>
              )}
              {canEdit && (
                <Button disabled>
                  Editar equipo
                </Button>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
