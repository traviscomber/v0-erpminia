'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

interface ImportResult {
  success: boolean;
  message: string;
  imported?: number;
  error?: string;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export function BodegaInventoryImportComponent() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [costCenters, setCostCenters] = useState<Array<{ id: string; nombre: string }>>([]);
  const [selectedCostCenter, setSelectedCostCenter] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadCostCenters = async () => {
      try {
        const { data } = await supabase.from('cost_centers').select('id, nombre').eq('nivel', 1).order('nombre');

        if (data) {
          setCostCenters(data);
        }
      } catch (error) {
        console.error('Error al cargar los centros de costos:', error);
      }
    };

    loadCostCenters();
  }, []);

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setResult({
        success: false,
        message: 'Solo aceptamos archivos CSV',
        error: 'Tipo de archivo no válido',
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
          message: 'No se pudo importar el inventario',
          error: data.error || 'Error desconocido',
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
          <CardDescription>
            Sube tu archivo CSV con el inventario de bodega (código, familia, producto, etc.).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Centro de costos (opcional)</label>
            <Select value={selectedCostCenter} onValueChange={setSelectedCostCenter}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un centro de costos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No asignar</SelectItem>
                {costCenters.map((cc) => (
                  <SelectItem key={cc.id} value={cc.id}>
                    {cc.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              Si no seleccionas, los ítems se importarán sin asignar a un centro.
            </p>
          </div>

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="font-semibold text-foreground">Arrastra tu archivo o haz clic para seleccionar</p>
            <p className="mt-1 text-sm text-muted-foreground">Formato: CSV (separado por punto y coma)</p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
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
                CÓDIGO | FAMILIA | SUB-FAMILIA | EQUIPO | PRODUCTO
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
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
                <p className={result.success ? 'font-semibold text-green-900' : 'font-semibold text-red-900'}>
                  {result.message}
                </p>
                {result.imported ? <p className="mt-1 text-sm">{result.imported} ítems de inventario importados</p> : null}
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
