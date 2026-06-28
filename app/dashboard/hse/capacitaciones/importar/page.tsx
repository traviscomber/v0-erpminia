'use client';

import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HSECapacitacionesImport } from '@/components/hse/hse-capacitaciones-import';

export default function HSECapacitacionesImportPage() {
  const downloadTemplate = () => {
    const headers = ['NOMBRE_CAPACITACION', 'TIPO', 'TEMA', 'PROGRAMA_HSE', 'PROVEEDOR_INSTRUCTOR', 'FECHA_PROGRAMADA'];
    const rows = [
      ['Induccion HSE', 'HSE', 'Seguridad basica', 'Programa 2026', 'Interno', '2026-07-15'],
      ['Trabajo en altura', 'Operacional', 'Proteccion contra caidas', 'Programa 2026', 'Mutual', '2026-07-20'],
    ];
    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plantilla-capacitaciones-hse.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Importar capacitaciones HSE</h1>
          <p className="text-muted-foreground">
            Sube tu archivo Excel para crear o actualizar capacitaciones ya registradas.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Plantilla Excel
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/hse/capacitaciones">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Como funciona</CardTitle>
          <CardDescription>
            Cada fila debe traer al menos nombre y fecha programada. Si ya existe una capacitación similar, se actualiza.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          El importador acepta CSV, XLS y XLSX para mantener el flujo compatible con cargas de terreno o archivos exportados desde Excel.
        </CardContent>
      </Card>

      <HSECapacitacionesImport />
    </div>
  );
}
