'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, FileCheck2 } from 'lucide-react';
import { DocumentUpload } from '@/components/documents/document-upload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function PermisosLicenciasImportarPage() {
  const [uploadedName, setUploadedName] = useState('');

  const handleUploadSuccess = (_documentId: string, fileName: string) => {
    setUploadedName(fileName);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Importar permisos y licencias</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Ruta dedicada para cargar permisos, licencias, patentes, resoluciones y autorizaciones del módulo legal.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/legal/importar">Importador general</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/legal/permisos-licencias">
              <ArrowRight className="mr-2 h-4 w-4" />
              Volver a permisos
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck2 className="h-5 w-5" />
            Subir documento legal
          </CardTitle>
          <CardDescription>
            Acepta PDF, Word y Excel. El archivo queda registrado dentro del módulo legal para su revisión y seguimiento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DocumentUpload module="legal" category="documentos" onUploadSuccess={handleUploadSuccess} />
          {uploadedName ? (
            <div className="rounded-lg border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              Último archivo cargado: <span className="font-medium text-foreground">{uploadedName}</span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Uso recomendado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Usa esta ruta cuando el archivo corresponda a permisos, licencias, patentes, resoluciones o autorizaciones regulatorias.</p>
          <p>Si además necesitas cargar contratos o lotes tabulares, usa el importador general de legal.</p>
        </CardContent>
      </Card>
    </div>
  );
}
