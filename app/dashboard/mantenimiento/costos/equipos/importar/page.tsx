'use client';

import Link from 'next/link';
import { useRef, useState, type DragEvent } from 'react';
import { AlertCircle, ArrowLeft, Download, Loader2, Upload } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type ImportPreviewItem = {
  label: string;
  account_name?: string | null;
  equipment_name?: string | null;
  category?: string | null;
  total_cost?: number | string | null;
  match_source?: string | null;
  match_confidence?: number | string | null;
};

type ImportResult = {
  success: boolean;
  message: string;
  dry_run?: boolean;
  imported?: number;
  matched_assets?: number;
  matched_cost_centers?: number;
  unmatched?: number;
  total_cost?: number;
  preview?: ImportPreviewItem[];
  error?: string;
};

function buildTemplateCsv() {
  const headers = ['CUENTA', 'NOMBRE', 'COMPROBANTE', 'TIPO', 'FECHA', 'MES', 'ANO', 'CONCEPTO', 'COSTO', 'EQUIPO / VEHICULO', 'CATEGORIA', 'RUT', 'NOMBRE RUT'];
  const rows = [
    ['3204008', 'Mantenciones', '88551', 'T', '2026-05-19', 'mayo', '2026', 'Cambio de aceite', '68067', 'Bus Ford Transit Ano 2023 - SKYB-57', 'FURGON', '---', '---'],
    ['3204008', 'Mantenciones', '88552', 'T', '2026-05-20', 'mayo', '2026', 'Neumaticos', '2450000', 'Scoop Atlas Copco ST-1030 (4)', 'CARGADORES DE BAJO PERFIL', '---', '---'],
  ];

  return [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';'))
    .join('\n');
}

export default function EquipmentCostsImportPage() {
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
    anchor.download = 'plantilla-costos-equipos.csv';
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

      const response = await fetch(`/api/maintenance/equipment-costs/import${dryRun ? '?dryRun=1' : ''}`, {
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
        imported: payload?.imported || 0,
        matched_assets: payload?.matched_assets || 0,
        matched_cost_centers: payload?.matched_cost_centers || 0,
        unmatched: payload?.unmatched || 0,
        total_cost: payload?.total_cost || 0,
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
          <h1 className="text-3xl font-bold tracking-tight">Importar costos de equipos</h1>
          <p className="mt-2 text-muted-foreground">
            Carga el Excel de costos y deja cada fila cruzada con maquinaria, equipos y centros de costo reales.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/dashboard/mantenimiento/costos/equipos">
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
              El proceso no toca OT ni bodega. Solo crea o actualiza el ledger de costos de equipos.
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
              <Button variant="outline" onClick={downloadTemplate} className="gap-2">
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
            <p>Se toma la hoja Base o la primera hoja disponible.</p>
            <p>Campos clave: CUENTA, COMPROBANTE, FECHA, COSTO, EQUIPO / VEHICULO, CATEGORIA.</p>
            <p>El sistema intenta cruzar cada fila con maquinaria y con centros de costo activos.</p>
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
                  <p>Filas procesadas: {result.imported || 0}</p>
                  <p>Activos cruzados: {result.matched_assets || 0}</p>
                  <p>Centros de costo cruzados: {result.matched_cost_centers || 0}</p>
                  <p>Sin cruce: {result.unmatched || 0}</p>
                  <p>Costo total: ${Number(result.total_cost || 0).toLocaleString('es-CL')}</p>
                </div>
              ) : null}
              {result.success && result.preview && result.preview.length > 0 ? (
                <div className="mt-3 rounded-lg border border-border/60 bg-background/40 p-3 text-sm">
                  <p className="mb-2 font-medium">Vista previa</p>
                  <div className="space-y-2">
                    {result.preview.map((item, index) => (
                      <div key={`${item.label}-${index}`} className="flex flex-wrap gap-2 text-muted-foreground">
                        <span className="font-medium text-foreground">{item.label}</span>
                        <span>{item.match_source || 'sin cruce'}</span>
                        <span>{item.match_confidence ? Number(item.match_confidence).toFixed(2) : '0.00'}</span>
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
