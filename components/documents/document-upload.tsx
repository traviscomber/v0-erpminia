'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, Loader, CheckCircle2, AlertCircle, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// Tipos de documentos por módulo
const DOCUMENT_TYPES_BY_MODULE: Record<string, string[]> = {
  prevención: [
    'Acta de Entrega',
    'Anexo Contrato',
    'Carnet de Identidad',
    'Certificado de Accidentabilidad',
    'Certificado de Afiliación',
    'Certificado de Afiliación Actualizado',
    'Certificado de Cotizaciones',
    'Comprobante de Recepción',
    'Contrato de Trabajo',
    'Contrato Laboral',
    'Documentos de Cumplimiento Regulatorio',
    'Examen Ocupacional',
    'Examen Organizacional',
    'Examen Periódico',
    'Examen Pre-ocupacional',
    'Informe de Accidentalidad',
    'IRL (Índice de Riesgo Laboral)',
    'Licencia de Conducción',
    'Licencia de Izamiento',
    'Matriz IPER (Identificación de Peligros)',
    'Matriz MIPER',
    'OPR (Orden de Preparación/Riesgos)',
    'Política de Riesgos',
    'Política SST',
    'Procedimiento Caso Accidentario',
    'Procedimiento de Trabajo',
    'Procedimiento de Trabajo Crítico',
    'Procedimiento en caso de Accidente',
    'Programa de Capacitación HSE',
    'Recepción Firmada',
    'Registro Entrega EPP',
    'Reglamento Entrega EPP',
    'Reglamento Interno (DS 44)',
    'RIL (Evaluación de Riesgos)',
    'RROHH y Comprobantes de Recepción',
    'SGSST (Sistema de Gestión de Seguridad)',
  ].sort(),
  mantenimiento: [
    'Checklist de Inspección',
    'Manual de Procedimiento',
    'Procedimiento de Emergencia',
    'Protocolo de Mantenimiento',
    'Registro de Trabajos',
  ].sort(),
  finanzas: [
    'Instructivo de Compras',
    'Política de Gastos',
    'Política Financiera',
    'Procedimiento de Facturación',
    'Procedimiento de Presupuesto',
  ].sort(),
  bodega: [
    'Checklist de Inventario',
    'Política de Rotación',
    'Procedimiento de Almacenamiento',
    'Procedimiento de Devoluciones',
  ].sort(),
  hse: [
    'Matriz de Riesgos',
    'Plan de Emergencia',
    'Política HSE',
    'Procedimiento de Seguridad',
    'Protocolo de Salud',
  ].sort(),
  legal: [
    'Contrato',
    'Documento de Compliance',
    'Política Corporativa',
    'Regulación Interna',
    'Términos y Condiciones',
  ].sort(),
};

interface DocumentUploadProps {
  module: string; // 'prevención', 'mantenimiento', 'finanzas', etc
  category: string; // 'arranque', 'procedimientos', 'políticas', etc
  onUploadSuccess?: (documentId: string, fileName: string) => void;
  onCancel?: () => void;
}

export function DocumentUpload({ module, category, onUploadSuccess, onCancel }: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [documentType, setDocumentType] = useState<string>('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    validFrom: '',
    validUntil: '',
  });
  const dragRef = useRef<HTMLDivElement>(null);

  const availableTypes = DOCUMENT_TYPES_BY_MODULE[module] || [];

  const acceptedTypes = {
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  };

  const acceptedString = Object.values(acceptedTypes).flat().join(',');

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragRef.current) {
      dragRef.current.classList.add('border-primary', 'bg-primary/5');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (dragRef.current) {
      dragRef.current.classList.remove('border-primary', 'bg-primary/5');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragRef.current) {
      dragRef.current.classList.remove('border-primary', 'bg-primary/5');
    }
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    const isValidType = Object.keys(acceptedTypes).includes(selectedFile.type);
    if (!isValidType) {
      setErrorMessage('Solo se aceptan archivos PDF, Word (.doc, .docx) y Excel (.xls, .xlsx)');
      setUploadStatus('error');
      setTimeout(() => setUploadStatus('idle'), 5000);
      return;
    }

    const maxSize = 50 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setErrorMessage('El archivo no debe superar 50MB');
      setUploadStatus('error');
      setTimeout(() => setUploadStatus('idle'), 5000);
      return;
    }

    setFile(selectedFile);
    setUploadStatus('idle');
    setErrorMessage('');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMessage('Selecciona un archivo');
      setUploadStatus('error');
      return;
    }

    if (!documentType) {
      setErrorMessage('Selecciona el tipo de documento');
      setUploadStatus('error');
      return;
    }

    setIsUploading(true);
    setUploadStatus('uploading');
    setErrorMessage('');

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('module', module);
      uploadFormData.append('category', category);
      uploadFormData.append('documentType', documentType);
      uploadFormData.append('description', formData.description);
      uploadFormData.append('validFrom', formData.validFrom);
      uploadFormData.append('validUntil', formData.validUntil);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: uploadFormData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const { documentId } = await response.json();

      setUploadStatus('success');
      setTimeout(() => {
        if (onUploadSuccess) {
          onUploadSuccess(documentId, file.name);
        }
        setFile(null);
        setDocumentType('');
        setFormData({ description: '', validFrom: '', validUntil: '' });
      }, 2000);
    } catch (err) {
      console.error('Upload error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Error al cargar el archivo');
      setUploadStatus('error');
      setIsUploading(false);
    }
  }, [file, module, category, documentType, formData, onUploadSuccess]);

  return (
    <Card className="w-full p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Drag and Drop Area */}
        <div
          ref={dragRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'relative border-2 border-dashed rounded-lg p-8 transition-all cursor-pointer',
            file 
              ? 'border-green-500 bg-green-50/50 dark:bg-green-950/30' 
              : 'border-primary/30 hover:border-primary/70 hover:bg-primary/5 dark:border-primary/40'
          )}
        >
          {uploadStatus === 'success' ? (
            <div className="text-center space-y-2">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
              <p className="text-sm font-semibold text-green-700">{file?.name} cargado correctamente</p>
            </div>
          ) : uploadStatus === 'error' ? (
            <div className="text-center space-y-2">
              <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
              <p className="text-sm font-semibold text-destructive">{errorMessage}</p>
            </div>
          ) : (
            <>
              <input
                type="file"
                accept={acceptedString}
                onChange={handleFileSelect}
                disabled={isUploading}
                className="hidden"
                id="file-input"
              />
              <label htmlFor="file-input" className="cursor-pointer space-y-3 text-center">
                {file ? (
                  <>
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle2 className="h-8 w-8 text-green-600 flex-shrink-0" />
                      <span className="text-sm font-semibold text-foreground">{file.name}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setFile(null);
                        }}
                        className="ml-2 p-1 hover:bg-destructive/10 rounded transition-colors"
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="mx-auto h-10 w-10 text-primary/70" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">Arrastra el archivo aquí o haz clic para seleccionar</p>
                      <p className="text-xs text-muted-foreground">Formatos: PDF, Word (.doc, .docx), Excel (.xls, .xlsx) | Máx 50MB</p>
                    </div>
                  </>
                )}
              </label>
            </>
          )}
        </div>

        {/* Document Type Selector */}
        {file && uploadStatus === 'idle' && (
          <div className="space-y-3">
            <label className="text-sm font-semibold text-foreground">Tipo de Documento *</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                className={cn(
                  'w-full px-4 py-3 rounded-md border-2 transition-all text-left flex items-center justify-between font-medium',
                  documentType 
                    ? 'border-primary bg-primary/10 text-foreground' 
                    : 'border-border hover:border-primary/60 text-muted-foreground hover:text-foreground'
                )}
              >
                <span>
                  {documentType || 'Selecciona un tipo de documento'}
                </span>
                <ChevronDown className={cn('h-5 w-5 transition-transform flex-shrink-0', showDropdown && 'transform rotate-180')} />
              </button>

              {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 border-2 border-primary/30 rounded-md bg-background shadow-xl z-50 max-h-56 overflow-y-auto">
                  {availableTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setDocumentType(type);
                        setShowDropdown(false);
                      }}
                      className={cn(
                        'w-full px-4 py-3 text-left text-sm font-medium hover:bg-primary/20 transition-colors border-b border-border/50 last:border-b-0',
                        documentType === type && 'bg-primary/30 text-primary-foreground'
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Metadata Form */}
        {file && uploadStatus === 'idle' && (
          <>
            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground">Descripción</label>
              <Textarea
                placeholder="Descripción del documento (opcional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="border-primary/30 focus:border-primary/70"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground">Válido desde</label>
                <Input
                  type="date"
                  value={formData.validFrom}
                  onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                  className="border-primary/30 focus:border-primary/70"
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground">Válido hasta</label>
                <Input
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  className="border-primary/30 focus:border-primary/70"
                />
              </div>
            </div>
          </>
        )}

        {/* Loading State */}
        {uploadStatus === 'uploading' && (
          <div className="flex items-center justify-center gap-2 py-4">
            <Loader className="h-5 w-5 animate-spin" />
            <span className="text-sm font-medium">Cargando documento...</span>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 justify-end">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isUploading}>
              Cancelar
            </Button>
          )}
          <Button
            type="submit"
            disabled={!file || isUploading || uploadStatus === 'success'}
          >
            {uploadStatus === 'success' ? 'Completado' : uploadStatus === 'uploading' ? 'Cargando...' : 'Cargar Documento'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
