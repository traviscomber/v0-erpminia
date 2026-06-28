'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { DocumentUpload } from '@/components/documents/document-upload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DocumentosHSECargarPage() {
  const [uploadedName, setUploadedName] = useState('');

  const handleUploadSuccess = (_documentId: string, fileName: string) => {
    setUploadedName(fileName);
    toast.success('Documento HSE cargado correctamente');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cargar documentos HSE</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Sube evidencia, políticas y procedimientos HSE en una pantalla enfocada solo en la carga.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/sostenibilidad/prevencion-riesgos/documentos-hse">
            <ArrowRight className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-5 w-5" />
            Subir documento HSE
          </CardTitle>
          <CardDescription>
            Carga archivos PDF, Word, Excel o texto y vincúlalos directamente al módulo de prevención.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DocumentUpload module="prevención" category="documentos-hse" onUploadSuccess={handleUploadSuccess} />
          {uploadedName ? (
            <p className="text-sm text-muted-foreground">
              Último archivo cargado: <span className="font-medium text-foreground">{uploadedName}</span>
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
