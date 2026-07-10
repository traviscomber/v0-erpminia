'use client';

import type { Equipment } from '@/lib/types/equipment';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, Edit, Plus } from 'lucide-react';

interface EquipmentSheetProps {
  equipment: Equipment | null;
  isOpen: boolean;
  onClose: () => void;
  canEdit?: boolean;
}

export function EquipmentSheet({ equipment, isOpen, onClose, canEdit = false }: EquipmentSheetProps) {
  if (!equipment) return null;

  const specs = equipment.specs as Record<string, string> | null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{equipment.name}</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>{equipment.code}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Modelo</p>
              <p className="font-medium">{equipment.model || '—'}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Tipo</p>
              <p className="font-medium">{equipment.type}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">N° Serie</p>
              <p className="font-medium">{equipment.serial_number || '—'}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Fecha Compra</p>
              <p className="font-medium">
                {equipment.purchase_date ? new Date(equipment.purchase_date).toLocaleDateString('es-CL') : '—'}
              </p>
            </div>
          </div>

          {/* Status */}
          <div className="flex gap-3">
            <Badge
              variant={equipment.status === 'Activo' ? 'default' : 'secondary'}
              className={equipment.status === 'Activo' ? 'bg-emerald-600' : ''}
            >
              {equipment.status}
            </Badge>
            <Badge
              variant="outline"
              className={
                equipment.criticality === 'Crítica'
                  ? 'border-red-300 bg-red-50 text-red-800'
                  : equipment.criticality === 'Alta'
                    ? 'border-orange-300 bg-orange-50 text-orange-800'
                    : equipment.criticality === 'Media'
                      ? 'border-yellow-300 bg-yellow-50 text-yellow-800'
                      : 'border-green-300 bg-green-50 text-green-800'
              }
            >
              {equipment.criticality}
            </Badge>
          </div>

          {/* Dates */}
          <Card className="bg-muted/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Historial de Mantenimiento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Fecha de compra</p>
                  <p className="font-medium">
                    {equipment.purchase_date
                      ? new Date(equipment.purchase_date).toLocaleDateString()
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Último mantenimiento</p>
                  <p className="font-medium">
                    {equipment.last_maintenance
                      ? new Date(equipment.last_maintenance).toLocaleDateString()
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Próximo mantenimiento</p>
                  <p className="font-medium">
                    {equipment.next_maintenance ? (
                      <span
                        className={
                          new Date(equipment.next_maintenance) < new Date()
                            ? 'text-red-600 font-semibold'
                            : ''
                        }
                      >
                        {new Date(equipment.next_maintenance).toLocaleDateString()}
                      </span>
                    ) : (
                      '—'
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Specifications */}
          {specs && Object.keys(specs).length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Especificaciones Técnicas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(specs).map(([key, value]) => (
                    <div key={key} className="flex justify-between border-b pb-2 text-sm">
                      <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                      <span className="font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {canEdit && (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" size="sm">
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </Button>
              <Button variant="outline" className="flex-1" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Crear OT
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
