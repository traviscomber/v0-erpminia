'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { AlertCircle, CheckCircle2, Clock, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type SessionData = {
  user?: { id: string };
  role?: string | null;
};

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

function normalize(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function daysSince(dateValue?: string | null) {
  if (!dateValue) return 0;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 0;
  const diff = Date.now() - date.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export function MisAprobacionesWidget() {
  const { data: session } = useSWR<SessionData>('/api/auth/session', fetcher);
  const currentRole = session?.role || null;
  const currentUserId = session?.user?.id;

  const { data: docsData, isLoading, error } = useSWR('/api/sostenibilidad/documentos-flujo', fetcher);

  const approvals = useMemo(() => {
    const documentos = Array.isArray(docsData?.data) ? docsData.data : [];
    return documentos.flatMap((doc: any) => {
      const approvalsList = Array.isArray(doc.document_approvals) ? doc.document_approvals : [];
      return approvalsList
        .filter((approval: any) => {
          const roleMatches = currentRole ? normalize(approval.required_role) === normalize(currentRole) : false;
          const userMatches = currentUserId ? String(approval.assigned_to || '') === currentUserId : false;
          return normalize(approval.status) === 'pending' && (roleMatches || userMatches);
        })
        .map((approval: any) => ({
          id: `${doc.id}-${approval.approval_level}`,
          title: doc.title || doc.documento_nombre || 'Documento',
          document_id: doc.id,
          approval_level_name: approval.approval_level_name || `Nivel ${approval.approval_level || 1}`,
          approval_level: approval.approval_level || 1,
          status: approval.status || 'pending',
          submitted_at: doc.created_at || approval.created_at || new Date().toISOString(),
          days_pending: daysSince(doc.created_at || approval.created_at),
        }));
    });
  }, [currentRole, currentUserId, docsData?.data]);

  const criticalCount = approvals.filter((a) => a.days_pending > 7).length;

  if (error) {
    return (
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            Error al cargar aprobaciones
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Mis Aprobaciones</CardTitle>
            <CardDescription>{approvals.length} documentos pendientes</CardDescription>
          </div>
          {criticalCount > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {criticalCount} cr&iacute;ticos
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="text-center text-muted-foreground py-4">Cargando...</div>
        ) : approvals.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            <CheckCircle2 className="w-5 h-5 mx-auto mb-2 text-secondary" />
            <p>Sin documentos pendientes</p>
          </div>
        ) : (
          <>
            {approvals
              .filter((a) => a.days_pending > 7)
              .slice(0, 3)
              .map((approval) => (
                <Link key={approval.id} href={`/dashboard/sostenibilidad/documentos-flujo?doc=${approval.document_id}`}>
                  <div className="cursor-pointer rounded-lg border border-destructive/30 bg-destructive/5 p-3 transition hover:bg-destructive/10">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-destructive">{approval.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Nivel: {approval.approval_level_name}</p>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <span className="text-xs font-semibold text-destructive">{approval.days_pending}d</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}

            {approvals
              .filter((a) => a.days_pending <= 7)
              .slice(0, 2)
              .map((approval) => (
                <Link key={approval.id} href={`/dashboard/sostenibilidad/documentos-flujo?doc=${approval.document_id}`}>
                  <div className="cursor-pointer rounded-lg border border-primary/20 bg-primary/5 p-3 transition hover:bg-primary/10">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{approval.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Nivel: {approval.approval_level_name}</p>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <span className="text-xs font-semibold text-primary">{approval.days_pending}d</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
          </>
        )}

        {approvals.length > 5 && (
          <Link href="/dashboard/sostenibilidad/documentos-flujo">
            <Button variant="outline" size="sm" className="mt-2 w-full">
              Ver todos ({approvals.length})
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
