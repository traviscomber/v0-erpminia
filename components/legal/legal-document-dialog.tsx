'use client';

import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface LegalDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'];

export function LegalDocumentDialog({ open, onOpenChange, onSuccess }: LegalDocumentDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [category, setCategory] = useState('compliance');
  const [expiryDate, setExpiryDate] = useState('');

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDocumentType('');
    setCategory('compliance');
    setExpiryDate('');
    setFile(null);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    const extension = selectedFile.name.split('.').pop()?.toLowerCase() || '';
    if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
      toast.error('Formato no permitido. Usa PDF, JPG, PNG, DOC o DOCX.');
      event.target.value = '';
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      toast.error('El archivo excede el límite de 50MB.');
      event.target.value = '';
      return;
    }

    setFile(selectedFile);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title || !documentType || !category || !file) {
      toast.error('Completa título, tipo, categoría y archivo.');
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('documentType', documentType);
      formData.append('category', category);
      if (expiryDate) {
        formData.append('expiryDate', expiryDate);
      }
      formData.append('file', file);

      const response = await fetch('/api/legal/documentos', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload.error || 'No fue posible crear el documento');
      }

      toast.success('Documento legal creado');
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al crear documento');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nuevo documento legal</DialogTitle>
          <DialogDescription>
            Carga políticas, reglamentos, contratos o respaldos regulatorios para el módulo Legal.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Título</label>
            <Input
              placeholder="Ej: Política de Cumplimiento Contractual"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Descripcion</label>
            <Textarea
              placeholder="Contexto breve del documento y su aplicación"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={isLoading}
              rows={3}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Tipo</label>
              <Select value={documentType} onValueChange={setDocumentType} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="policy">Política</SelectItem>
                  <SelectItem value="procedure">Procedimiento</SelectItem>
                  <SelectItem value="regulation">Reglamento</SelectItem>
                  <SelectItem value="report">Informe</SelectItem>
                  <SelectItem value="contract">Contrato</SelectItem>
                  <SelectItem value="agreement">Acuerdo</SelectItem>
                  <SelectItem value="permit">Permiso</SelectItem>
                  <SelectItem value="annex">Anexo</SelectItem>
                  <SelectItem value="memo">Memorando</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Categoria</label>
              <Select value={category} onValueChange={setCategory} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compliance">Cumplimiento</SelectItem>
                  <SelectItem value="regulatory">Regulatorio</SelectItem>
                  <SelectItem value="legal">Legal General</SelectItem>
                  <SelectItem value="contracts">Contratos</SelectItem>
                  <SelectItem value="policies">Políticas</SelectItem>
                  <SelectItem value="regulations">Reglamentos</SelectItem>
                  <SelectItem value="permits">Permisos</SelectItem>
                  <SelectItem value="reports">Informes</SelectItem>
                  <SelectItem value="agreements">Acuerdos</SelectItem>
                  <SelectItem value="audit">Auditorias</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Vencimiento</label>
              <Input type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} disabled={isLoading} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Archivo</label>
            <div className="rounded-lg border border-dashed border-border p-5 text-center transition-colors hover:border-primary">
              <input
                id="legal-document-file"
                type="file"
                className="hidden"
                onChange={handleFileChange}
                disabled={isLoading}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              />
              <label htmlFor="legal-document-file" className="block cursor-pointer">
                <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">{file ? file.name : 'Haz clic para seleccionar el archivo'}</p>
                <p className="mt-1 text-xs text-muted-foreground">PDF, JPG, PNG, DOC o DOCX, maximo 50MB</p>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !file}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Crear documento
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
