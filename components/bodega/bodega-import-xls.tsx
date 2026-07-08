'use client';

import { useState, useRef } from 'react';
import { Upload, AlertCircle, CheckCircle2, Loader2, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface UploadResult {
  success: boolean;
  message: string;
  error?: string;
  fileName?: string;
}

export function BodegaImportXls() {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.xls') && !file.name.endsWith('.xlsx')) {
      setResult({
        success: false,
        message: 'Solo se aceptan archivos .csv, .xls y .xlsx',
        error: 'Tipo de archivo invalido',
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const timestamp = Date.now();
      const fileName = `bodega-import-${timestamp}-${file.name}`;

      const { error } = await supabase.storage.from('documents').upload(`bodega-imports/${fileName}`, file);

      if (error) {
        throw error;
      }

      supabase.storage.from('documents').getPublicUrl(`bodega-imports/${fileName}`);

      setResult({
        success: true,
        message: `Archivo "${file.name}" subido exitosamente a bodega/importaciones`,
        fileName,
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('[v0] Error uploading file:', error);
      setResult({
        success: false,
        message: 'Error al subir el archivo',
        error: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subir inventario</CardTitle>
        <CardDescription>Carga tu archivo de inventario (CSV, XLS o XLSX) a la bodega</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            <p className="mb-2 font-semibold">Formato requerido:</p>
            <p className="text-sm">Tu archivo debe contener estas columnas:</p>
            <div className="mt-2 rounded bg-muted p-2 font-mono text-sm">
              SKU | Nombre | Cantidad | Ubicacion | Proveedor
            </div>
          </AlertDescription>
        </Alert>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`rounded-lg border-2 border-dashed p-8 text-center transition ${
            isDragging ? 'border-primary bg-primary/10' : 'border-muted-foreground/25 bg-muted/30 hover:border-primary/50'
          }`}
        >
          <Upload className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="mb-1 font-semibold">Arrastra tu archivo aquí</p>
          <p className="mb-3 text-sm text-muted-foreground">o haz clic para seleccionar</p>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Subiendo...
              </>
            ) : (
              'Seleccionar archivo'
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xls,.xlsx"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleFile(e.target.files[0]);
              }
            }}
            className="hidden"
          />
        </div>

        {result && (
          <Alert variant={result.success ? 'default' : 'destructive'}>
            <div className="flex items-start gap-3">
              {result.success ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-500" /> : <AlertCircle className="mt-0.5 h-4 w-4" />}
              <div className="space-y-1">
                <p className="font-semibold">{result.message}</p>
                {result.error && <p className="text-sm text-destructive">{result.error}</p>}
              </div>
            </div>
          </Alert>
        )}

        <div className="space-y-3 rounded-lg bg-muted/50 p-4">
          <p className="text-sm font-semibold">Pasos:</p>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li>1. Prepara tu archivo CSV/XLS con las columnas requeridas</li>
            <li>2. Arrastra el archivo aquí o haz clic para seleccionar</li>
            <li>3. El archivo se guardará en `bodega/importaciones/`</li>
            <li>4. Puedes descargar y procesar los datos según necesites</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
