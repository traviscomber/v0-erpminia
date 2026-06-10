'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload } from 'lucide-react';

export function DocumentUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('contrato');
  const [category, setCategory] = useState('legal');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({ title: 'Error', description: 'Select a file' });
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

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      toast({ title: 'Success', description: `Document uploaded: ${file.name}` });
      setFile(null);
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Upload failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleUpload} className="space-y-4 p-4 border rounded-lg">
      <div>
        <label className="text-sm font-medium">Select Document</label>
        <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} accept=".pdf,.doc,.docx,.xls" />
      </div>
      <div>
        <label className="text-sm font-medium">Document Type</label>
        <Select value={docType} onValueChange={setDocType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="contrato">Contrato</SelectItem>
            <SelectItem value="normativa">Normativa</SelectItem>
            <SelectItem value="politica">Política</SelectItem>
            <SelectItem value="procedimiento">Procedimiento</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium">Category</label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="legal">Legal</SelectItem>
            <SelectItem value="compliance">Compliance</SelectItem>
            <SelectItem value="operacional">Operacional</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={loading} className="gap-2">
        <Upload className="h-4 w-4" />
        {loading ? 'Uploading...' : 'Upload'}
      </Button>
    </form>
  );
}
