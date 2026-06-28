'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText, Loader2, Sheet } from 'lucide-react';
import { toast } from 'sonner';

interface ExportButtonsProps {
  data: unknown[];
  fileName: string;
  columns: { key: string; label: string }[];
}

function getCellValue(row: unknown, key: string) {
  if (typeof row !== 'object' || row === null) return '-';
  const value = (row as Record<string, unknown>)[key];
  return value ?? '-';
}

export function ExportButtons({ data, fileName, columns }: ExportButtonsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const exportToPDF = async () => {
    if (!isMounted) return;
    setIsLoading(true);

    try {
      const html2pdf = (await import('html2pdf.js')).default;

      const element = document.createElement('div');
      element.style.padding = '20px';
      element.style.fontFamily = 'Arial, sans-serif';

      const title = document.createElement('h1');
      title.textContent = fileName;
      title.style.marginBottom = '20px';
      element.appendChild(title);

      const date = document.createElement('p');
      date.textContent = `Generado: ${new Date().toLocaleDateString('es-ES')}`;
      date.style.marginBottom = '20px';
      date.style.color = '#666';
      element.appendChild(date);

      const table = document.createElement('table');
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';
      table.style.marginTop = '20px';

      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      columns.forEach((col) => {
        const th = document.createElement('th');
        th.textContent = col.label;
        th.style.border = '1px solid #ddd';
        th.style.padding = '8px';
        th.style.backgroundColor = '#f5f5f5';
        th.style.fontWeight = 'bold';
        th.style.textAlign = 'left';
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      data.forEach((row) => {
        const tr = document.createElement('tr');
        columns.forEach((col) => {
          const td = document.createElement('td');
          td.textContent = String(getCellValue(row, col.key));
          td.style.border = '1px solid #ddd';
          td.style.padding = '8px';
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      element.appendChild(table);

      const opt = {
        margin: 10,
        filename: `${fileName}_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4' },
      } as const;

      html2pdf().set(opt).from(element).save();
      toast.success('PDF descargado exitosamente');
    } catch (error) {
      console.error('[v0] PDF export error:', error);
      toast.error('Error al descargar PDF');
    } finally {
      setIsLoading(false);
    }
  };

  const exportToExcel = async () => {
    if (!isMounted) return;
    setIsLoading(true);

    try {
      const XLSX = await import('xlsx');

      const worksheet = XLSX.utils.json_to_sheet(
        data.map((row) =>
          columns.reduce((acc, col) => {
            acc[col.label] = getCellValue(row, col.key);
            return acc;
          }, {} as Record<string, unknown>)
        )
      );

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');

      const fileNameXlsx = `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileNameXlsx);

      toast.success('Excel descargado exitosamente');
    } catch (error) {
      console.error('[v0] Excel export error:', error);
      toast.error('Error al descargar Excel');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isMounted) return null;

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={exportToPDF} disabled={isLoading || data.length === 0}>
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
        Descargar PDF
      </Button>
      <Button variant="outline" size="sm" onClick={exportToExcel} disabled={isLoading || data.length === 0}>
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sheet className="mr-2 h-4 w-4" />}
        Descargar Excel
      </Button>
    </div>
  );
}
