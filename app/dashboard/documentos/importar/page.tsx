'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, FileText } from 'lucide-react';
import { DocumentUploadModal } from '@/components/documents/document-upload-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DocumentosImportarPage() {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [lastDocumentId, setLastDocumentId] = useState('');

  useEffect(() => {
    if (!open) {
      router.replace('/dashboard/documentos');
    }
  }, [open, router]);

  const handleSuccess = (documentId: string) => {
    setLastDocumentId(documentId);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Importar documentos</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Ruta canonica para cargar documentos al hub general y mantener la gestion documental accesible fuera del modal interno.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/documentos">
            <ArrowRight className="mr-2 h-4 w-4" />
            Volver a documentos
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Carga documental central
          </CardTitle>
          <CardDescription>
            Usa el mismo flujo del panel central para registrar documentos con metadata, categoria y centro de costo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>El formulario se abre automaticamente al entrar a esta ruta.</p>
          <p>Sirve para mantener una entrada estable y compartible hacia la carga documental del sistema.</p>
          {lastDocumentId ? (
            <div className="rounded-lg border border-border/70 bg-muted/30 px-4 py-3">
              Ultimo documento cargado: <span className="font-medium text-foreground">{lastDocumentId}</span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <DocumentUploadModal
        open={open}
        onOpenChange={setOpen}
        organizationId=""
        onSuccess={handleSuccess}
      />
    </div>
  );
}
