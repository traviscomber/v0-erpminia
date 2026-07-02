'use client';

import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InvestigationsImport } from '@/components/hse/investigations-import';

export default function HSEInvestigacionesImportPage() {
  const downloadTemplate = () => {
    const headers = ['INCIDENT_ID', 'ROOT_CAUSE', 'CORRECTIVE_ACTIONS', 'ASSIGNED_TO', 'TARGET_DATE', 'SEVERITY', 'STATUS', 'EVIDENCE'];
    const rows = [
      ['INC-001', 'Falta de procedimiento', 'Actualizar procedimiento y capacitar', 'Supervisor HSE', '2026-07-15', 'alta', 'abierto', 'Informe interno'],
      ['INC-002', 'Condicion insegura', 'Instalar barrera fisica', 'Jefe de turno', '2026-07-20', 'media', 'en_proceso', 'Fotografias'],
    ];
    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plantilla-investigaciones-hse.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Importar investigaciones HSE</h1>
          <p className="text-muted-foreground">Sube tu archivo Excel para crear o actualizar investigaciones ya registradas.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Plantilla Excel
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/hse/investigaciones">
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
            Cada fila debe traer al menos `INCIDENT_ID` y `ROOT_CAUSE`. Si ya existe una investigacion similar, se actualiza.
            </CardDescription>
        </CardHeader>
      </Card>

      <InvestigationsImport />
    </div>
  );
}
