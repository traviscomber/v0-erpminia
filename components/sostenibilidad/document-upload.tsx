'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, FileText, Loader } from 'lucide-react';
import { toast } from 'sonner';

interface DocumentUploadProps {
  onUploadSuccess?: (fileUrl: string, fileName: string) => void;
  maxSizeMB?: number;
  acceptedTypes?: string[];
}

export function DocumentUpload({ 
  onUploadSuccess, 
  maxSizeMB = 10,
  acceptedTypes = ['.pdf', '.doc', '.docx', '.xlsx', '.xls', '.txt']
}: DocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateFile = (file: File): boolean => {
    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      toast.error(`El archivo excede el límite de ${maxSizeMB}MB`);
      return false;
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedTypes.includes(fileExtension)) {
      toast.error(`Tipo de archivo no permitido. Formatos válidos: ${acceptedTypes.join(', ')}`);
      return false;
    }

    return true;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Selecciona un archivo');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/sostenibilidad/upload-documento', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al subir el archivo');
      }

      toast.success('Documento subido correctamente');
      if (onUploadSuccess) {
        onUploadSuccess(data.fileUrl, selectedFile.name);
      }
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('[v0] Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Error al subir el archivo');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-border hover:border-primary/50'
        }`}
      >
        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground mb-1">
          Arrastra el documento aquí o haz clic para seleccionar
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          Máximo {maxSizeMB}MB • Formatos: {acceptedTypes.join(', ')}
        </p>
        <Input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          accept={acceptedTypes.join(',')}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          Seleccionar archivo
        </Button>
      </div>

      {selectedFile && (
        <div className="border border-border rounded-lg p-4 bg-background/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-primary" />
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              disabled={isUploading}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <Button
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isUploading ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Subir documento
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
