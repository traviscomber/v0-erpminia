'use client';

import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, User, Clock } from 'lucide-react';

interface AuditInfo {
  created_by: string;
  created_at: string;
  modified_by: string;
  modified_at: string;
  deleted_at: string;
}

export function AuditTrail({ info }: { info: AuditInfo }) {
  return (
    <Card className="bg-muted/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Auditoría</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        {info.created_at && (
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className="text-muted-foreground">Creado: {format(new Date(info.created_at), 'dd/MM/yyyy HH:mm')}</span>
            {info.created_by && <span className="text-muted-foreground">por {info.created_by}</span>}
          </div>
        )}
        {info.modified_at && (
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className="text-muted-foreground">Modificado: {format(new Date(info.modified_at), 'dd/MM/yyyy HH:mm')}</span>
            {info.modified_by && <span className="text-muted-foreground">por {info.modified_by}</span>}
          </div>
        )}
        {info.deleted_at && (
          <div className="flex items-center gap-2">
            <Badge variant="destructive">Eliminado</Badge>
            <span className="text-muted-foreground">{format(new Date(info.deleted_at), 'dd/MM/yyyy HH:mm')}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
