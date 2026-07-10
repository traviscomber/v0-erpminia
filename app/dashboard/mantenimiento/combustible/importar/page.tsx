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
  imported?: number;
  updated?: number;
  inserted?: number;
  total?: number;
  error?: string;
};

function buildTemplateCsv() {
  const headers = ['CODIGO', 'FAMILIA', 'SUB_FAMILIA', 'EQUIPO', 'PRODUCTO', 'STOCK', 'VALOR_UNITARIO', 'VALOR'];
  const rows = [
    ['COMB-001', 'Combustible', 'Diesel', 'Camion 930E', 'Diesel Ultra Bajo Azufre', '15000', '960', '14400000'],
    ['COMB-002', 'Combustible', 'Lubricante', 'Taller', 'Aceite hidráulico', '2400', '5800', '13920000'],
  ];

  return [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';'))
    .join('\n');
}

export default function CombustibleImportPage() {
  const [dragActive, setDragActive] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const blob = new Blob([buildTemplateCsv()], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'plantilla-combustible.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const uploadFile = async (file: File) => {
    const valid =
      file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.xls') || file.name.toLowerCase().endsWith('.xlsx');
    if (!valid) {
      setResult({ success: false, message: 'Solo aceptamos CSV, XLS o XLSX', error: 'Formato no valido' });
      return;
    }

    setIsImporting(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/bodega/import-inventory', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo importar el inventario');
      }

      setResult({
        success: true,
        message: payload?.message || 'Importación completada',
        imported: payload?.imported || 0,
        updated: payload?.updated || 0,
        inserted: payload?.inserted || 0,
        total: payload?.imported || 0,
      });
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'No fue posible procesar el archivo',
        error: error instanceof Error ? error.message : 'Error desconocido',
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
          <h1 className="text-3xl font-bold tracking-tight">Importar combustible</h1>
          <p className="mt-2 text-muted-foreground">
            Actualiza combustibles y consumibles desde CSV/XLS/XLSX usando la importación de bodega.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/dashboard/mantenimiento/combustible">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/70 bg-card/80 md:col-span-2">
          <CardHeader>
            <CardTitle>Cargar archivo</CardTitle>
            <CardDescription>La plantilla crea o actualiza registros de bodega para el módulo de combustible.</CardDescription>
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
              <p className="font-medium">Arrastra tu archivo aquí o usa el selector</p>
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
                  if (file) void uploadFile(file);
                }}
              />
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={downloadTemplate} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Descargar plantilla
              </Button>
              {isImporting ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importando...
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
            <p>Campos obligatorios: `CODIGO`, `FAMILIA`, `PRODUCTO`, `STOCK`.</p>
            <p>Campos recomendados: `SUB_FAMILIA`, `EQUIPO`, `VALOR_UNITARIO`, `VALOR`.</p>
            <p>Los registros entran a bodega y el tablero de combustible los muestra automáticamente.</p>
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
                  <p>Importados: {result.imported || 0}</p>
                  <p>Actualizados: {result.updated || 0}</p>
                  <p>Insertados: {result.inserted || 0}</p>
                  <p>Total filas: {result.total || 0}</p>
                </div>
              ) : null}
            </div>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
