'use client';

import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RiskMatrixImport } from '@/components/hse/risk-matrix-import';

export default function HSERiskMatrixImportPage() {
  const downloadTemplate = () => {
    const headers = ['TITLE', 'HAZARD', 'LOCATION', 'CONTROL_MEASURE', 'RISK_LEVEL', 'STATUS'];
    const rows = [
      ['Exposición a polvo', 'Polvo en suspensión', 'Mina central', 'Control de ventilación y EPP', 'alta', 'abierto'],
      ['Caída al mismo nivel', 'Superficie resbaladiza', 'Planta', 'Limpieza y señalización', 'media', 'abierto'],
      ['Interacción vehicular', 'Cruce de equipos', 'Frente de carguío', 'Rutas segregadas y señalero', 'crítica', 'en_investigacion'],
    ];

    const csv = [headers, ...rows].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'plantilla-matriz-riesgos-hse.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Importar matriz de riesgos HSE</h1>
          <p className="mt-2 text-muted-foreground">
            Carga o actualiza la matriz de riesgos desde Excel o CSV para mantener control operacional y trazabilidad.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Descargar plantilla
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/hse/riesgos">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a riesgos
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Importacion estandarizada</CardTitle>
          <CardDescription>
            El importador admite CSV, XLS y XLSX. La matriz se actualiza por título y ubicación para evitar duplicados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RiskMatrixImport
            onSuccess={() => {
              window.location.href = '/dashboard/hse/riesgos';
            }}
          />
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Campos esperados</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-2">
          <div className="rounded-lg border p-3">TITLE, HAZARD, LOCATION</div>
          <div className="rounded-lg border p-3">CONTROL_MEASURE, RISK_LEVEL, STATUS</div>
        </CardContent>
      </Card>
    </div>
  );
}
