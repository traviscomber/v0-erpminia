'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, User, Download, History } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface DocumentVersion {
  version: number;
  uploaded_by: string;
  uploaded_at: Date;
  size: number;
  changes: string;
  download_url: string;
}

interface Document {
  id: string;
  name: string;
  category: 'Contratos' | 'Adquisiciones' | 'Procedimientos' | 'Seguridad' | 'Reportes';
  current_version: number;
  status: 'vigente' | 'vencido' | 'archivado';
  expiration_date?: Date;
  versions: DocumentVersion[];
  last_modified: Date;
  owner: string;
}

export function DocumentVersionControl() {
  const supabase = createClient();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);

  const statusBadge = {
    vigente: 'bg-emerald-500/10 text-emerald-700',
    vencido: 'bg-destructive/10 text-destructive',
    archivado: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Versionado de Documentos</CardTitle>
          <CardDescription>Historial completo de cambios y aprobaciones</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {documents.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No hay documentos registrados</p>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="border border-border rounded-lg overflow-hidden">
                  {/* Main Document Row */}
                  <button
                    onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
                    className="w-full flex justify-between items-center p-4 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex gap-3 items-center flex-1">
                      <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium">{doc.name}</p>
                        <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                          <span>v{doc.current_version}</span>
                          <span>•</span>
                          <span>{doc.owner}</span>
                          {doc.expiration_date && (
                            <>
                              <span>•</span>
                              <span>Vence: {doc.expiration_date.toLocaleDateString('es-CL')}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge className={statusBadge[doc.status]}>{doc.status}</Badge>
                  </button>

                  {/* Version History */}
                  {expandedDoc === doc.id && (
                    <div className="bg-muted/30 border-t border-border p-4 space-y-3">
                      <p className="text-sm font-medium flex gap-2 items-center text-muted-foreground">
                        <History className="h-4 w-4" />
                        Historial de versiones ({doc.versions.length})
                      </p>
                      {doc.versions.map((v, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center p-3 bg-background rounded border border-border/50"
                        >
                          <div className="text-sm flex-1">
                            <p className="font-medium">Versión {v.version}</p>
                            <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                              <div className="flex gap-2 items-center">
                                <User className="h-3 w-3" />
                                {v.uploaded_by}
                              </div>
                              <div className="flex gap-2 items-center">
                                <Calendar className="h-3 w-3" />
                                {v.uploaded_at.toLocaleDateString('es-CL')}
                              </div>
                              {v.changes && (
                                <p className="mt-2">{v.changes}</p>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 ml-4 flex-shrink-0"
                          >
                            <Download className="h-4 w-4" />
                            Descargar
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
