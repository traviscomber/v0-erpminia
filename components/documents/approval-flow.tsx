'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Check, X, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface DocumentApproval {
  id: string;
  document_name: string;
  version: number;
  status: 'pendiente' | 'aprobado' | 'rechazado';
  submitted_by: string;
  submitted_at: Date;
  approval_chain: Array<{
    level: 'jefe_sostenibilidad' | 'gerente_general';
    status: 'pendiente' | 'aprobado' | 'rechazado';
    Aprobador: string;
    role: string;
    date: Date;
    comments: string;
    signature: string;
  }>;
}

export function DocumentApprovalFlow() {
  const supabase = createClient();
  const [documents] = useState<DocumentApproval[]>([]);

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

  const handleApprove = async (docId: string, level: 'jefe_sostenibilidad' | 'gerente_general') => {
    try {
      const { error } = await supabase
        .from('document_approvals')
        .update({
          status: 'aprobado',
          approved_at: new Date(),
          signature: `Firma digital - ${level === 'jefe_sostenibilidad' ? 'Jefe Depto. Sostenibilidad' : 'Gerente General'}`,
        })
        .eq('id', docId)
        .eq('approval_level', level);

      if (error) throw error;
      alert('Documento aprobado correctamente');
    } catch (err) {
      console.error('[v0] Error approving document:', err);
    }
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'jefe_sostenibilidad':
        return 'Jefe Depto. Sostenibilidad';
      case 'gerente_general':
        return 'Gerente General';
      default:
        return level;
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
            <p className="text-center py-8 text-muted-foreground">No hay documentos pendientes de Aprobación</p>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="rounded-lg border border-border p-4 transition-colors hover:bg-muted/50">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <FileText className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{doc.document_name}</p>
                        <p className="text-sm text-muted-foreground">v{doc.version} • {doc.submitted_by}</p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(doc.status)}>{doc.status}</Badge>
                  </div>

                  <div className="space-y-2">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Flujo de Aprobación:</p>
                    {doc.approval_chain.map((approval, idx) => (
                      <div key={idx} className="flex items-center justify-between rounded border border-border bg-background p-2 text-sm">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(approval.status)}
                          <div>
                            <span className="font-medium">{getLevelLabel(approval.level)}</span>
                            <span className="ml-2 text-muted-foreground">({approval.Aprobador})</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {approval.signature && <span className="text-xs text-emerald-600">Firmado</span>}
                          {approval.status === 'pendiente' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApprove(doc.id, approval.level)}
                              className="text-xs"
                            >
                              Aprobar y firmar
                            </Button>
                          )}
                        </div>
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
