'use client';

import Link from 'next/link';
import { ArrowLeft, Download, Truck } from 'lucide-react';
import { MaquinariaImport } from '@/components/maquinaria/machinery-import';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function MaquinariaImportarPage() {
  const downloadTemplate = () => {
    const headers = ['codigo', 'nombre', 'estado', 'descripcion', 'modelo', 'patente', 'anio'];
    const exampleRows = [
      ['8-1', 'Camioneta Ford Ranger', 'activo', 'Unidad de apoyo mina', 'Ford Ranger', 'ABC123', '2024'],
      ['9-2', 'Camion Iveco Tector', 'activo', 'Camion de transporte interno', 'Iveco Tector', 'JJK567', '2023'],
      ['16-3', 'Equipo de sondaje', 'activo', 'Sondaje operativo de turno', 'Boart Longyear LF90', '', '2022'],
    ];

    const csv = [headers, ...exampleRows].map((row) => row.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'plantilla_maquinaria.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Importar maquinaria y vehiculos</h1>
          <p className="mt-2 text-muted-foreground">
            Carga el maestro operativo desde Excel o CSV para mantener flota, equipos, modelos y estado al dia.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Descargar plantilla
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/maquinaria">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a maquinaria
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Importacion estandarizada de flota
          </CardTitle>
          <CardDescription>
            Acepta CSV, XLS y XLSX. La actualizacion se realiza por codigo para evitar duplicados y mantener trazabilidad.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MaquinariaImport
            onSuccess={() => {
              window.location.href = '/dashboard/maquinaria';
            }}
          />
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle>Columnas esperadas</CardTitle>
          <CardDescription>
            Usa el mismo orden de la plantilla o al menos conserva estos encabezados para que la importacion pueda normalizar la data.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
          <div>`codigo`: identificador unico en formato familia-item</div>
          <div>`nombre`: nombre operativo del equipo o vehiculo</div>
          <div>`estado`: activo, inactivo o equivalente operacional</div>
          <div>`descripcion`: detalle de uso o asignacion</div>
          <div>`modelo`: modelo comercial del activo</div>
          <div>`patente`: patente o serie si aplica</div>
          <div>`anio`: ano del activo</div>
        </CardContent>
      </Card>
    </div>
  );
}
