'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CostCenterSelect } from '@/components/common/cost-center-select';

export interface DocumentUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onSuccess: (documentId: string) => void;
}

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'];

export function DocumentUploadModal({ open, onOpenChange, organizationId, onSuccess }: DocumentUploadModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [category, setCategory] = useState('');
  const [costCenterId, setCostCenterId] = useState('');

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDocumentType('');
    setCategory('');
    setCostCenterId('');
    setFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files[0]) return;

    const selectedFile = files[0];
    const extension = selectedFile.name.split('.').pop()?.toLowerCase() || '';

    if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
      toast.error('Formato no permitido. Usa PDF, JPG, PNG, DOC o DOCX.');
      e.target.value = '';
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      toast.error('El archivo supera el límite de 50MB.');
      e.target.value = '';
      return;
    }

    setFile(selectedFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !documentType || !category || !file) {
      toast.error('Completa los campos obligatorios.');
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('documentType', documentType);
      formData.append('category', category);
      formData.append('file', file);

      if (costCenterId) formData.append('costCenterId', costCenterId);
      if (organizationId) formData.append('organizationId', organizationId);

      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'La carga falló');
      }

      const result = await response.json();
      toast.success('Documento cargado correctamente');
      resetForm();
      onOpenChange(false);
      onSuccess(result.documentId);
    } catch (error) {
      console.error('[DocumentUploadModal] Error:', error);
      toast.error(error instanceof Error ? error.message : 'Error al cargar documento');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cargar documento</DialogTitle>
          <DialogDescription>Completa los datos del documento y selecciona el archivo.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Título del documento</label>
            <Input
              placeholder="Ej: Certificado de Seguridad 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Descripción opcional</label>
            <Textarea
              placeholder="Detalles adicionales sobre el documento"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Tipo de documento</label>
              <Select value={documentType} onValueChange={setDocumentType} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="permit">Permiso</SelectItem>
                  <SelectItem value="certificate">Certificado</SelectItem>
                  <SelectItem value="plan">Plan</SelectItem>
                  <SelectItem value="report">Reporte</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Categoría</label>
              <Select value={category} onValueChange={setCategory} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="safety">Seguridad</SelectItem>
                  <SelectItem value="compliance">Cumplimiento</SelectItem>
                  <SelectItem value="operational">Operacional</SelectItem>
                  <SelectItem value="regulatory">Regulatorio</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Centro de costos opcional</label>
            <CostCenterSelect value={costCenterId} onValueChange={setCostCenterId} placeholder="Selecciona centro de costos..." />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Archivo</label>
            <div className="cursor-pointer rounded-lg border-2 border-dashed border-muted-foreground p-6 text-center transition-colors hover:border-primary">
              <input
                type="file"
                onChange={handleFileChange}
                disabled={isLoading}
                className="hidden"
                id="file-upload"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              />
              <label htmlFor="file-upload" className="block cursor-pointer">
                <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">
                  {file ? file.name : 'Haz clic para seleccionar o arrastra un archivo'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">PDF, JPG, PNG, DOC, DOCX (máx. 50MB)</p>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isLoading || !file}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cargando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Cargar documento
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
