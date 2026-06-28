'use client';

import { useRef, useState, type DragEvent } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Upload } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type ImportResult = {
  success: boolean;
  message: string;
  imported?: number;
  updated?: number;
  error?: string;
};

type HSECapacitacionesImportProps = {
  onSuccess?: () => void;
};

export function HSECapacitacionesImport({ onSuccess }: HSECapacitacionesImportProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportFile = async (file: File) => {
    const name = file.name.toLowerCase();
    const valid = name.endsWith('.csv') || name.endsWith('.xls') || name.endsWith('.xlsx');

    if (!valid) {
      setImportResult({
        success: false,
        message: 'Solo aceptamos archivos CSV, XLS o XLSX',
        error: 'Tipo de archivo no valido',
      });
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/hse/capacitaciones', {
        method: 'POST',
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setImportResult({
          success: false,
          message: 'No se pudo importar capacitaciones HSE',
          error: payload.error || 'Error desconocido',
        });
        return;
      }

      setImportResult({
        success: true,
        message: payload.message || 'Capacitaciones HSE importadas correctamente',
        imported: payload.imported,
        updated: payload.updated,
      });
      onSuccess?.();
    } catch (error) {
      setImportResult({
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
    if (file) handleImportFile(file);
  };

  return (
    <Card className="border-[var(--secondary)]/25 bg-[var(--secondary)]/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Upload className="h-5 w-5" />
          Importar capacitaciones HSE desde Excel
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
              if (file) handleImportFile(file);
            }}
            className="hidden"
          />
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="mb-2 font-semibold">Columnas esperadas:</p>
            <div className="rounded bg-muted p-2 font-mono text-sm">
              NOMBRE_CAPACITACION | TIPO | TEMA | PROGRAMA_HSE | PROVEEDOR_INSTRUCTOR | FECHA_PROGRAMADA
            </div>
          </AlertDescription>
        </Alert>

        {importResult && (
          <Alert className={importResult.success ? 'border-green-500' : 'border-red-500'}>
            {importResult.success ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription>
              <p className={importResult.success ? 'font-semibold text-green-900' : 'font-semibold text-red-900'}>
                {importResult.message}
              </p>
              {importResult.imported !== undefined ? <p className="mt-1 text-sm">Importadas: {importResult.imported}</p> : null}
              {importResult.updated !== undefined ? <p className="text-sm">Actualizadas: {importResult.updated}</p> : null}
              {importResult.error ? <p className="mt-1 text-sm text-red-700">{importResult.error}</p> : null}
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
