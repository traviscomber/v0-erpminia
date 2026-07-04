'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, FileText } from 'lucide-react';
import { DocumentUpload } from '@/components/documents/document-upload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function HseDocumentosImportarPage() {
  const [uploadedName, setUploadedName] = useState('');

  const handleUploadSuccess = (_documentId: string, fileName: string) => {
    setUploadedName(fileName);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Importar documentos HSE</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Ruta dedicada para cargar politicas, procedimientos, instructivos y respaldos del modulo HSE.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/hse/documentos">
            <ArrowRight className="mr-2 h-4 w-4" />
            Volver a documentos HSE
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Subir documento HSE
          </CardTitle>
          <CardDescription>
            Acepta PDF, Word y Excel. El archivo queda asociado al modulo HSE para revision y trazabilidad.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DocumentUpload module="hse" category="documentos" onUploadSuccess={handleUploadSuccess} />
          {uploadedName ? (
            <div className="rounded-lg border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              Ultimo archivo cargado: <span className="font-medium text-foreground">{uploadedName}</span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Uso recomendado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Usa esta ruta para centralizar la carga documental de seguridad, salud ocupacional y ambiente.</p>
          <p>Si necesitas importar datos tabulares, usa los importadores propios de incidentes, riesgos, EPP o capacitaciones.</p>
        </CardContent>
      </Card>
    </div>
  );
}
