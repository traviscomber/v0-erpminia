'use client';

import { useMemo, useState } from 'react';
import { BarChart3, Download, FileText, Plus, Search, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type ReporteDocumento = {
  id: string;
  title: string;
  type: string;
  date: string;
  author: string;
  pages: number;
  size: string;
};

export default function ReportesPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const reports: ReporteDocumento[] = [
    {
      id: 'RPT-OPE-2024-04',
      title: 'Reporte Operacional Abril 2024',
      type: 'Operacional',
      date: '2024-04-30',
      author: 'Gerencia de Operaciones',
      pages: 45,
      size: '2.3 MB',
    },
    {
      id: 'RPT-CUMP-Q1-2024',
      title: 'Reporte de Cumplimiento Q1 2024',
      type: 'Cumplimiento',
      date: '2024-04-01',
      author: 'HSE y Cumplimiento',
      pages: 28,
      size: '1.8 MB',
    },
    {
      id: 'RPT-FIN-MAR-2024',
      title: 'Reporte Financiero Marzo 2024',
      type: 'Financiero',
      date: '2024-04-15',
      author: 'Finanzas',
      pages: 35,
      size: '3.1 MB',
    },
    {
      id: 'RPT-MANT-2024-Q1',
      title: 'Reporte de Mantenimiento Q1 2024',
      type: 'Mantenimiento',
      date: '2024-04-05',
      author: 'Equipo de Mantenimiento',
      pages: 52,
      size: '2.7 MB',
    },
  ];

  const filteredReports = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return reports;

    return reports.filter((report) =>
      [report.id, report.title, report.type, report.author, report.date, report.size]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [reports, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Reportes y análisis</h1>
        <p className="text-muted-foreground">
          Reportes operacionales, de cumplimiento y análisis estratégicos.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Reportes este año</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="mt-1 text-xs text-muted-foreground">Documentos emitidos en el período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Este mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--secondary)]">6</div>
            <p className="mt-1 text-xs text-muted-foreground">Reportes creados recientemente</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Promedio de páginas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">38</div>
            <p className="mt-1 text-xs text-muted-foreground">Tamaño medio por documento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Almacenamiento total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">145 MB</div>
            <p className="mt-1 text-xs text-muted-foreground">Uso total de archivos</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-3">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Repositorio de reportes</CardTitle>
                <CardDescription>
                  Reportes operacionales, financieros y de cumplimiento.
                </CardDescription>
              </div>
            </div>

            <Button className="gap-2 self-start">
              <Plus className="h-4 w-4" />
              Nuevo reporte
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ID, título, tipo o autor"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="icon" aria-label="Buscar">
                <Search className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              {filteredReports.map((report) => (
                <div
                  key={report.id}
                  className="flex flex-col gap-4 rounded-lg border p-4 transition-colors hover:bg-accent/50 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex flex-1 items-start gap-4">
                    {report.type === 'Financiero' ? (
                      <BarChart3 className="mt-1 h-5 w-5 text-emerald-600" />
                    ) : (
                      <TrendingUp className="mt-1 h-5 w-5 text-[var(--secondary)]" />
                    )}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{report.id}</span>
                        <Badge variant="outline">{report.type}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{report.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Autor: {report.author} • {report.date} • {report.pages} páginas • {report.size}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 self-end lg:self-auto">
                    <Button variant="ghost" size="sm">
                      Ver
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <Download className="h-3 w-3" />
                      Descargar
                    </Button>
                  </div>
                </div>
              ))}

              {filteredReports.length === 0 && (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No hay reportes que coincidan con la búsqueda.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
