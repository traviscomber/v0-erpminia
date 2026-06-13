'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Download, Eye, RotateCcw } from 'lucide-react';

interface Version {
  version: number;
  date: string;
  author: string;
  status: 'draft' | 'pending' | 'approved' | 'archived';
  changes: string;
  size: string;
}

interface DocumentVersionHistoryProps {
  versions: Version[];
  onRestore: (version: number) => void;
  onDownload: (version: number) => void;
}

export function DocumentVersionHistory({ versions, onRestore, onDownload }: DocumentVersionHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Historial de Versiones</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {versions.map((version) => (
            <div
              key={version.version}
              className="flex items-start justify-between gap-4 p-3 border rounded-lg hover:bg-muted/50"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">v{version.version}</span>
                  <Badge
                    variant={
                      version.status === 'approved'
                        ? 'default'
                        : version.status === 'pending'
                          ? 'secondary'
                        : version.status === 'archived'
                          ? 'outline'
                        : 'secondary'
                    }
                    className="text-xs"
                  >
                    {version.status === 'draft' && 'Borrador'}
                    {version.status === 'pending' && 'Pendiente'}
                    {version.status === 'approved' && 'Aprobado'}
                    {version.status === 'archived' && 'Archivado'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(version.date), "d 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Por: {version.author}</p>
                {version.changes && (
                  <p className="text-sm mt-2 text-foreground">{version.changes}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {onDownload && (
                  <Button variant="ghost" size="sm" onClick={() => onDownload(version.version)}>
                    <Download className="h-4 w-4" />
                  </Button>
                )}
                {onRestore && version.status !== 'approved' && (
                  <Button variant="ghost" size="sm" onClick={() => onRestore(version.version)}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
