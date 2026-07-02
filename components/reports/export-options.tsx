'use client';

import { Download, FileJson, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ExportOptionsProps {
  data: Array<Record<string, unknown>>;
  filename: string;
  formats: Array<'csv' | 'excel' | 'pdf' | 'json'>;
}

export function ExportOptions({
  data,
  filename,
  formats = ['csv', 'excel', 'pdf'],
}: ExportOptionsProps) {
  const exportToCSV = () => {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map((row) =>
        headers.map((header) => {
          const value = row[header];
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          return value;
        })
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
  };

  const exportToJSON = () => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.json`;
    a.click();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {formats.includes('csv') && (
          <DropdownMenuItem onClick={exportToCSV}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            CSV
          </DropdownMenuItem>
        )}
        {formats.includes('json') && (
          <DropdownMenuItem onClick={exportToJSON}>
            <FileJson className="h-4 w-4 mr-2" />
            JSON
          </DropdownMenuItem>
        )}
        {formats.includes('pdf') && (
          <DropdownMenuItem disabled>
            <FileText className="h-4 w-4 mr-2" />
            PDF (Próximamente)
          </DropdownMenuItem>
        )}
        {formats.includes('excel') && (
          <DropdownMenuItem disabled>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel (Próximamente)
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
