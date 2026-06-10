'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, File, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CarpetaArranqueFormProps {
  onSuccess?: () => void;
}

const DOCUMENTOS_REQUERIDOS = [
  'Certificado de afiliación',
  'Certificado Accidentabilidad',
  'Reglamento interno',
  'Copia IRL',
  'Contratos de trabajo',
  'Registro EPP',
  'Registro interno empresa',
  'Recepción Sistema HSE',
  'Exámenes pre-ocupacionales',
  'Exámenes ocupacionales',
  'Documentación trabajadores extranjeros',
  'Procedimientos de trabajo',
  'Procedimiento accidentes',
  'Política empresa contratista',
  'Carnet identidad',
  'Licencias conducción',
  'Recepción conductores',
  'Programa supervisión',
  'Matriz MIPER',
];

export default function CarpetaArranqueForm({ onSuccess }: CarpetaArranqueFormProps) {
  const [empresa, setEmpresa] = useState('');
  const [archivos, setArchivos] = useState<Record<string, File | null>>(
    Object.fromEntries(DOCUMENTOS_REQUERIDOS.map(d => [d, null]))
  );
  const [cargando, setCargando] = useState(false);

  const handleFileChange = (documento: string, file: File | null) => {
    setArchivos(prev => ({
      ...prev,
      [documento]: file,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresa) {
      alert('Por favor selecciona una empresa');
      return;
    }

    setCargando(true);
    // Simular carga de archivos
    await new Promise(resolve => setTimeout(resolve, 2000));
    setCargando(false);

    alert('Carpeta de Arranque creada exitosamente');
    onSuccess?.();
  };

  const archivoCargados = Object.values(archivos).filter(Boolean).length;
  const requetidosRestantes = DOCUMENTOS_REQUERIDOS.length - archivoCargados;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Empresa Selection */}
      <div className="space-y-2">
        <Label htmlFor="empresa">Selecciona tu Empresa</Label>
        <Select value={empresa} onValueChange={setEmpresa}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona una empresa..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sofia-sabines">Sofia Sabines</SelectItem>
            <SelectItem value="felipe-mora">Felipe Mora</SelectItem>
            <SelectItem value="rodrigo-mazzarella">Rodrigo Mazzarella</SelectItem>
            <SelectItem value="modelos-toledo">Modelos Toledo</SelectItem>
            <SelectItem value="javiera-yanez">Javiera Yáñez</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium">Documentos cargados</span>
          <span className="text-muted-foreground">
            {archivoCargados}/{DOCUMENTOS_REQUERIDOS.length}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-600 h-2 rounded-full transition-all"
            style={{ width: `${(archivoCargados / DOCUMENTOS_REQUERIDOS.length) * 100}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {requetidosRestantes > 0
            ? `${requetidosRestantes} documentos faltantes`
            : '¡Todos los documentos cargados!'}
        </p>
      </div>

      {/* Documentos */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {DOCUMENTOS_REQUERIDOS.map(documento => (
          <div key={documento} className="border rounded-lg p-3">
            <div className="flex justify-between items-start mb-2">
              <Label className="font-medium text-sm">{documento}</Label>
              {archivos[documento] && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-1 rounded">
                    <File className="h-3 w-3" />
                    {archivos[documento]!.name.substring(0, 20)}...
                  </div>
                  <button
                    type="button"
                    onClick={() => handleFileChange(documento, null)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {!archivos[documento] ? (
              <label className={cn(
                'flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4',
                'cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors'
              )}>
                <Upload className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Arrastra o haz clic para cargar PDF
                </span>
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleFileChange(documento, e.target.files[0]);
                    }
                  }}
                />
              </label>
            ) : (
              <div className="text-xs text-green-600 flex items-center gap-1">
                <div className="h-2 w-2 bg-green-600 rounded-full" />
                {archivos[documento]!.name} - {(archivos[documento]!.size / 1024).toFixed(2)} KB
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Submit */}
      <div className="flex gap-2">
        <Button type="submit" disabled={cargando || !empresa || archivoCargados === 0}>
          {cargando ? 'Creando Carpeta...' : `Crear Carpeta (${archivoCargados}/${DOCUMENTOS_REQUERIDOS.length})`}
        </Button>
        <Button type="button" variant="outline">
          Cancelar
        </Button>
      </div>
    </form>
  );
}
