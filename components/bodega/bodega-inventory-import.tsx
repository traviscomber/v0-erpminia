'use client';

import { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Upload } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCostCenters } from '@/hooks/use-cost-centers';
import { isRootCostCenter } from '@/lib/cost-centers';

interface ImportResult {
  success: boolean;
  message: string;
  imported?: number;
  updated?: number;
  inserted?: number;
  error?: string;
}

export function BodegaInventoryImportComponent() {
  const { costCenters } = useCostCenters();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedCostCenter, setSelectedCostCenter] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rootCostCenters = costCenters.filter((cc) => isRootCostCenter(cc.code));

  const handleFile = async (file: File) => {
    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.csv') && !lowerName.endsWith('.xls') && !lowerName.endsWith('.xlsx')) {
      setResult({
        success: false,
        message: 'Solo aceptamos archivos CSV, XLS o XLSX',
        error: 'Tipo de archivo no valido',
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (selectedCostCenter) {
        formData.append('costCenterId', selectedCostCenter);
      }

      const response = await fetch('/api/bodega/import-inventory', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json().catch(() => null);

      if (response.ok) {
        setResult({
          success: true,
          message: data?.message || 'Inventario sincronizado correctamente',
          imported: data?.imported,
          updated: data?.updated,
          inserted: data?.inserted,
        });
      } else {
        setResult({
          success: false,
          message: 'No se pudo importar el inventario',
          error: data?.error || 'Error desconocido',
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
            Importar inventario de bodega
          </CardTitle>
          <CardDescription>Sube tu archivo CSV, XLS o XLSX con codigo, familia, cantidad y precio. La carga sincroniza por SKU y no vacia la tabla si falla.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Centro de costo (opcional)</label>
            <Select value={selectedCostCenter} onValueChange={setSelectedCostCenter}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un centro de costo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No asignar</SelectItem>
                {rootCostCenters.map((cc) => (
                  <SelectItem key={cc.id} value={cc.id}>
                    {cc.code} - {cc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              Si no seleccionas, los items se importaran sin asignar a un centro.
            </p>
          </div>

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
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
                CODIGO | FAMILIA | SUB-FAMILIA | EQUIPO | PRODUCTO | STOCK | VALOR UNIT
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                CODIGO debe ser unico. PRODUCTO es el nombre del articulo. STOCK y VALOR UNIT se cargan al sistema.
              </p>
            </AlertDescription>
          </Alert>

          {result && (
            <Alert className={result.success ? 'border-green-500' : 'border-red-500'}>
              {result.success ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-red-600" />}
              <AlertDescription>
                <p className={result.success ? 'font-semibold text-green-900' : 'font-semibold text-red-900'}>
                  {result.message}
                </p>
                {result.imported ? <p className="mt-1 text-sm">{result.imported} items procesados</p> : null}
                {result.updated || result.inserted ? (
                  <p className="mt-1 text-sm">
                    {result.updated || 0} actualizados, {result.inserted || 0} nuevos
                  </p>
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
