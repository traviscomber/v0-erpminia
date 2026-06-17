'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

interface DocumentApproval {
  id: string;
  title: string;
  status: string;
  approval_level_name: string;
  submitted_at: string;
}

export function PendingApprovalsWidget() {
  const { data: pendingData, isLoading } = useSWR(
    '/api/sostenibilidad/documentos-flujo?status=pending&limit=5',
    fetcher,
    { revalidateOnFocus: false }
  );

  const pendingCount = pendingData.data.length || 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Aprobaciones Pendientes
        </CardTitle>
        <CardDescription>Documentos esperando tu revisión</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : pendingCount === 0 ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-8 h-8 mx-auto text-secondary mb-2" />
            <p className="text-sm text-muted-foreground">Sin aprobaciones pendientes</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-primary">{pendingCount}</span>
              <Badge variant="outline">Pendiente</Badge>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {pendingData.data.map((doc: DocumentApproval) => (
                <div key={doc.id} className="text-xs p-2 rounded border border-border/50">
                  <p className="font-medium truncate">{doc.title}</p>
                  <p className="text-muted-foreground text-xs">{doc.approval_level_name}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
