'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Download } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type ReportType = 'mantencion' | 'hse' | 'auditoria';

function toCsvRows(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => toCsvRows(item, `${prefix}${prefix ? '.' : ''}${index}`));
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, nestedValue]) =>
      toCsvRows(nestedValue, `${prefix}${prefix ? '.' : ''}${key}`)
    );
  }

  return [`${prefix},${JSON.stringify(value ?? '')}`];
}

function downloadText(content: string, filename: string, mimeType = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

export function ExportReportForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reportType, setReportType] = useState<ReportType>('mantencion');
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const reportLabel = useMemo(() => {
    if (reportType === 'mantencion') return 'mantencion';
    if (reportType === 'hse') return 'hse';
    return 'auditoria';
  }, [reportType]);

  const handleExport = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/reportes/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tipo_reporte: reportType, fecha_inicio: startDate, fecha_fin: endDate }),
      });

      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(payload?.error || 'No se pudo generar el reporte');
      }

      const chartData = Array.isArray(payload?.chartData) ? payload.chartData : [];
      const summary = payload?.summary || {};
      const rows = [
        `tipo_reporte,${JSON.stringify(reportType)}`,
        `fecha_inicio,${JSON.stringify(startDate)}`,
        `fecha_fin,${JSON.stringify(endDate)}`,
        `generado_el,${JSON.stringify(payload?.generatedAt || new Date().toISOString())}`,
        '',
        'clave_resumen,valor_resumen',
        ...Object.entries(summary).map(([key, value]) => `${key},${JSON.stringify(value)}`),
        '',
        'fila_grafico',
        ...chartData.flatMap((row: unknown) => toCsvRows(row, 'row')),
      ];

      const filename = `${reportLabel}-report-${new Date().toISOString().split('T')[0]}.csv`;
      downloadText(rows.join('\n'), filename);
    } catch (err) {
      console.error('[v0] Export error:', err);
      setError(err instanceof Error ? err.message : 'Error inesperado al exportar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exportar reporte</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 flex gap-2 rounded border border-red-200 bg-red-50 p-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold">Tipo de reporte</label>
            <Select value={reportType} onValueChange={(value) => setReportType(value as ReportType)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona un tipo de reporte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mantencion">Órdenes de trabajo de mantención</SelectItem>
                <SelectItem value="hse">Incidentes e investigaciones HSE</SelectItem>
                <SelectItem value="auditoria">Trazabilidad y cumplimiento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold">Desde</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded border border-border bg-background p-2 text-sm text-foreground"
              />
            </div>

            <div>
              <label className="text-sm font-semibold">Hasta</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded border border-border bg-background p-2 text-sm text-foreground"
              />
            </div>
          </div>

          <Button onClick={handleExport} disabled={loading} className="w-full">
            <Download className="mr-2 h-4 w-4" />
            {loading ? 'Generando...' : 'Descargar CSV'}
          </Button>

          <p className="text-xs text-muted-foreground">
            El archivo incluye resumen y detalle en formato CSV para auditoría y análisis.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
