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

export default function CapacitacionesImportPage() {
  const [dragActive, setDragActive] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const headers = [
      'NOMBRE_CAPACITACION',
      'TIPO',
      'TEMA',
      'PROGRAMA_HSE',
      'PROVEEDOR_INSTRUCTOR',
      'FECHA_PROGRAMADA',
      'HORA_INICIO',
      'HORA_TERMINO',
      'DURACION_HORAS',
      'CANTIDAD_ASISTENTES',
      'FAENAS_CARGOS',
      'ESTADO',
    ];
    const rows = [
      ['Inducción seguridad minera', 'Inducción', 'Ingreso seguro a faena', 'Programa anual 2026', 'Prevención Chile', '2026-07-10', '09:00', '13:00', '4', '18', 'Operaciones;Mantención', 'planificada'],
      ['Uso de EPP', 'Charla de Seguridad', 'Refuerzo uso correcto', 'Programa anual 2026', 'Equipo HSE', '2026-07-12', '14:00', '16:00', '2', '25', 'Toda la operación', 'realizada'],
    ];
    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla-capacitaciones.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const uploadFile = async (file: File) => {
    const lowerName = file.name.toLowerCase();
    const valid = lowerName.endsWith('.csv') || lowerName.endsWith('.xls') || lowerName.endsWith('.xlsx');

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

      const response = await fetch('/api/sostenibilidad/capacitaciones', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setResult({
          success: false,
          message: 'No se pudieron importar las capacitaciones',
          error: data.error || 'Error desconocido',
        });
        return;
      }

      setResult({
        success: true,
        message: data.message || 'Capacitaciones importadas correctamente',
        imported: data.imported,
        updated: data.updated,
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
          <h1 className="text-3xl font-bold">Importar capacitaciones</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Sube tu base de capacitaciones desde Excel para mantener el plan HSE sincronizado y evitar duplicados.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Plantilla Excel
          </Button>
          <Button asChild>
            <Link href="/dashboard/sostenibilidad/prevencion-riesgos/capacitaciones">
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
                NOMBRE_CAPACITACION | TIPO | TEMA | PROGRAMA_HSE | PROVEEDOR_INSTRUCTOR | FECHA_PROGRAMADA
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Opcionales: HORA_INICIO, HORA_TERMINO, DURACION_HORAS, CANTIDAD_ASISTENTES, FAENAS_CARGOS, ESTADO.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                FECHA_PROGRAMADA acepta fechas de Excel o texto en formato YYYY-MM-DD, DD/MM/YYYY o DD-MM-YYYY.
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
                {result.updated !== undefined ? <p className="text-sm">Actualizadas: {result.updated}</p> : null}
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
        </CardContent>
      </Card>
    </div>
  );
}
