'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload } from 'lucide-react';

interface DocumentUploadFormProps {
  onSuccess?: () => void;
}

export function DocumentUploadForm({ onSuccess }: DocumentUploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('policy');
  const [category, setCategory] = useState('compliance');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({ title: 'Error', description: 'Selecciona un archivo.' });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', docType);
      formData.append('category', category);
      formData.append('expiryDate', new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString());

      const res = await fetch('/api/legal/documentos/upload', {
        method: 'POST',
        body: formData,
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(payload?.error || 'No fue posible subir el documento');
      }

      toast({ title: 'Documento cargado', description: `Se subio ${file.name}` });
      setFile(null);
      onSuccess?.();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Error al subir archivo' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleUpload} className="space-y-4 rounded-lg border p-4">
      <div>
        <label className="text-sm font-medium">Archivo</label>
        <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
      </div>

      <div>
        <label className="text-sm font-medium">Tipo de documento</label>
        <Select value={docType} onValueChange={setDocType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="policy">Politica</SelectItem>
            <SelectItem value="procedure">Procedimiento</SelectItem>
            <SelectItem value="regulation">Reglamento</SelectItem>
            <SelectItem value="report">Informe</SelectItem>
            <SelectItem value="contract">Contrato</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium">Categoria</label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="compliance">Cumplimiento</SelectItem>
            <SelectItem value="regulatory">Regulatorio</SelectItem>
            <SelectItem value="legal">Legal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={loading} className="gap-2">
        <Upload className="h-4 w-4" />
        {loading ? 'Subiendo...' : 'Subir documento'}
      </Button>
    </form>
  );
}
