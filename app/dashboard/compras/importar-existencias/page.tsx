'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, CheckCircle2, FileSpreadsheet, Loader2, Upload, Warehouse, Users } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type ImportResult = {
  success: boolean;
  message: string;
  suppliersImported?: number;
  stockImported?: number;
  purchasesImported?: number;
  error?: string;
  details?: string;
};

export default function ImportarExistenciasPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.xls') && !lowerName.endsWith('.xlsx')) {
      setResult({
        success: false,
        message: 'Solo aceptamos archivos XLS o XLSX',
        error: 'Tipo de archivo no valido',
      });
      return;
    }

    setLoading(true);
    setResult(null);

    const applyResponse = async (response: Response) => {
      const rawBody = await response.text();
      const payload = rawBody ? (() => {
        try {
          return JSON.parse(rawBody);
        } catch {
          return null;
        }
      })() : null;

      if (response.ok) {
        setResult({
          success: true,
          message: payload?.message || 'Excel importado correctamente',
          suppliersImported: payload?.suppliersImported,
          stockImported: payload?.stockImported,
          purchasesImported: payload?.purchasesImported,
        });
      } else {
        setResult({
          success: false,
          message: 'No se pudo importar el Excel',
          error: payload?.error || 'Error desconocido',
          details: payload?.details || rawBody || undefined,
        });
      }
    };

    try {
      // Split the file into 3MB chunks and upload each one through the server.
      // The server uses Blob SDK, so we avoid CORS issues and payload limits.
      const CHUNK_SIZE = 3 * 1024 * 1024; // 3 MB per chunk
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const chunkUrls: { url: string; index: number }[] = [];

      for (let i = 0; i < totalChunks; i++) {
        setResult({
          success: false,
          message: totalChunks === 1
            ? 'Subiendo archivo...'
            : `Subiendo parte ${i + 1} de ${totalChunks}...`,
        });

        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunkBlob = file.slice(start, end);

        const fd = new FormData();
        fd.append('chunk', chunkBlob, file.name);
        fd.append('index', String(i));
        fd.append('total', String(totalChunks));
        fd.append('fileId', fileId);

        const res = await fetch('/api/compras/import-existencias/chunk', {
          method: 'POST',
          body: fd,
        });

        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(err.error || `Error subiendo parte ${i + 1}`);
        }

        const data = (await res.json()) as { url: string; index: number };
        chunkUrls.push(data);
      }

      setResult({ success: false, message: 'Importando datos...' });

      // Tell the server to assemble chunks and run the import
      const response = await fetch('/api/compras/import-existencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chunks: chunkUrls.sort((a, b) => a.index - b.index),
          fileName: file.name,
        }),
      });

      await applyResponse(response);
    } catch (error) {
      setResult({
        success: false,
        message: 'Error al subir el archivo',
        error: String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Importar existencias</h1>
          <p className="mt-2 text-muted-foreground">
            Carga proveedores, stock min-max y compras desde el Excel y dejalos en el lugar correcto del sistema.
          </p>
        </div>
        <Link href="/dashboard/compras">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver a compras
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-primary" />
              Proveedores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Se importan a la tabla real de proveedores.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Warehouse className="h-4 w-4 text-primary" />
              Stock min-max
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Se cargan como stock operativo con nivel minimo y reorden.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              Compras
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Se agrupan por numero de documento para trazabilidad.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar archivo
          </CardTitle>
          <CardDescription>
            El proceso es transaccional y vuelve a cargar los registros de esta fuente sin vaciar el resto del sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="cursor-pointer rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/60 hover:bg-primary/5"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="font-semibold">Haz clic para seleccionar el Excel</p>
            <p className="mt-1 text-sm text-muted-foreground">Formato admitido: XLS o XLSX</p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xls,.xlsx"
              onChange={(event) => {
                if (event.target.files?.[0]) {
                  handleFile(event.target.files[0]);
                }
              }}
              className="hidden"
            />
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="mb-2 font-semibold">Que hace esta importacion</p>
              <ul className="list-inside list-disc space-y-1">
                <li>Hoja Proveedores: llena o actualiza el maestro de proveedores.</li>
                <li>Hoja Stock min-max: alimenta el inventario operativo con umbrales reales.</li>
                <li>Hoja Compras: agrupa por numero de documento y deja el historial listo para analisis.</li>
              </ul>
            </AlertDescription>
          </Alert>

          {loading && (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Procesando archivo...
            </div>
          )}

          {result && (
            <Alert className={result.success ? 'border-green-500' : 'border-destructive'}>
              {result.success ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
              <AlertDescription>
                <p className={result.success ? 'font-semibold text-green-900' : 'font-semibold text-destructive'}>
                  {result.message}
                </p>
                {result.success && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="secondary">Proveedores: {result.suppliersImported || 0}</Badge>
                    <Badge variant="secondary">Stock: {result.stockImported || 0}</Badge>
                    <Badge variant="secondary">Compras: {result.purchasesImported || 0}</Badge>
                  </div>
                )}
                {result.error ? <p className="mt-2 text-sm text-destructive">{result.error}</p> : null}
                {result.details ? <p className="mt-1 text-xs text-muted-foreground">{result.details}</p> : null}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
