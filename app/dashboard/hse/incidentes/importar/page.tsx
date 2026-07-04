'use client';

import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { IncidentsImport } from '@/components/hse/incidents-import';

export default function HseIncidentsImportPage() {
  const downloadTemplate = () => {
    const headers = ['TITLE', 'DESCRIPTION', 'SEVERITY', 'STATUS', 'DATE_REPORTED', 'LOCATION'];
    const rows = [
      ['Caida menor en rampa', 'Resbalon sin lesion grave', 'media', 'abierto', '2026-06-27', 'Mina central'],
      ['Falla de bloqueo', 'Se detecta bloqueo incompleto en area critica', 'alta', 'en_investigacion', '2026-06-26', 'Taller principal'],
      ['Detencion por derrame', 'Derrame controlado y limpieza realizada', 'baja', 'cerrado', '2026-06-25', 'Planta'],
    ];

    const csv = [headers, ...rows].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'plantilla-hse-incidentes.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Importar incidentes HSE</h1>
          <p className="mt-2 text-muted-foreground">
            Carga incidentes operacionales desde Excel o CSV para actualizar el registro y mantener la trazabilidad al dia.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Descargar plantilla
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/hse/incidentes">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a incidentes
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Importacion estandarizada</CardTitle>
          <CardDescription>
            El archivo puede venir en CSV, XLS o XLSX. El sistema crea o actualiza incidentes segun titulo, fecha y ubicacion.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <IncidentsImport onSuccess={() => {
            window.location.href = '/dashboard/hse/incidentes';
          }} />
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Campos esperados</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-2">
          <div className="rounded-lg border p-3">TITLE, DESCRIPTION, SEVERITY</div>
          <div className="rounded-lg border p-3">STATUS, DATE_REPORTED, LOCATION</div>
        </CardContent>
      </Card>
    </div>
  );
}
