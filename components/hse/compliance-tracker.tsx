'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, Clock, FileText, TrendingUp, Download } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

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
  const supabase = createClient();
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [complianceScore, setComplianceScore] = useState(0);

  useEffect(() => {
    const fetchCompliance = async () => {
      try {
        const { data, error } = await supabase
          .from('compliance_audit_log')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const mappedItems = (data || []).map((item: any) => ({
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
        const compliantCount = mappedItems.filter(i => i.status === 'compliant').length;
        setComplianceScore(mappedItems.length > 0 ? Math.round((compliantCount / mappedItems.length) * 100) : 0);
      } catch (err) {
        console.error('[v0] Error fetching compliance:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCompliance();
  }, [supabase]);

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
      {/* Compliance Score Header */}
      <Card className="bg-gradient-to-br from-card to-muted/20 border-border">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Índice de Cumplimiento</CardTitle>
              <CardDescription>Auditoría integrada y trazabilidad completa</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-emerald-600">{complianceScore}%</div>
              <p className="text-xs text-muted-foreground mt-1">Cumplimiento normativo</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all"
              style={{ width: `${complianceScore}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Compliance Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading ? (
          <p className="text-muted-foreground">Cargando auditorías...</p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground col-span-full text-center py-8">
            No hay auditorías registradas
          </p>
        ) : (
          items.map((item) => (
            <Card key={item.id} className="hover:border-border/80 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex gap-3 items-start flex-1">
                    <div className="mt-0.5">{statusIcon[item.status]}</div>
                    <div className="flex-1">
                      <CardTitle className="text-base">{item.name}</CardTitle>
                      <Badge variant="outline" className="text-xs mt-1.5">
                        {item.category}
                      </Badge>
                    </div>
                  </div>
                  <Badge className={statusBadge[item.status]}>
                    {item.status === 'compliant' ? 'Conforme' : item.status === 'non_compliant' ? 'No conforme' : 'En progreso'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Última auditoría</p>
                    <p className="font-medium">{item.last_audit.toLocaleDateString('es-CL')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Próxima auditoría</p>
                    <p className="font-medium">{item.next_audit.toLocaleDateString('es-CL')}</p>
                  </div>
                </div>

                <div className="flex gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">{item.evidence_count} evidencias adjuntas</span>
                </div>

                <p className="text-sm text-muted-foreground">
                  Responsable: <span className="font-medium text-foreground">{item.responsible}</span>
                </p>

                <Button variant="outline" size="sm" className="w-full gap-2 mt-2">
                  <Download className="h-4 w-4" />
                  Descargar Reporte
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
