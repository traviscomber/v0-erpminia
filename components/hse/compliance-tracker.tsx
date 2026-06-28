'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, Clock, FileText, Download } from 'lucide-react';

interface ComplianceItem {
  id: string;
  name: string;
  category: 'SERNAGEOMIN' | 'ISO' | 'HSE' | 'Legal';
  status: 'compliant' | 'non_compliant' | 'in_progress';
  last_audit: Date;
  next_audit: Date;
  responsible: string;
  evidence_count: number;
}

export function ComplianceTracker() {
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [complianceScore, setComplianceScore] = useState(0);

  useEffect(() => {
    const fetchCompliance = async () => {
      try {
        const response = await fetch('/api/sostenibilidad/audit-sessions', {
          credentials: 'include',
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error || 'No se pudieron cargar las auditorias');
        }

        const mappedItems = (Array.isArray(payload?.data) ? payload.data : []).map((item: any) => ({
          id: item.id,
          name: item.audit_name || 'Auditoría sin nombre',
          category: item.category || 'HSE',
          status: item.compliance_status || 'in_progress',
          last_audit: new Date(item.created_at),
          next_audit: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          responsible: item.auditor || 'Por asignar',
          evidence_count: item.evidence_count || 0,
        }));

        setItems(mappedItems);
        const compliantCount = mappedItems.filter((entry) => entry.status === 'compliant').length;
        setComplianceScore(mappedItems.length > 0 ? Math.round((compliantCount / mappedItems.length) * 100) : 0);
      } catch (err) {
        console.error('[v0] Error fetching compliance:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCompliance();
  }, []);

  const statusIcon = {
    compliant: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    non_compliant: <AlertCircle className="h-4 w-4 text-destructive" />,
    in_progress: <Clock className="h-4 w-4 text-amber-500" />,
  };

  const statusBadge = {
    compliant: 'bg-emerald-500/10 text-emerald-700',
    non_compliant: 'bg-destructive/10 text-destructive',
    in_progress: 'bg-amber-500/10 text-amber-700',
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-card to-muted/20 border-border">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Índice de cumplimiento</CardTitle>
              <CardDescription>Auditoría integrada y trazabilidad completa</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-emerald-600">{complianceScore}%</div>
              <p className="mt-1 text-xs text-muted-foreground">Cumplimiento normativo</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-2 w-full rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-emerald-500 transition-all"
              style={{ width: `${complianceScore}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {loading ? (
          <p className="col-span-full text-muted-foreground">Cargando auditorías...</p>
        ) : items.length === 0 ? (
          <p className="col-span-full py-8 text-center text-muted-foreground">
            No hay auditorías registradas
          </p>
        ) : (
          items.map((item) => (
            <Card key={item.id} className="transition-colors hover:border-border/80">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-1 items-start gap-3">
                    <div className="mt-0.5">{statusIcon[item.status]}</div>
                    <div className="flex-1">
                      <CardTitle className="text-base">{item.name}</CardTitle>
                      <Badge variant="outline" className="mt-1.5 text-xs">
                        {item.category}
                      </Badge>
                    </div>
                  </div>
                  <Badge className={statusBadge[item.status]}>
                    {item.status === 'compliant'
                      ? 'Conforme'
                      : item.status === 'non_compliant'
                        ? 'No conforme'
                        : 'En progreso'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Última auditoría</p>
                    <p className="font-medium">{item.last_audit.toLocaleDateString('es-CL')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Próxima auditoría</p>
                    <p className="font-medium">{item.next_audit.toLocaleDateString('es-CL')}</p>
                  </div>
                </div>

                <div className="flex gap-2 text-sm">
                  <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">{item.evidence_count} evidencias adjuntas</span>
                </div>

                <p className="text-sm text-muted-foreground">
                  Responsable: <span className="font-medium text-foreground">{item.responsible}</span>
                </p>

                <Button variant="outline" size="sm" className="mt-2 w-full gap-2">
                  <Download className="h-4 w-4" />
                  Descargar informe
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
