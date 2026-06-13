'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface PendingApproval {
  id: string;
  title: string;
  document_id: string;
  approval_level_name: string;
  approval_level: number;
  status: string;
  submitted_at: string;
  days_pending: number;
}

export function MisAprobacionesWidget() {
  const [userRole, setUserRole] = useState<string | null>(null);

  // Obtener rol del usuario desde session
  useEffect(() => {
    const getRole = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        setUserRole(data.user.role);
      } catch (err) {
        console.log('[v0] Error fetching user role');
      }
    };
    getRole();
  }, []);

  // Fetch pending approvals based on user role
  const { data: pendingDocs, isLoading, error } = useSWR(
    userRole ? `/api/sostenibilidad/documentos-flujorole=${userRole}&status=pending` : null,
    async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  const approvals = (pendingDocs.data || []) as PendingApproval[];
  const criticalCount = approvals.filter(a => a.days_pending > 7).length;
  const normalCount = approvals.filter(a => a.days_pending <= 7).length;

  if (error) {
    return (
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            Error loading approvals
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
            <CardDescription>
              {approvals.length} documentos pendientes
            </CardDescription>
          </div>
          {criticalCount > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {criticalCount} críticos
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
            {/* Critical - overdue */}
            {approvals
              .filter(a => a.days_pending > 7)
              .slice(0, 3)
              .map(approval => (
                <Link
                  key={approval.id}
                  href={`/dashboard/sostenibilidad/documentos-flujodoc=${approval.document_id}`}
                >
                  <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 cursor-pointer transition">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate text-destructive">{approval.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Nivel: {approval.approval_level_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <AlertCircle className="w-4 h-4 text-destructive" />
                        <span className="text-xs font-semibold text-destructive">
                          {approval.days_pending}d
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}

            {/* Normal - not overdue */}
            {approvals
              .filter(a => a.days_pending <= 7)
              .slice(0, 2)
              .map(approval => (
                <Link
                  key={approval.id}
                  href={`/dashboard/sostenibilidad/documentos-flujodoc=${approval.document_id}`}
                >
                  <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 cursor-pointer transition">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{approval.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Nivel: {approval.approval_level_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Clock className="w-4 h-4 text-primary" />
                        <span className="text-xs font-semibold text-primary">
                          {approval.days_pending}d
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
          </>
        )}

        {approvals.length > 5 && (
          <Link href="/dashboard/sostenibilidad/documentos-flujo">
            <Button variant="outline" size="sm" className="w-full mt-2">
              Ver todos ({approvals.length})
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
