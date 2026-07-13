'use client';

import Link from 'next/link';
import { useRef, useState, type DragEvent } from 'react';
import { AlertCircle, ArrowLeft, Download, Loader2, Upload } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type ImportPreviewItem = {
  work_order_number: string;
  asset_code: string | null;
  action: 'update_order' | 'insert_history' | 'update_history' | 'skip';
};

type ImportResult = {
  success: boolean;
  message: string;
  dry_run?: boolean;
  updated_orders?: number;
  inserted_history?: number;
  updated_history?: number;
  skipped?: number;
  total?: number;
  preview?: ImportPreviewItem[];
  error?: string;
};

function buildTemplateCsv() {
  const headers = ['OT', 'ACTIVO', 'FECHA_CIERRE', 'COSTO_TOTAL', 'PARTES', 'MANO_OBRA', 'OBSERVACIONES'];
  const rows = [
    ['WO-2026-0001', 'EQ-001', '2026-07-01', '3500000', '1200000', '2300000', 'Costo completado por importacion'],
    ['WO-2026-0002', 'EQ-002', '2026-07-02', '1825000', '450000', '1375000', 'Incluye bitacora historica'],
  ];

  return [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';'))
    .join('\n');
}

export default function MaintenanceCostsImportPage() {
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMode, setProcessingMode] = useState<'validate' | 'import' | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const blob = new Blob([buildTemplateCsv()], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'plantilla-costos-mantenimiento.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const chooseFile = (file: File) => {
    const valid =
      file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.xls') || file.name.toLowerCase().endsWith('.xlsx');
    if (!valid) {
      setResult({ success: false, message: 'Solo aceptamos CSV, XLS o XLSX', error: 'Formato no valido' });
      return;
    }

    setSelectedFile(file);
    setResult(null);
  };

  const sendFile = async (file: File, dryRun = false) => {
    if (!file) return;

    setIsProcessing(true);
    setProcessingMode(dryRun ? 'validate' : 'import');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/maintenance/costs/import${dryRun ? '?dryRun=1' : ''}`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'No se pudieron importar los costos');

      setResult({
        success: true,
        message: payload?.message || (dryRun ? 'Validacion completada' : 'Importacion completada'),
        dry_run: Boolean(payload?.dry_run),
        updated_orders: payload?.updated_orders || 0,
        inserted_history: payload?.inserted_history || 0,
        updated_history: payload?.updated_history || 0,
        skipped: payload?.skipped || 0,
        total: payload?.total || 0,
        preview: Array.isArray(payload?.preview) ? payload.preview : [],
      });
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'No fue posible procesar el archivo',
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    } finally {
      setIsProcessing(false);
      setProcessingMode(null);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) chooseFile(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Importar costos</h1>
          <p className="mt-2 text-muted-foreground">
            Actualiza costos reales de ordenes de trabajo y su bitacora historica desde CSV, XLS o XLSX.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/dashboard/mantenimiento/costos">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/70 bg-card/80 md:col-span-2">
          <CardHeader>
            <CardTitle>Cargar archivo</CardTitle>
            <CardDescription>
              La importacion actualiza la OT por numero y crea o corrige el historial de costos asociado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
                dragActive ? 'border-primary bg-primary/5' : 'border-border bg-background/50'
              }`}
            >
              <Upload className="mx-auto mb-3 h-10 w-10 text-primary" />
              <p className="font-medium">Arrastra tu archivo aqui o usa el selector</p>
              <p className="mt-1 text-sm text-muted-foreground">Acepta CSV, XLS y XLSX.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                  <Download className="h-4 w-4" />
                  Plantilla Excel
                </Button>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
                  <Upload className="h-4 w-4" />
                  Seleccionar archivo
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xls,.xlsx"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) chooseFile(file);
                }}
              />
              {selectedFile ? <p className="mt-3 text-sm text-muted-foreground">Archivo seleccionado: {selectedFile.name}</p> : null}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={downloadTemplate} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Descargar plantilla
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                disabled={!selectedFile || isProcessing}
                onClick={() => {
                  if (selectedFile) void sendFile(selectedFile, true);
                }}
              >
                {isProcessing && processingMode === 'validate' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Validar archivo
              </Button>
              <Button
                className="gap-2"
                disabled={!selectedFile || isProcessing}
                onClick={() => {
                  if (selectedFile) void sendFile(selectedFile, false);
                }}
              >
                {isProcessing && processingMode === 'import' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Importar archivo
              </Button>
              {isProcessing ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {processingMode === 'validate' ? 'Validando...' : 'Importando...'}
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Formato esperado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Campos obligatorios: OT.</p>
            <p>Campos recomendados: ACTIVO, FECHA_CIERRE, COSTO_TOTAL, PARTES, MANO_OBRA, OBSERVACIONES.</p>
            <p>Si el OT existe, se actualiza y el historial queda alineado con la fecha importada.</p>
            <p>Primero valida el archivo para ver una vista previa antes de escribir datos en la base.</p>
          </CardContent>
        </Card>
      </div>

      {result ? (
        <Alert variant={result.success ? 'default' : 'destructive'}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p>{result.message}</p>
              {result.success ? (
                <div className="text-sm">
                  <p>Modo: {result.dry_run ? 'validacion' : 'importacion'}</p>
                  <p>OT actualizadas: {result.updated_orders || 0}</p>
                  <p>Historial insertado: {result.inserted_history || 0}</p>
                  <p>Historial actualizado: {result.updated_history || 0}</p>
                  <p>Saltadas: {result.skipped || 0}</p>
                  <p>Total filas: {result.total || 0}</p>
                </div>
              ) : null}
              {result.success && result.preview && result.preview.length > 0 ? (
                <div className="mt-3 rounded-lg border border-border/60 bg-background/40 p-3 text-sm">
                  <p className="mb-2 font-medium">Vista previa</p>
                  <div className="space-y-2">
                    {result.preview.map((item, index) => (
                      <div key={`${item.work_order_number}-${index}`} className="flex flex-wrap gap-2 text-muted-foreground">
                        <span className="font-medium text-foreground">{item.work_order_number}</span>
                        <span>{item.asset_code || 'Sin activo'}</span>
                        <span>{item.action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
