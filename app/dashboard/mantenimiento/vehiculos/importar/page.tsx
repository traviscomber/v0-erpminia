'use client';

import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AssetImport } from '@/components/mantenimiento/asset-import';

export default function VehiclesImportPage() {
  const downloadTemplate = () => {
    const headers = [
      'ASSET_CODE',
      'ASSET_NAME',
      'ASSET_TYPE',
      'LOCATION',
      'STATUS',
      'MANUFACTURER',
      'MODEL',
      'SERIAL_NUMBER',
      'CRITICALITY',
      'MTBF_HOURS',
      'ACQUISITION_COST',
    ];

    const rows = [
      ['VH-001', 'Camion CAEX 1', 'vehiculo', 'Patio mina', 'operativo', 'Volvo', 'A40G', 'SN-001', 'alta', '1200', '250000000'],
      ['VH-002', 'Pickup supervision', 'vehiculo liviano', 'Base operativa', 'operativo', 'Toyota', 'Hilux', 'SN-002', 'media', '1800', '45000000'],
      ['VH-003', 'Bus personal', 'vehiculo', 'Campamento', 'mantenimiento', 'Mercedes', 'Sprinter', 'SN-003', 'alta', '1600', '85000000'],
    ];

    const csv = [headers, ...rows].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'plantilla-vehiculos-mantenimiento.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Importar vehículos de mantenimiento</h1>
          <p className="mt-2 text-muted-foreground">
            Carga la flota operativa desde Excel o CSV para mantener el inventario y el arbol de fallas actualizados.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Descargar plantilla
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/mantenimiento/vehiculos">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a vehículos
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Importación estandarizada</CardTitle>
          <CardDescription>
            El archivo puede venir en CSV, XLS o XLSX. El alta o actualizacion se hace por `ASSET_CODE`.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AssetImport
            onSuccess={() => {
              window.location.href = '/dashboard/mantenimiento/vehiculos';
            }}
          />
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Campos esperados</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-2">
          <div className="rounded-lg border p-3">ASSET_CODE, ASSET_NAME, ASSET_TYPE</div>
          <div className="rounded-lg border p-3">LOCATION, STATUS, MANUFACTURER, MODEL</div>
          <div className="rounded-lg border p-3">SERIAL_NUMBER, CRITICALITY</div>
          <div className="rounded-lg border p-3">MTBF_HOURS, ACQUISITION_COST</div>
        </CardContent>
      </Card>
    </div>
  );
}
