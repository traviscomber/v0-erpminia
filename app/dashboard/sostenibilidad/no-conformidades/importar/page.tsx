'use client';

import Link from 'next/link';
import { useRef, useState, type DragEvent } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Download, Loader2, Upload } from 'lucide-react';
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

export default function NonconformancesImportPage() {
  const [dragActive, setDragActive] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const headers = ['TITLE', 'DESCRIPTION', 'CATEGORY', 'SEVERITY', 'SOURCE', 'DISCOVERED_DATE', 'ROOT_CAUSE', 'IMPACT_DESCRIPTION', 'TARGET_CLOSURE_DATE', 'STATUS'];
    const rows = [
      ['Hallazgo en planta', 'Falta de señalización', 'safety', 'medium', 'internal_audit', '2026-06-27', 'Desconocimiento', 'Riesgo de atropello', '2026-07-10', 'open'],
      ['Desvío ambiental', 'Acopio inadecuado', 'environment', 'high', 'inspection', '2026-06-27', 'Capacitación insuficiente', 'Posible sanción', '2026-07-05', 'open'],
    ];
    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla-no-conformidades.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const uploadFile = async (file: File) => {
    const name = file.name.toLowerCase();
    const valid = name.endsWith('.csv') || name.endsWith('.xls') || name.endsWith('.xlsx');
    if (!valid) {
      setResult({ success: false, message: 'Solo aceptamos CSV, XLS o XLSX', error: 'Formato no valido' });
      return;
    }

    setIsImporting(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/sostenibilidad/nonconformances', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setResult({
          success: false,
          message: 'No se pudieron importar las no conformidades',
          error: payload.error || 'Error desconocido',
        });
        return;
      }

      setResult({
        success: true,
        message: payload.message || 'No conformidades importadas correctamente',
        imported: payload.imported,
        updated: payload.updated,
      });
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
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Importar no conformidades</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Sube hallazgos y desvíos desde Excel para generar trazabilidad de cierre y acciones correctivas.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Plantilla Excel
          </Button>
          <Button asChild>
            <Link href="/dashboard/sostenibilidad/no-conformidades">
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
            Cargar archivo
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
            <p className="font-semibold">Arrastra tu archivo o haz clic para seleccionar</p>
            <p className="mt-1 text-sm text-muted-foreground">Formato: CSV, XLS o XLSX</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xls,.xlsx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadFile(file);
              }}
            />
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="mb-2 font-semibold">Columnas esperadas:</p>
              <div className="rounded bg-muted p-2 font-mono text-sm">
                TITLE | DESCRIPTION | CATEGORY | SEVERITY | SOURCE | DISCOVERED_DATE | ROOT_CAUSE | IMPACT_DESCRIPTION | TARGET_CLOSURE_DATE | STATUS
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                DISCOVERED_DATE y TARGET_CLOSURE_DATE aceptan fechas de Excel o texto en formato YYYY-MM-DD, DD/MM/YYYY o DD-MM-YYYY.
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
                {result.imported !== undefined ? <p className="mt-1 text-sm">Importadas: {result.imported}</p> : null}
                {result.updated !== undefined ? <p className="mt-1 text-sm">Actualizadas: {result.updated}</p> : null}
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
    </div>
  );
}
