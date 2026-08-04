'use client';

import { useEffect, useState } from 'react';
import { ExportReportForm } from '@/components/reportes/export-report-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, FileText, ShieldCheck } from 'lucide-react';

type ReportSummary = {
  total: number;
  pending: number;
  status: string;
};

export default function ReportesPage() {
  const [summary, setSummary] = useState<ReportSummary>({ total: 0, pending: 0, status: 'Sin sincronizar' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    const loadSummary = async () => {
      try {
        const response = await fetch('/api/documents/stats', { credentials: 'include' });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload) throw new Error('No fue posible cargar el resumen documental');

        if (active) {
          const pending = Number(payload.pending || 0);
          setSummary({
            total: Number(payload.totalDocuments || 0),
            pending,
            status: pending > 0 ? 'Con pendientes' : 'Operativo',
          });
        }
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void loadSummary();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 border-b border-border/70 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Abastecimiento · Análisis y exportación
        </p>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes y análisis</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Genera exportaciones operacionales desde las fuentes disponibles y revisa el estado documental antes de descargar.
          </p>
        </div>
      </header>

      {error && (
        <Card className="border-destructive/30">
          <CardContent className="flex items-center gap-3 pt-6 text-sm">
            <AlertCircle className="h-4 w-4 text-destructive" />
            No fue posible cargar el resumen documental. El generador de reportes sigue disponible.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4 text-primary" />
              Documentos disponibles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{isLoading ? '—' : summary.total}</div>
            <p className="mt-1 text-xs text-muted-foreground">Fuente documental conectada</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{isLoading ? '—' : summary.pending}</div>
            <p className="mt-1 text-xs text-muted-foreground">Revisiones antes de exportar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="h-4 w-4 text-[var(--brand-verde)]" />
              Estado de la fuente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? 'Sincronizando' : summary.status}</div>
            <p className="mt-1 text-xs text-muted-foreground">Calculado desde datos reales</p>
          </CardContent>
        </Card>
      </div>

      <ExportReportForm />
    </div>
  );
}
