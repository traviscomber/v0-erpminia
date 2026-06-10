'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, Loader, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

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
  const [formData, setFormData] = useState({
    description: '',
    validFrom: '',
    validUntil: '',
  });
  const dragRef = useRef<HTMLDivElement>(null);

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

    setIsUploading(true);
    setUploadStatus('uploading');
    setErrorMessage('');

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('module', module);
      uploadFormData.append('category', category);
      uploadFormData.append('description', formData.description);
      uploadFormData.append('validFrom', formData.validFrom);
      uploadFormData.append('validUntil', formData.validUntil);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: uploadFormData,
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
        setFormData({ description: '', validFrom: '', validUntil: '' });
      }, 2000);
    } catch (err) {
      console.error('Upload error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Error al cargar el archivo');
      setUploadStatus('error');
      setIsUploading(false);
    }
  }, [file, module, category, formData, onUploadSuccess]);

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
            'relative border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer',
            file ? 'border-green-500 bg-green-50' : 'border-border hover:border-primary/50'
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
              <label htmlFor="file-input" className="cursor-pointer space-y-2 text-center">
                {file ? (
                  <>
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle2 className="h-8 w-8 text-green-600" />
                      <span className="text-sm font-semibold">{file.name}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setFile(null);
                        }}
                        className="ml-2"
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-semibold">Arrastra el archivo aquí o haz clic para seleccionar</p>
                      <p className="text-xs text-muted-foreground">PDF, Word (.doc, .docx), Excel (.xls, .xlsx) | Máx 50MB</p>
                    </div>
                  </>
                )}
              </label>
            </>
          )}
        </div>

        {/* Metadata Form */}
        {file && uploadStatus === 'idle' && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Descripción</label>
              <Textarea
                placeholder="Descripción del documento (opcional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Válido desde</label>
                <Input
                  type="date"
                  value={formData.validFrom}
                  onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Válido hasta</label>
                <Input
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
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
