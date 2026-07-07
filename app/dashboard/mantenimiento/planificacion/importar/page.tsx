'use client';

import Link from 'next/link';
import { useRef, useState, type DragEvent } from 'react';
import { AlertCircle, ArrowLeft, Download, Loader2, Upload } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type ImportResult = {
  success: boolean;
  message: string;
  inserted?: number;
  updated?: number;
  skipped?: number;
  total?: number;
  issues?: string[];
  error?: string;
};

function buildTemplateCsv() {
  const headers = [
    'ASSET_CODE',
    'TASK_NAME',
    'DESCRIPTION',
    'FREQUENCY_DAYS',
    'FREQUENCY_HOURS',
    'LAST_EXECUTED_DATE',
    'NEXT_SCHEDULED_DATE',
    'ESTIMATED_DURATION_HOURS',
    'PRIORITY',
    'ENABLED',
  ];

  const rows = [
    ['CAM-001', 'Cambio de aceite', 'Revisar y reemplazar aceite del sistema', '30', '', '2026-06-01', '', '2', 'high', 'true'],
    ['PMP-004', 'Inspeccion general', 'Inspeccion visual y pruebas operativas', '15', '', '', '2026-07-12', '1.5', 'medium', 'true'],
  ];

  return [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';'))
    .join('\n');
}

export default function PreventivePlanImportPage() {
  const [dragActive, setDragActive] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const blob = new Blob([buildTemplateCsv()], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'plantilla-planificacion-preventiva.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const uploadFile = async (file: File) => {
    const valid = file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.xls') || file.name.toLowerCase().endsWith('.xlsx');
    if (!valid) {
      setResult({ success: false, message: 'Solo aceptamos CSV, XLS o XLSX', error: 'Formato no valido' });
      return;
    }

    setIsImporting(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/maintenance/preventive/import', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo importar la planificacion');
      }

      setResult({
        success: true,
        message: payload?.message || 'Importacion completada',
        inserted: payload?.inserted || 0,
        updated: payload?.updated || 0,
        skipped: payload?.skipped || 0,
        total: payload?.total || 0,
        issues: Array.isArray(payload?.issues) ? payload.issues : [],
      });
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'No se pudo importar la planificacion',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) await uploadFile(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Importar planificacion preventiva</h1>
          <p className="mt-2 text-muted-foreground">
            Carga o actualiza programaciones desde CSV/XLS/XLSX para mantener la planificación al día.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/dashboard/mantenimiento/planificacion">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Cargar archivo</CardTitle>
            <CardDescription>Usa la plantilla para crear o actualizar schedules.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              className={`rounded-xl border-2 border-dashed p-8 text-center transition ${
                dragActive ? 'border-primary bg-primary/5' : 'border-border bg-card/50'
              }`}
            >
              <Upload className="mx-auto h-8 w-8 text-primary" />
              <p className="mt-3 text-sm font-medium">Arrastra aquí tu archivo o selecciona uno desde el equipo</p>
              <p className="mt-1 text-xs text-muted-foreground">Se actualiza por activo + tarea + frecuencia.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  className="gap-2"
                >
                  {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Seleccionar archivo
                </Button>
                <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                  <Download className="h-4 w-4" />
                  Descargar plantilla
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xls,.xlsx"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadFile(file);
                }}
              />
            </div>

            {result ? (
              result.success ? (
                <Alert className="border-secondary/30 bg-secondary/5">
                  <AlertDescription className="space-y-1">
                    <p className="font-medium text-foreground">{result.message}</p>
                    <p className="text-sm text-muted-foreground">
                      Insertados: {result.inserted || 0} | Actualizados: {result.updated || 0} | Omitidos: {result.skipped || 0} | Total: {result.total || 0}
                    </p>
                    {result.issues && result.issues.length > 0 ? (
                      <div className="pt-2 text-xs text-muted-foreground">
                        {result.issues.slice(0, 5).map((issue) => (
                          <p key={issue}>{issue}</p>
                        ))}
                      </div>
                    ) : null}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{result.message}</AlertDescription>
                </Alert>
              )
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Columnas esperadas</CardTitle>
            <CardDescription>El archivo puede usar encabezados similares o equivalentes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="font-medium">ASSET_CODE</span> o <span className="font-medium">ASSET_NAME</span></p>
            <p><span className="font-medium">TASK_NAME</span></p>
            <p><span className="font-medium">FREQUENCY_DAYS</span></p>
            <p><span className="font-medium">DESCRIPTION</span></p>
            <p><span className="font-medium">FREQUENCY_HOURS</span></p>
            <p><span className="font-medium">LAST_EXECUTED_DATE</span></p>
            <p><span className="font-medium">NEXT_SCHEDULED_DATE</span></p>
            <p><span className="font-medium">ESTIMATED_DURATION_HOURS</span></p>
            <p><span className="font-medium">PRIORITY</span></p>
            <p><span className="font-medium">ENABLED</span></p>
            <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              El importador busca el activo por código o nombre, y actualiza la programación existente si coincide
              activo, tarea y frecuencia.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
