'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileText, Check, X, Clock } from 'lucide-react';

interface DocumentApproval {
  id: string;
  title: string;
  status: string;
  approval_steps: {
    level: number;
    reviewer: string;
    status: string;
    comments?: string;
  }[];
}

export function DocumentApprovalFlow() {
  const [documents, setDocuments] = useState<DocumentApproval[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentApproval | null>(null);

  useEffect(() => {
    void loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/documents/pending', { credentials: 'include' });
      const data = await response.json();
      setDocuments(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (docId: string, level: 'jefe_sostenibilidad' | 'gerente_general') => {
    try {
      const response = await fetch(`/api/documents/${docId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ level }),
      });

      if (!response.ok) throw new Error('No se pudo aprobar el documento');
      await loadDocuments();
      alert('Documento aprobado correctamente');
    } catch (err) {
      console.error('[v0] Error approving document:', err);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Flujo de aprobación de documentos</CardTitle>
        <CardDescription>Aprobaciones multinivel con trazabilidad completa.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando documentos pendientes...</p>
        ) : documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay documentos pendientes de aprobación.</p>
        ) : (
          documents.map((doc) => (
            <div key={doc.id} className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{doc.title}</h3>
                  <p className="text-sm text-muted-foreground">Estado: {doc.status}</p>
                </div>
                <Badge variant="outline">{doc.approval_steps.length} etapas</Badge>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => handleApprove(doc.id, 'jefe_sostenibilidad')}>
                  <Check className="mr-2 h-4 w-4" />
                  Aprobar nivel 1
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSelectedDoc(doc)}>
                  <FileText className="mr-2 h-4 w-4" />
                  Ver detalle
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
