'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, Loader, CheckCircle2, AlertCircle, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// Tipos de documentos por m�dulo
const DOCUMENT_TYPES_BY_MODULE: Record<string, string[]> = {
  prevencion: [
    'Acta de Entrega',
    'Anexo Contrato',
    'Anexo Reglamento Interno Acu�feros',
    'Asistencia a Capacitaci�n Manual de Comunicaci�n Radial',
    'Autorizaci�n ABREN',
    'Autorizaci�n Rescatador',
    'Autorizaciones Especiales',
    'Bit�coras de Control',
    'Cambio de P�lizas de Seguros',
    'Carnet de Identidad',
    'Certificado de Accidentabilidad',
    'Certificado de Afiliaci�n',
    'Certificado de Afiliaci�n Actualizado',
    'Certificado de Cotizaciones',
    'Comprobante de Recepci�n',
    'Contrato de Trabajo',
    'Contrato Laboral',
    'Documentaci�n de Auditor�a',
    'Documentos de Cumplimiento Regulatorio',
    'Evaluaci�n de Procedimiento',
    'Evaluaci�n de Procedimiento de Emergencia Incendio',
    'Evaluaci�n procedimiento operaci�n cargador frontal',
    'Evaluaci�n procedimiento operaci�n cami�n Tolva',
    'Evaluaci�n procedimiento operaci�n DTM',
    'Evaluaci�n procedimiento de emergencia en caso de accidente o enfermedad grave',
    'Evaluaci�n Operaci�n Chancado',
    'Evaluaci�n Operaci�n Cami�n Tolva',
    'Evaluaci�n Operaci�n DTM',
    'Evaluaci�n Operaci�n DUMPER',
    'Evaluaci�n Operaci�n Sondaje',
    'Evaluaci�n Operaci�n Scoop',
    'Evaluaci�n Operaci�n y Limpieza M�quinas de Maestreo',
    'Evaluaci�n Procedimiento Cambio y Reposici�n EPP',
    'Evaluaci�n Procedimiento Chancador Interior de Operaci�n',
    'Evaluaci�n Procedimiento Emergencia Mina',
    'Evaluaci�n Procedimiento Herramientas',
    'Evaluaci�n Procedimiento Operador y Limpieza',
    'Evaluaci�n Procedimiento Operaci�n Chancador Versi�n 7 y 8',
    'Evaluaci�n Procedimiento Operaci�n Equipo con Control Remoto',
    'Evaluaci�n Procedimiento Perforaci�n Chancador',
    'Evaluaci�n Procedimiento Perforaci�n M�quina Iviana',
    'Evaluaci�n Procedimiento Trabajos con Soldadura',
    'Evaluaci�n Procedimiento Trabajos con Soldadura y Oxicorte',
    'Evaluaci�n Procedimiento Trabajos en Altura',
    'Evaluaci�n Procedimiento Trabajos en Ambientes Confinados',
    'Evaluaci�n Procedimiento Transporte, Almacenamiento y Manejo de Explosivos',
    'Evaluaci�n Procedimiento Uso de Herramientas El�ctricas, Manuales y Neum�ticas',
    'Evaluaci�n Procedimiento Uso Protecciones Respiratorias y Gafas',
    'Evaluaci�n Reglamento Estudios',
    'Evaluaci�n Reglamento Fortificaci�n',
    'Evaluaci�n reglamento acu�adura',
    'Evaluaci�n reglamento interno de explosivos',
    'Evaluaci�n reglamento tr�nsito interior mina',
    'Evaluaci�n Reglamento Transporte y Conducci�n',
    'Evaluaci�n reglamento transporte y conducci�n',
    'Examen Ocupacional',
    'Examen Organizacional',
    'Examen Peri�dico',
    'Examen Pre-ocupacional',
    'Ficha T�cnica Autorrescatador',
    'Fichas de Seguridad',
    'Informe de Accidentalidad',
    'IRL (�ndice de Riesgo Laboral)',
    'Levantamiento Extintores',
    'Licencia de Conducci�n',
    'Licencia de Izamiento',
    'Maestro Autorizaciones',
    'Maestro Licencias Internas de Conducci�n',
    'Matriz IPER (Identificaci�n de Peligros)',
    'Matriz MIPER',
    'OPR (Orden de Preparaci�n/Riesgos)',
    'Pol�tica Actualizada',
    'Pol�tica de Riesgos',
    'Pol�tica SST',
    'Procedimiento Caso Accidentario',
    'Procedimiento con M�quina Iviana',
    'Procedimiento de Trabajo',
    'Procedimiento de Trabajo Cr�tico',
    'Procedimiento en caso de Accidente',
    'Procedimiento Operaci�n Chancado',
    'Procedimiento Operaci�n Miner�a',
    'Procedimiento Operaci�n Sondaje',
    'Programa de Capacitaci�n HSE',
    'Programa de Seguimiento Conductual y Capacitaci�n',
    'Recepci�n Firmada',
    'Registro Capacitaci�n Emergencia en Caso de Accidente',
    'Registro Capacitaci�n DTM',
    'Registro Capacitaci�n Procedimiento Emergencia en Caso de Accidente',
    'Registro Capacitaci�n Procedimiento Emergencia en Caso de Incendio en Mina',
    'Registro Capacitaci�n Procedimiento con M�quina Iviana',
    'Registro Capacitaci�n Procedimiento Operaci�n Chancado',
    'Registro Capacitaci�n Reglamento Interno Acu�feros',
    'Registro Capacitaci�n Reglamento Interno Transporte y Conducci�n',
    'Registro Capacitaci�n Trabajos en Altura',
    'Registro Capacitaci�n Trabajos en Ambientes Confinados',
    'Registro Entrega EPP',
    'Registro Maestro Control Evaluaciones',
    'Registro Maestro EPP por Cargo',
    'Reglamento Contrase�as',
    'Reglamento Contratistas',
    'Reglamento Entrega EPP',
    'Reglamento Ingreso Personas y Veh�culos',
    'Reglamento Interno (DS 44)',
    'Reglamento Interno Acu�feros',
    'Reglamento interno de acu�adura',
    'Reglamento Interno Explosivos',
    'Reglamento interno de explosivos',
    'Reglamento Interno Fortificaci�n',
    'Reglamento interno de fortificaci�n',
    'Reglamento Interno Transporte de Personal',
    'Reglamento interno de transporte y conducci�n',
    'Reglamento Tr�nsito Interior Mina',
    'RIL (Evaluaci�n de Riesgos)',
    'RROHH y Comprobantes de Recepci�n',
    'SGSST (Sistema de Gesti�n de Seguridad)',
    'Seguimiento y Control Instructivos de SGSST',
    'Seguimiento y Control Procedimientos',
    'Seguimiento y Control Reglamentos',
  ].sort(),
  mantenimiento: [
    'Checklist de Inspecci�n',
    'Manual de Procedimiento',
    'Procedimiento de Emergencia',
    'Protocolo de Mantenimiento',
    'Registro de Trabajos',
  ].sort(),
  finanzas: [
    'Instructivo de Compras',
    'Pol�tica de Gastos',
    'Pol�tica Financiera',
    'Procedimiento de Facturaci�n',
    'Procedimiento de Presupuesto',
  ].sort(),
  bodega: [
    'Checklist de Inventario',
    'Pol�tica de Rotaci�n',
    'Procedimiento de Almacenamiento',
    'Procedimiento de Devoluciones',
  ].sort(),
  hse: [
    'Matriz de Riesgos',
    'Plan de Emergencia',
    'Pol�tica HSE',
    'Procedimiento de Seguridad',
    'Protocolo de Salud',
  ].sort(),
  legal: [
    'Contrato',
    'Documento de cumplimiento',
    'Pol�tica Corporativa',
    'Regulaci�n Interna',
    'T�rminos y Condiciones',
  ].sort(),
  compras: [
    'Cotizaci�n',
    'Orden de Compra',
    'Factura',
    'Nota de Cr�dito',
    'Contrato de Proveedor',
    'Evaluaci�n de Proveedor',
    'Acuerdo de Confidencialidad',
    'Especificaciones T�cnicas',
    'Recepci�n de Mercader�a',
    'Devoluci�n de Mercader�a',
    'An�lisis de Precios',
    'Solicitud de Compra',
  ].sort(),
};

interface DocumentUploadProps {
  module: string; // 'prevenci�n', 'mantenimiento', 'finanzas', etc
  category: string; // 'arranque', 'procedimientos', 'pol�ticas', etc
  onUploadSuccess: (documentId: string, fileName: string) => void;
  onCancel?: () => void;
}

export function DocumentUpload({ module, category, onUploadSuccess, onCancel }: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error' | 'duplicate'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [documentType, setDocumentType] = useState<string>('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isDuplicateConfirmed, setIsDuplicateConfirmed] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    validFrom: '',
    validUntil: '',
  });
  const dragRef = useRef<HTMLDivElement>(null);

  const normalizedModule = module.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const availableTypes = DOCUMENT_TYPES_BY_MODULE[normalizedModule] || [];

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
      setErrorMessage('El archivo no debe superar 50 MB');
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
      uploadFormData.append('bypassDuplicate', isDuplicateConfirmed ? 'true' : 'false');

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: uploadFormData,
        credentials: 'include',
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Check if it's a duplicate error (409 status) and not already confirmed
        if (response.status === 409 && responseData.isDuplicate && !isDuplicateConfirmed) {
          setErrorMessage(responseData.error);
          setUploadStatus('duplicate');
          setIsUploading(false);
          return;
        }
        throw new Error(responseData.error || 'Error desconocido al cargar el archivo');
      }

      const { documentId } = responseData;

      setUploadStatus('success');
      setIsDuplicateConfirmed(false);
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
  }, [file, module, category, documentType, formData, isDuplicateConfirmed, onUploadSuccess]);

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
              <p className="text-sm font-semibold text-green-700">
                {file?.name || 'Archivo'} cargado correctamente
              </p>
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
                      <p className="text-sm font-semibold text-foreground">Arrastra el archivo aqui o haz clic para seleccionar</p>
                      <p className="text-xs text-muted-foreground">Formatos: PDF, Word (.doc, .docx), Excel (.xls, .xlsx) | Max 50MB</p>
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
            <label className="text-sm font-semibold text-foreground">Tipo de documento *</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                className={cn(
                  'w-full px-4 py-3 rounded-md border-2 transition-all text-left flex items-center justify-between font-medium',
                  documentType 
                    ? 'border-green-500 bg-green-500/20 text-green-700 dark:text-green-300 dark:bg-green-950/40' 
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
                        documentType === type && 'bg-green-500/30 text-green-700 dark:text-green-300 dark:bg-green-950/50 font-semibold'
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
              <label className="text-sm font-semibold text-foreground">Descripci�n</label>
              <Textarea
                placeholder="Descripci�n del documento (opcional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="border-primary/30 focus:border-primary/70"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground">V�lido desde</label>
                <Input
                  type="date"
                  value={formData.validFrom}
                  onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                  className="border-primary/30 focus:border-primary/70"
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground">V�lido hasta</label>
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

        {/* Duplicate Warning */}
        {uploadStatus === 'duplicate' && (
          <div className="rounded-md bg-yellow-500/10 border-2 border-yellow-500/30 p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-3">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">{errorMessage}</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setUploadStatus('idle');
                    setFile(null);
                    setErrorMessage('');
                  }}
                  className="text-yellow-700 dark:text-yellow-300 border-yellow-500/30 hover:bg-yellow-500/20"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setUploadStatus('idle');
                    setIsDuplicateConfirmed(true);
                  }}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  Continuar de todas formas
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {uploadStatus === 'error' && (
          <div className="rounded-md bg-destructive/10 border-2 border-destructive/30 p-3 flex gap-2">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{errorMessage}</p>
          </div>
        )}

        {/* Success State */}
        {uploadStatus === 'success' && (
          <div className="rounded-md bg-green-500/10 border-2 border-green-500/30 p-3 flex gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-700 dark:text-green-300 font-medium">Documento cargado exitosamente</p>
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
            {uploadStatus === 'success' ? 'Completado' : uploadStatus === 'uploading' ? 'Cargando...' : 'Cargar documento'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
