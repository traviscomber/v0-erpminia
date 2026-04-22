'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Check, X, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface DocumentApproval {
  id: string;
  document_name: string;
  version: number;
  status: 'pendiente' | 'aprobado' | 'rechazado';
  submitted_by: string;
  submitted_at: Date;
  approval_chain: Array<{
    level: 'manager' | 'director' | 'compliance';
    status: 'pendiente' | 'aprobado' | 'rechazado';
    approver: string;
    date?: Date;
    comments?: string;
  }>;
}

export function DocumentApprovalFlow() {
  const supabase = createClient();
  const [documents, setDocuments] = useState<DocumentApproval[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentApproval | null>(null);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'aprobado':
        return <Check className="h-4 w-4 text-emerald-500" />;
      case 'rechazado':
        return <X className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-amber-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprobado':
        return 'bg-emerald-500/10 text-emerald-700';
      case 'rechazado':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-amber-500/10 text-amber-700';
    }
  };

  const handleApprove = async (docId: string, level: 'manager' | 'director' | 'compliance') => {
    try {
      const { error } = await supabase
        .from('document_approvals')
        .update({ status: 'aprobado', approved_at: new Date() })
        .eq('id', docId)
        .eq('approval_level', level);

      if (error) throw error;
      alert('Documento aprobado exitosamente');
    } catch (err) {
      console.error('[v0] Error approving document:', err);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Flujo de Aprobación de Documentos</CardTitle>
          <CardDescription>Aprobaciones multinivel con trazabilidad completa</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {documents.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No hay documentos pendientes de aprobación</p>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex gap-3 items-start">
                      <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">{doc.document_name}</p>
                        <p className="text-sm text-muted-foreground">v{doc.version} • {doc.submitted_by}</p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(doc.status)}>
                      {doc.status}
                    </Badge>
                  </div>

                  {/* Approval Chain */}
                  <div className="space-y-2">
                    {doc.approval_chain.map((approval, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm bg-background p-2 rounded">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(approval.status)}
                          <span className="font-medium capitalize">{approval.level}</span>
                          <span className="text-muted-foreground">({approval.approver})</span>
                        </div>
                        {approval.status === 'pendiente' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApprove(doc.id, approval.level)}
                            className="text-xs"
                          >
                            Aprobar
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
