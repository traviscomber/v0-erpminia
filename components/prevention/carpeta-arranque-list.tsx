'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, Clock, Download, Eye, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const mockCarpetas = [
  {
    id: '1',
    empresa: 'Empresa A - Sofia Sabines',
    fecha_creacion: '2024-06-01',
    estado: 'pendiente',
    documentos_cargados: 12,
    documentos_totales: 19,
    revisor1: 'Dennyse',
    revisor1_status: 'pendiente',
    revisor2: 'Javier Vargas',
    revisor2_status: null,
  },
  {
    id: '2',
    empresa: 'Empresa B - Felipe Mora',
    fecha_creacion: '2024-05-28',
    estado: 'en-revision-2',
    documentos_cargados: 19,
    documentos_totales: 19,
    revisor1: 'Dennyse',
    revisor1_status: 'aprobado',
    revisor2: 'Javier Vargas',
    revisor2_status: 'en-revision',
  },
  {
    id: '3',
    empresa: 'Empresa C - Rodrigo Mazzarella',
    fecha_creacion: '2024-05-20',
    estado: 'aprobado',
    documentos_cargados: 19,
    documentos_totales: 19,
    revisor1: 'Dennyse',
    revisor1_status: 'aprobado',
    revisor2: 'Gonzalo Canales',
    revisor2_status: 'aprobado',
  },
  {
    id: '4',
    empresa: 'Empresa D - Modelos Toledo',
    fecha_creacion: '2024-05-15',
    estado: 'rechazado',
    documentos_cargados: 15,
    documentos_totales: 19,
    revisor1: 'Dennyse',
    revisor1_status: 'rechazado',
    revisor2: null,
    revisor2_status: null,
    observaciones: 'Faltan certificados de afiliación actualizados',
  },
];

function getEstadoBadge(estado: string) {
  const statusConfig: Record<string, { icon: React.ReactNode; label: string; variant: any; color: string }> = {
    pendiente: {
      icon: <Clock className="h-3 w-3" />,
      label: 'Pendiente',
      variant: 'secondary',
      color: 'text-orange-600',
    },
    'en-revision-1': {
      icon: <Clock className="h-3 w-3" />,
      label: 'Revisión Nivel 1',
      variant: 'secondary',
      color: 'text-blue-600',
    },
    'en-revision-2': {
      icon: <Clock className="h-3 w-3" />,
      label: 'Revisión Nivel 2',
      variant: 'secondary',
      color: 'text-blue-600',
    },
    aprobado: {
      icon: <CheckCircle className="h-3 w-3" />,
      label: 'Aprobado',
      variant: 'default',
      color: 'text-green-600',
    },
    rechazado: {
      icon: <AlertCircle className="h-3 w-3" />,
      label: 'Rechazado',
      variant: 'destructive',
      color: 'text-red-600',
    },
  };

  const config = statusConfig[estado] || statusConfig.pendiente;
  return (
    <Badge variant={config.variant} className="gap-1">
      {config.icon}
      {config.label}
    </Badge>
  );
}

export default function CarpetaArranqueList({ status }: { status: string }) {
  const filteredCarpetas = mockCarpetas.filter(c => {
    if (status === 'todas') return true;
    if (status === 'en-revision') return ['en-revision-1', 'en-revision-2'].includes(c.estado);
    return c.estado === status;
  });

  return (
    <div className="grid gap-4">
      {filteredCarpetas.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No hay carpetas en este estado</p>
          </CardContent>
        </Card>
      ) : (
        filteredCarpetas.map(carpeta => (
          <Card key={carpeta.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-base">{carpeta.empresa}</h3>
                    <p className="text-sm text-muted-foreground">
                      Creado: {new Date(carpeta.fecha_creacion).toLocaleDateString('es-CL')}
                    </p>
                  </div>
                  {getEstadoBadge(carpeta.estado)}
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Documentos cargados</span>
                    <span className="font-semibold">
                      {carpeta.documentos_cargados}/{carpeta.documentos_totales}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${(carpeta.documentos_cargados / carpeta.documentos_totales) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Review Status */}
                <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Revisión Nivel 1</p>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'h-3 w-3 rounded-full',
                        carpeta.revisor1_status === 'aprobado' ? 'bg-green-500' :
                        carpeta.revisor1_status === 'rechazado' ? 'bg-red-500' :
                        'bg-yellow-500'
                      )} />
                      <span className="text-sm font-medium">{carpeta.revisor1}</span>
                      <Badge variant="outline" className="text-xs">
                        {carpeta.revisor1_status === 'aprobado' ? '✓ Aprobado' :
                         carpeta.revisor1_status === 'rechazado' ? '✗ Rechazado' :
                         'Pendiente'}
                      </Badge>
                    </div>
                  </div>

                  {carpeta.revisor2 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Revisión Nivel 2</p>
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          'h-3 w-3 rounded-full',
                          carpeta.revisor2_status === 'aprobado' ? 'bg-green-500' :
                          carpeta.revisor2_status === 'rechazado' ? 'bg-red-500' :
                          carpeta.revisor2_status === 'en-revision' ? 'bg-yellow-500' :
                          'bg-gray-300'
                        )} />
                        <span className="text-sm font-medium">{carpeta.revisor2}</span>
                        <Badge variant="outline" className="text-xs">
                          {carpeta.revisor2_status === 'aprobado' ? '✓ Aprobado' :
                           carpeta.revisor2_status === 'rechazado' ? '✗ Rechazado' :
                           carpeta.revisor2_status === 'en-revision' ? 'En revisión' :
                           'Pendiente'}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>

                {/* Observaciones */}
                {carpeta.observaciones && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs font-semibold text-red-600 mb-1">Observaciones:</p>
                    <p className="text-sm text-red-700">{carpeta.observaciones}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Eye className="h-4 w-4" />
                    Ver Detalles
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    Descargar
                  </Button>
                  {['pendiente', 'en-revision-1'].includes(carpeta.estado) && (
                    <Button variant="ghost" size="sm" className="gap-2 text-red-600 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                      Eliminar
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
