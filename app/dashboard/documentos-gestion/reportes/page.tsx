'use client';

import { useState } from 'react';
import { BarChart3, Download, Plus, Search, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function ReportesPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const reports = [
    { id: 'RPT-OPE-2024-04', title: 'Reporte Operacional Abril 2024', type: 'Operacional', date: '2024-04-30', author: 'Gerencia Operaciones', pages: 45, size: '2.3 MB' },
    { id: 'RPT-CUMP-Q1-2024', title: 'Reporte Cumplimiento Q1 2024', type: 'Cumplimiento', date: '2024-04-01', author: 'HSE y Cumplimiento', pages: 28, size: '1.8 MB' },
    { id: 'RPT-FIN-MAR-2024', title: 'Reporte Financiero Marzo 2024', type: 'Financiero', date: '2024-04-15', author: 'Finanzas', pages: 35, size: '3.1 MB' },
    { id: 'RPT-MANT-2024-Q1', title: 'Reporte Mantenimiento Q1 2024', type: 'Mantenimiento', date: '2024-04-05', author: 'Equipo Mantenimiento', pages: 52, size: '2.7 MB' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reportes y Análisis</h1>
        <p className="text-muted-foreground">
          Reportes operacionales, de cumplimiento y análisis estratégicos
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Reportes Este Año</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Este Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--secondary)]">6</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Promedio Páginas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">38</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Almacenamiento Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">145 MB</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Reportes y Análisis</CardTitle>
              <CardDescription>Reportes operacionales, financieros y de cumplimiento</CardDescription>
            </div>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Reporte
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Buscar reportes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              {reports.map((report: any) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent"
                >
                  <div className="flex flex-1 items-center gap-4">
                    {report.type === 'Financiero' ? (
                      <BarChart3 className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <TrendingUp className="h-5 w-5 text-[var(--secondary)]" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{report.id}</span>
                        <Badge variant="outline">{report.type}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{report.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Autor: {report.author} • {report.date} • {report.pages} págs • {report.size}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm">
                      Ver
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
