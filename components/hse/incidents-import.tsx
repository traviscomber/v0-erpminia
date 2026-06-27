'use client';

import { useRef, useState, type DragEvent } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Upload } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Result = {
  success: boolean;
  message: string;
  imported?: number;
  updated?: number;
  error?: string;
};

type IncidentsImportProps = {
  onSuccess?: () => void;
};

export function IncidentsImport({ onSuccess }: IncidentsImportProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const name = file.name.toLowerCase();
    const valid = name.endsWith('.csv') || name.endsWith('.xls') || name.endsWith('.xlsx');

    if (!valid) {
      setResult({
        success: false,
        message: 'Solo aceptamos archivos CSV, XLS o XLSX',
        error: 'Tipo de archivo no valido',
      });
      return;
    }

    setIsImporting(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/hse/incidents/import', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setResult({
          success: false,
          message: 'No se pudieron importar los incidentes',
          error: payload.error || 'Error desconocido',
        });
        return;
      }

      setResult({
        success: true,
        message: payload.message || 'Incidentes importados correctamente',
        imported: payload.imported,
        updated: payload.updated,
      });
      onSuccess?.();
    } catch (error) {
      setResult({
        success: false,
        message: 'Error al subir el archivo',
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <Card className="border-[var(--secondary)]/25 bg-[var(--secondary)]/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Upload className="h-5 w-5" />
          Importar incidentes desde Excel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
            dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="font-semibold text-foreground">Arrastra tu archivo o haz clic para seleccionar</p>
          <p className="mt-1 text-sm text-muted-foreground">Formato: CSV, XLS o XLSX</p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xls,.xlsx"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
            className="hidden"
          />
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="mb-2 font-semibold">Columnas esperadas:</p>
            <div className="rounded bg-muted p-2 font-mono text-sm">
              TITLE | DESCRIPTION | SEVERITY | STATUS | DATE_REPORTED | LOCATION
            </div>
          </AlertDescription>
        </Alert>

        {result && (
          <Alert className={result.success ? 'border-green-500' : 'border-red-500'}>
            {result.success ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription>
              <p className={result.success ? 'font-semibold text-green-900' : 'font-semibold text-red-900'}>
                {result.message}
              </p>
              {result.imported !== undefined ? <p className="mt-1 text-sm">Importados: {result.imported}</p> : null}
              {result.updated !== undefined ? <p className="text-sm">Actualizados: {result.updated}</p> : null}
              {result.error ? <p className="mt-1 text-sm text-red-700">{result.error}</p> : null}
            </AlertDescription>
          </Alert>
        )}

        {isImporting && (
          <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Procesando archivo...
          </div>
        )}

        <Button variant="outline" className="w-full" type="button" onClick={() => fileInputRef.current?.click()}>
          Seleccionar archivo Excel
        </Button>
      </CardContent>
    </Card>
  );
}
