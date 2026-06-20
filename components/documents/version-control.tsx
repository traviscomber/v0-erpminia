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
  expiration_date: Date;
  versions: DocumentVersion[];
  last_modified: Date;
  owner: string;
}

export function DocumentVersionControl() {
  const supabase = createClient();
  const [documents] = useState<Document[]>([]);
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
          <CardTitle>Versionado de documentos</CardTitle>
          <CardDescription>Historial completo de cambios y aprobaciones</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {documents.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No hay documentos registrados
            </p>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="overflow-hidden rounded-lg border border-border">
                  <button
                    onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
                    className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="flex flex-1 items-center gap-3">
                      <FileText className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium">{doc.name}</p>
                        <div className="mt-1 flex gap-2 text-xs text-muted-foreground">
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

                  {expandedDoc === doc.id && (
                    <div className="space-y-3 border-t border-border bg-muted/30 p-4">
                      <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <History className="h-4 w-4" />
                        Historial de versiones ({doc.versions.length})
                      </p>
                      {doc.versions.map((version, idx) => (
                        <div
                          key={`${doc.id}-${idx}`}
                          className="flex items-center justify-between rounded border border-border/50 bg-background p-3"
                        >
                          <div className="flex-1 text-sm">
                            <p className="font-medium">Versión {version.version}</p>
                            <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <User className="h-3 w-3" />
                                {version.uploaded_by}
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3" />
                                {version.uploaded_at.toLocaleDateString('es-CL')}
                              </div>
                              {version.changes && <p className="mt-2">{version.changes}</p>}
                            </div>
                          </div>
                          <Button variant="outline" size="sm" className="ml-4 flex-shrink-0 gap-2">
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
