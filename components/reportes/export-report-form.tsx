'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Download } from 'lucide-react';

export function ExportReportForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reportType, setReportType] = useState('maintenance');
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const handleExport = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/reportes/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_type: reportType, start_date: startDate, end_date: endDate }),
      });

      if (res.ok) {
        const { report } = await res.json();
        const filename = `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`;
        alert(`Reporte generado: ${report.row_count} registros.\nDescarga lista.\nArchivo: ${filename}`);
      } else {
        setError('No se pudo generar el reporte');
      }
    } catch (err) {
      console.error('[v0] Export error:', err);
      setError((err as Error).message);
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
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full rounded border p-2 text-sm"
            >
              <option value="maintenance">Órdenes de trabajo de mantenimiento</option>
              <option value="hse">Incidentes e investigaciones HSE</option>
              <option value="audit">Trazabilidad y cumplimiento</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold">Fecha de inicio</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded border p-2 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-semibold">Fecha de término</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded border p-2 text-sm"
              />
            </div>
          </div>

          <Button onClick={handleExport} disabled={loading} className="w-full">
            <Download className="mr-2 h-4 w-4" />
            {loading ? 'Generando...' : 'Exportar CSV'}
          </Button>

          <p className="text-xs text-muted-foreground">
            El reporte incluirá todos los registros del periodo seleccionado. Formato listo para auditoría.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
