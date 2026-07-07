'use client';

import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EppImport } from '@/components/hse/epp-import';

export default function HseEppImportPage() {
  const downloadTemplate = () => {
    const headers = [
      'CARGO_PUESTO',
      'ELEMENTO_EPP',
      'CANTIDAD_ELEMENTO',
      'MARCA_MODELO',
      'FICHA_TECNICA_URL',
      'FRECUENCIA_REEMPLAZO',
      'ACTIVO',
    ];

    const rows = [
      ['Operador mina', 'Casco con barbiquejo', '1', 'Norma minera', '', '12 meses', 'si'],
      ['Operador mina', 'Lentes de seguridad', '1', 'Uvex', '', '12 meses', 'si'],
      ['Mecanico mina', 'Guantes anticorte', '2', 'Ansell', '', '6 meses', 'si'],
      ['Perforista', 'Protección auditiva', '1', '3M', '', '12 meses', 'si'],
      ['Operador de planta', 'Respirador P100', '1', '3M', '', '3 meses', 'si'],
    ];

    const csv = [headers, ...rows].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'plantilla-hse-epp.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Importar EPP HSE</h1>
          <p className="mt-2 text-muted-foreground">
            Carga la matriz de EPP minera desde Excel o CSV para mantener alineados cargos, tareas y elementos de proteccion.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Descargar plantilla
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/hse/epp">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a EPP
            </Link>
          </Button>
        </div>
      </div>

      <EppImport
        onSuccess={() => {
          window.location.href = '/dashboard/hse/epp';
        }}
      />

      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Campos esperados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="rounded-lg border p-3">CARGO_PUESTO, ELEMENTO_EPP, CANTIDAD_ELEMENTO</div>
          <div className="rounded-lg border p-3">MARCA_MODELO, FICHA_TECNICA_URL</div>
          <div className="rounded-lg border p-3">FRECUENCIA_REEMPLAZO, ACTIVO</div>
        </CardContent>
      </Card>
    </div>
  );
}
