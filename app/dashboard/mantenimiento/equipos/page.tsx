'use client';

import { useState } from 'react';
import { Activity, ChevronDown, CircleDollarSign, FileText, FolderOpen, Settings, Upload, Wrench } from 'lucide-react';
import Link from 'next/link';
import type { Equipment } from '@/lib/types/equipment';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EquipmentList } from '@/components/maintenance/equipment-list';
import { EquipmentSheet } from '@/components/maintenance/equipment-sheet';

const assetViews = [
  { href: '/dashboard/mantenimiento/disponibilidad', label: 'Disponibilidad', icon: Activity },
  { href: '/dashboard/mantenimiento/costos', label: 'Costos por equipo', icon: CircleDollarSign },
  { href: '/dashboard/mantenimiento/fichas-tecnicas', label: 'Catálogo técnico', icon: FileText },
  { href: '/dashboard/mantenimiento/documentos/expedientes', label: 'Expedientes', icon: FolderOpen },
  { href: '/dashboard/mantenimiento/neumaticos', label: 'Neumáticos', icon: Settings },
  { href: '/dashboard/mantenimiento/componentes-mayores', label: 'Componentes mayores', icon: Wrench },
];

export default function EquiposPage() {
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handleSelectEquipment = (equipment: Equipment) => {
    setSelectedEquipment(equipment);
    setIsSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setIsSheetOpen(false);
    setSelectedEquipment(null);
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b border-border/70 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Mantenimiento · Activos</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Equipos</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Registro maestro de activos, estado, criticidad y trazabilidad técnica.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Vistas del activo
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-56">
              {assetViews.map(({ href, label, icon: Icon }) => (
                <DropdownMenuItem key={href} asChild>
                  <Link href={href}>
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button asChild>
            <Link href="/dashboard/mantenimiento/equipos/importar">
              <Upload className="mr-2 h-4 w-4" />
              Importar equipos
            </Link>
          </Button>
        </div>
      </section>

      <EquipmentList onSelectEquipment={handleSelectEquipment} />

      <EquipmentSheet
        equipment={selectedEquipment}
        isOpen={isSheetOpen}
        onClose={handleCloseSheet}
        canEdit={true}
      />
    </div>
  );
}
