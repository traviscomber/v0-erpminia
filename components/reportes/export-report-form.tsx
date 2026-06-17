'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Download } from 'lucide-react';

export function ExportReportForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reportType, setReportType] = useState('maintenance');
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const handleExport = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/reportes/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ report_type: reportType, start_date: startDate, end_date: endDate }),
      });

      if (res.ok) {
        const { report } = await res.json();
        const filename = `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`;
        alert(`Report generated: ${report.row_count} records. Download ready.\nFilename: ${filename}`);
      } else {
        setError('Failed to generate report');
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
        <CardTitle>Export Report</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded flex gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full p-2 border rounded text-sm"
            >
              <option value="maintenance">Maintenance Work Orders</option>
              <option value="hse">HSE Incidents & Investigations</option>
              <option value="audit">Audit Trail & Compliance</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2 border rounded text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-semibold">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2 border rounded text-sm"
              />
            </div>
          </div>

          <Button onClick={handleExport} disabled={loading} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            {loading ? 'Generating...' : 'Export as CSV'}
          </Button>

          <p className="text-xs text-muted-foreground">
            Report will include all records for the selected period. Compliance-ready format for auditors.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
