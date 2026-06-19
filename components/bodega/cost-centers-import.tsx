'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface ImportResult {
  success: boolean;
  message: string;
  imported?: number;
  error?: string;
}

export function CostCentersImportComponent() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const fileName = file.name.toLowerCase();
    const isCsv = fileName.endsWith('.csv');
    const isExcel = fileName.endsWith('.xls') || fileName.endsWith('.xlsx');

    if (!isCsv && !isExcel) {
      setResult({
        success: false,
        message: 'Solo aceptamos archivos CSV, XLS o XLSX',
        error: 'Tipo de archivo no válido',
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/bodega/import-cost-centers', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: data.message,
          imported: data.imported,
        });
      } else {
        setResult({
          success: false,
          message: 'No se pudieron importar los centros de costo',
          error: data.error || 'Error desconocido',
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Error al subir el archivo',
        error: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar centros de costo
          </CardTitle>
          <CardDescription>
            Sube tu archivo CSV, XLS o XLSX con la estructura de centros de costo (minas y áreas).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="font-semibold text-foreground">
              Arrastra tu archivo o haz clic para seleccionar
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Formato: CSV, XLS o XLSX
            </p>

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

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="mb-2 font-semibold">Formato requerido:</p>
              <p className="text-sm">Tu archivo debe tener estas columnas:</p>
              <div className="mt-2 rounded bg-muted p-2 font-mono text-sm">
                CÓDIGO REC ELEC | NOMBRE | RUTA COMPLETA | CREADOR POR | FECHA DE CREACIÓN | NOTAS
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                La RUTA COMPLETA debe usar " &gt; " para indicar la jerarquía
                {' '}
                (ej: Mina Peumo &gt; Perforación)
              </p>
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
                {result.imported ? (
                  <p className="mt-1 text-sm">{result.imported} centros de costo importados</p>
                ) : null}
                {result.error ? <p className="mt-1 text-sm text-red-700">{result.error}</p> : null}
              </AlertDescription>
            </Alert>
          )}

          {isLoading && (
            <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Procesando archivo...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
