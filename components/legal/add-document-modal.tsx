'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

interface AddDocumentModalProps {
  onSubmit: (doc: any) => Promise<void>;
}

const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx'];
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export function AddDocumentModal({ onSubmit }: AddDocumentModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({ title: '', description: '', category: 'compliance' });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;
    if (!selectedFile) {
      setFile(null);
      return;
    }

    const extension = selectedFile.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      event.target.value = '';
      setFile(null);
      toast.error('Formato no valido. Usa PDF, DOC, DOCX, XLS o XLSX.');
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      event.target.value = '';
      setFile(null);
      toast.error('El archivo supera el limite de 50 MB.');
      return;
    }

    setFile(selectedFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        ...formData,
        file,
      });
      setFormData({ title: '', description: '', category: 'compliance' });
      setFile(null);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo documento legal
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar documento legal</DialogTitle>
          <DialogDescription>Registra un nuevo documento legal o normativo con respaldo real.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titulo del documento</Label>
            <Input
              id="title"
              placeholder="Ej: Politica de Cumplimiento Contractual"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compliance">Cumplimiento</SelectItem>
                <SelectItem value="regulatory">Regulatorio</SelectItem>
                <SelectItem value="legal">Legal general</SelectItem>
                <SelectItem value="contracts">Contratos</SelectItem>
                <SelectItem value="policies">Politicas</SelectItem>
                <SelectItem value="regulations">Reglamentos</SelectItem>
                <SelectItem value="permits">Permisos</SelectItem>
                <SelectItem value="reports">Informes</SelectItem>
                <SelectItem value="agreements">Acuerdos</SelectItem>
                <SelectItem value="audit">Auditorias</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Descripcion breve</Label>
            <Textarea
              id="desc"
              placeholder="Contexto breve, alcance y uso del documento..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="file">Archivo opcional</Label>
            <Input id="file" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" onChange={handleFileChange} />
            <p className="text-xs text-muted-foreground">PDF, DOC, DOCX, XLS o XLSX. Maximo 50MB.</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
