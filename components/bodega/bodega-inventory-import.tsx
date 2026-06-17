'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface ImportResult {
  success: boolean;
  message: string;
  imported?: number;
  error?: string;
}

type CostCenterOption = {
  id: string;
  code: string;
  name: string;
};

const NONE_VALUE = '__no_cost_center__';

export function BodegaInventoryImportComponent() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [costCenters, setCostCenters] = useState<CostCenterOption[]>([]);
  const [selectedCostCenter, setSelectedCostCenter] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isValidFile = (file: File) => /\.(csv|xls|xlsx)$/i.test(file.name);

  useEffect(() => {
    const loadCostCenters = async () => {
      try {
        const response = await fetch('/api/cost-centers', {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to load cost centers');
        }

        const data = await response.json();
        setCostCenters(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error loading cost centers:', error);
      }
    };

    loadCostCenters();
  }, []);

  const handleFile = async (file: File) => {
    if (!isValidFile(file)) {
      setResult({
        success: false,
        message: 'Only CSV, XLS or XLSX files are accepted',
        error: 'Invalid file type',
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
        credentials: 'include',
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
          message: 'Failed to import inventory',
          error: data.error || 'Unknown error',
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Error uploading file',
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
            Importar Inventario Bodega
          </CardTitle>
          <CardDescription>
            Sube tu archivo CSV, XLS o XLSX con el inventario de bodega (código, familia, sub-familia, equipo y producto)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Centro de Costos (Opcional)
            </label>
            <Select
              value={selectedCostCenter || NONE_VALUE}
              onValueChange={(value) => {
                setSelectedCostCenter(value === NONE_VALUE ? '' : value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un centro de costos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>No asignar</SelectItem>
                {costCenters.map((cc) => (
                  <SelectItem key={cc.id} value={cc.id}>
                    {cc.code} - {cc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Si no seleccionas, los items se importarán sin asignar a un centro
            </p>
          </div>

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="font-semibold text-foreground">
              Arrastra tu archivo o haz clic para seleccionar
            </p>
            <p className="text-sm text-muted-foreground mt-1">
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
              <p className="font-semibold mb-2">Formato requerido:</p>
              <p className="text-sm">Tu archivo debe tener estas columnas:</p>
              <div className="mt-2 font-mono text-sm bg-muted p-2 rounded">
                CÓDIGO | FAMILIA | SUB-FAMILIA | EQUIPO | PRODUCTO
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                El CÓDIGO debe ser único. PRODUCTO es el nombre del artículo.
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
                <p className={result.success ? 'text-green-900 font-semibold' : 'text-red-900 font-semibold'}>
                  {result.message}
                </p>
                {result.imported && (
                  <p className="text-sm mt-1">
                    {result.imported} items de inventario importados
                  </p>
                )}
                {result.error && (
                  <p className="text-sm text-red-700 mt-1">{result.error}</p>
                )}
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
