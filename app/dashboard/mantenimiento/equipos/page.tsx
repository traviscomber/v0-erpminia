'use client';

import { useState } from 'react';
import { Plus, Upload } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EquipmentList } from '@/components/maintenance/equipment-list';
import { EquipmentSheet } from '@/components/maintenance/equipment-sheet';

interface Equipment {
  id: string;
  code: string;
  name: string;
  model: string;
  serial_number: string;
  type: string;
  status: string;
  criticality: string;
  location: string;
  purchase_date: string | null;
  last_maintenance: string | null;
  next_maintenance: string | null;
  specs: Record<string, any> | null;
}

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Equipos</h1>
          <p className="text-muted-foreground">
            Gestiona el registro técnico de todos los equipos con seguimiento de mantenimiento preventivo
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/mantenimiento/equipos/importar">
              <Upload className="mr-2 h-4 w-4" />
              Importar
            </Link>
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Equipo
          </Button>
        </div>
      </div>

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
