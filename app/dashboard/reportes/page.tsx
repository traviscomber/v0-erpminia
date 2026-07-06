'use client';

import { useEffect, useState } from 'react';
import { ExportReportForm } from '@/components/reportes/export-report-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, ShieldAlert, History } from 'lucide-react';

type ReportSummary = {
  total: number;
  status: string;
  lastDownloadedAt: string | null;
};

export default function ReportesPage() {
  const [summary, setSummary] = useState<ReportSummary>({
    total: 0,
    status: 'Operativo',
    lastDownloadedAt: null,
  });

  useEffect(() => {
    let active = true;

    const loadSummary = async () => {
      try {
        const response = await fetch('/api/documents/stats', { credentials: 'include' });
        const payload = await response.json().catch(() => null);

        if (!response.ok || !payload) return;

        if (active) {
          setSummary({
            total: Number(payload.totalDocuments || 0),
            status: payload.pending > 0 ? 'Con pendientes' : 'Operativo',
            lastDownloadedAt: null,
          });
        }
      } catch {
        if (active) {
          setSummary((current) => current);
        }
      }
    };

    void loadSummary();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
        <p className="text-muted-foreground">
          Descarga los reportes que necesitas en un solo lugar, en español y con foco operativo.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/60 bg-card/90">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4 text-primary" />
              Documentos totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
            <p className="text-xs text-muted-foreground">Datos cargados desde el resumen documental</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/90">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <ShieldAlert className="h-4 w-4 text-primary" />
              Estado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.status}</div>
            <p className="text-xs text-muted-foreground">Se actualiza segun el flujo documental</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/90">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <History className="h-4 w-4 text-primary" />
              Ultima descarga
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.lastDownloadedAt || 'Sin registro'}</div>
            <p className="text-xs text-muted-foreground">Se mostrara cuando exista telemetria de exportacion</p>
          </CardContent>
        </Card>
      </div>

      <ExportReportForm />
    </div>
  );
}
