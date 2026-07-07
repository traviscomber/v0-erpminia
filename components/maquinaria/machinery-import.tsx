'use client';

import { useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, X, Download } from 'lucide-react';

interface ImportResult {
  success: boolean;
  imported: number;
  updated?: number;
  warnings: string[];
  error?: string;
  details?: string[];
}

export function MaquinariaImport({ onSuccess }: { onSuccess?: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFile = (f: File) => {
    setFile(f);
    setResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsLoading(true);
    setResult(null);

    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/maquinaria/import-machinery', {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      const data = await res.json();
      setResult(data);
      if (data.success && onSuccess) onSuccess();
    } catch {
      setResult({ success: false, imported: 0, warnings: [], error: 'Error de red' });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTemplate = () => {
    const headers = ['codigo', 'nombre', 'estado', 'descripcion', 'modelo', 'patente', 'anio'];
    const exampleRows = [
      ['8-1', 'Camioneta Ford Ranger', 'activo', 'Unidad de apoyo mina', 'Ford Ranger', 'ABC123', '2024'],
      ['9-2', 'Camion Iveco Tector', 'activo', 'Camion de transporte interno', 'Iveco Tector', 'JJK567', '2023'],
    ];
    const csv = [headers, ...exampleRows].map((r) => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_maquinaria.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Formato del archivo</CardTitle>
          <CardDescription>
            El archivo puede incluir <strong>código</strong>, <strong>nombre</strong>, <strong>estado</strong>,
            <strong>descripción</strong>, <strong>modelo</strong>, <strong>patente</strong> y <strong>año</strong>.
            El código debe venir en formato <strong>X-Y</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-start">
            <div className="flex-1 rounded-md border border-border bg-background p-3 font-mono text-xs text-muted-foreground">
              <div className="mb-1 font-semibold text-foreground">codigo;nombre;estado;descripcion;modelo;patente;anio</div>
              <div>Si vuelves a subir el mismo código, el sistema actualiza el registro existente.</div>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="shrink-0">
              <Download className="mr-2 h-4 w-4" />
              Descargar plantilla
            </Button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground md:grid-cols-4">
            {[
              ['8', 'Camionetas'],
              ['9', 'Camiones'],
              ['10', 'Cargadores BP'],
              ['11', 'Cargadores Frontales'],
              ['12', 'Camiones BP'],
              ['13', 'Generadores'],
              ['14', 'Compresores'],
              ['15', 'Manipuladores'],
              ['16', 'Sondaje'],
              ['17', 'Perforación'],
              ['18', 'Minicargadores'],
            ].map(([code, label]) => (
              <div key={code} className="flex items-center gap-1">
                <Badge variant="outline" className="px-1.5 py-0 text-xs font-mono">
                  {code}
                </Badge>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-10 text-center transition-colors
          ${isDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50 hover:bg-muted/30'}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        {file ? (
          <div className="flex flex-col items-center gap-2">
            <FileSpreadsheet className="h-10 w-10 text-primary" />
            <p className="font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
                setResult(null);
              }}
            >
              <X className="mr-1 h-4 w-4" /> Quitar archivo
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Arrastra tu archivo aquí</p>
            <p className="text-sm text-muted-foreground">o haz click para seleccionar CSV, XLS o XLSX</p>
          </div>
        )}
      </div>

      {file && !result && (
        <Button onClick={handleUpload} disabled={isLoading} className="w-full">
          {isLoading ? 'Importando...' : 'Importar maquinaria'}
        </Button>
      )}

      {result && (
        <Card className={result.success ? 'border-green-300 bg-green-50/50' : 'border-red-300 bg-red-50/50'}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
              {result.success
                ? `${result.imported} equipos importados${result.updated ? `, ${result.updated} actualizados` : ''}`
                : result.error || 'Error al importar'}
            </CardTitle>
          </CardHeader>
          {(result.warnings?.length ?? 0) > 0 && (
            <CardContent className="space-y-3">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-amber-700">
                  {(result.warnings?.length ?? 0)} advertencias
                </p>
                <div className="max-h-32 space-y-0.5 overflow-y-auto text-xs text-amber-800">
                  {(result.warnings || []).map((warning, index) => (
                    <div key={index}>{warning}</div>
                  ))}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setFile(null); setResult(null); }}>
                Importar otro archivo
              </Button>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
