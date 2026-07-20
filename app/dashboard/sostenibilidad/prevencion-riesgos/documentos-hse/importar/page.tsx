'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { DocumentUpload } from '@/components/documents/document-upload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DocumentosHSEImportarPage() {
  const [uploadedName, setUploadedName] = useState('');

  const handleUploadSuccess = (_documentId: string, fileName: string) => {
    setUploadedName(fileName);
    toast.success('Documento HSE cargado correctamente');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Importar documentos HSE</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Carga evidencia, políticas, procedimientos y matrices HSE en una pantalla dedicada al ingreso documental.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/sostenibilidad/prevencion-riesgos/documentos-hse">
              <ArrowRight className="mr-2 h-4 w-4" />
              Volver
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-5 w-5" />
            Subir documento HSE
          </CardTitle>
          <CardDescription>
            Acepta PDF, Word y Excel. El archivo queda vinculado directamente al módulo de prevención y categoría `documentos-hse`.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DocumentUpload module="prevencion" category="documentos-hse" onUploadSuccess={handleUploadSuccess} />
          {uploadedName ? (
            <p className="text-sm text-muted-foreground">
              Ultimo archivo cargado: <span className="font-medium text-foreground">{uploadedName}</span>
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Download className="h-4 w-4" />
            Alcance del importador
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Usa el mismo flujo real de documentos que ya ocupa el módulo principal.</p>
          <p>Sirve para cargar políticas, procedimientos, instructivos, programas y planillas Excel de soporte HSE.</p>
          <p>La ruta antigua `cargar` sigue funcionando y redirige aquí para no romper accesos existentes.</p>
        </CardContent>
      </Card>
    </div>
  );
}
